import { AppError } from '../../../utils/AppError.js';
import { mpesaLive } from '../../../config/env.js';
import { query } from '../../../config/db.js';
import { findSaleById } from '../sales/repository.js';
import * as vodacom from '../../../services/vodacom.js';

const MANUAL_MESSAGE =
  'Mfumo wa M-Pesa wa moja kwa moja haujawashwa. Mteja alipe kwenye namba ya duka, kisha rekodi malipo kupitia /sales/:id/confirm-payment.';

const loadSale = async (saleId, tenantId) => {
  const found = await findSaleById(saleId, tenantId);
  if (!found) throw new AppError('Mauzo hayapatikani.', 404, 'NOT_FOUND');
  return found.sale;
};

export const initiate = async (tenantId, { sale_id: saleId, phone, amount }) => {
  const sale = await loadSale(saleId, tenantId);
  if (sale.payment_status === 'COMPLETED') {
    throw new AppError('Malipo yameshakamilika.', 409, 'ALREADY_PAID');
  }

  if (!mpesaLive) {
    return { mode: 'manual', payment_status: sale.payment_status, message: MANUAL_MESSAGE };
  }

  const result = await vodacom.initiateC2BPayment({ amount, customerMSISDN: phone, saleId });
  await query(
    `INSERT INTO payment_transactions (tenant_id, sale_id, method, amount, status, conversation_id, transaction_id)
     VALUES ($1, $2, 'mpesa', $3, 'PENDING', $4, $5)`,
    [tenantId, saleId, amount, result.conversationId, result.transactionId]
  );
  return { mode: 'live', payment_status: 'PENDING', conversation_id: result.conversationId };
};

export const status = async (tenantId, saleId) => {
  const sale = await loadSale(saleId, tenantId);
  if (!mpesaLive) {
    return { mode: 'manual', payment_status: sale.payment_status };
  }
  const latest = await query(
    `SELECT conversation_id FROM payment_transactions
     WHERE sale_id = $1 AND tenant_id = $2 AND conversation_id IS NOT NULL
     ORDER BY created_at DESC LIMIT 1`,
    [saleId, tenantId]
  );
  const conversationId = latest.rows[0]?.conversation_id;
  if (!conversationId) return { mode: 'live', payment_status: sale.payment_status };

  const res = await vodacom.queryTransactionStatus(conversationId);
  if (res.responseCode === 'INS-0' && sale.payment_status !== 'COMPLETED') {
    await query(
      `UPDATE sales SET payment_status = 'COMPLETED',
         status = CASE WHEN type = 'SALE' AND status = 'PENDING' THEN 'COMPLETED' ELSE status END
       WHERE id = $1 AND tenant_id = $2`,
      [saleId, tenantId]
    );
    await query(
      `UPDATE payment_transactions SET status = 'COMPLETED'
       WHERE sale_id = $1 AND tenant_id = $2 AND conversation_id = $3`,
      [saleId, tenantId, conversationId]
    );
    return { mode: 'live', payment_status: 'COMPLETED' };
  }
  return { mode: 'live', payment_status: sale.payment_status, response_code: res.responseCode };
};
