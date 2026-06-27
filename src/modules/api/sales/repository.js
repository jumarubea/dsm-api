import crypto from 'node:crypto';
import { query, withTransaction } from '../../../config/db.js';
import { AppError } from '../../../utils/AppError.js';

export const getProducts = async (tenantId, ids) => {
  const { rows } = await query(
    `SELECT id, name, retail_price, wholesale_price, stock_qty, is_active
     FROM products WHERE tenant_id = $1 AND id = ANY($2)`,
    [tenantId, ids]
  );
  return new Map(rows.map((r) => [r.id, r]));
};

export const getPricingRules = async (tenantId, ids) => {
  const { rows } = await query(
    `SELECT product_id, min_qty, price_type FROM product_pricing_rules
     WHERE tenant_id = $1 AND product_id = ANY($2)`,
    [tenantId, ids]
  );
  const byProduct = new Map();
  for (const r of rows) {
    if (!byProduct.has(r.product_id)) byProduct.set(r.product_id, []);
    byProduct.get(r.product_id).push(r);
  }
  return byProduct;
};

/** Create the sale, items, SALE stock-movements (stock deduction), and any payment — atomically. */
export const createSale = (tenantId, data) =>
  withTransaction(async (client) => {
    // Lock product rows and verify stock before deducting.
    for (const it of data.lineItems) {
      const r = await client.query(
        'SELECT stock_qty, is_active FROM products WHERE id = $1 AND tenant_id = $2 FOR UPDATE',
        [it.product_id, tenantId]
      );
      const p = r.rows[0];
      if (!p || !p.is_active) throw new AppError('Bidhaa haipatikani.', 422, 'PRODUCT_NOT_FOUND');
      if (p.stock_qty < it.quantity) {
        throw new AppError('Hisa haitoshi kwa bidhaa.', 422, 'INSUFFICIENT_STOCK');
      }
    }

    const saleRes = await client.query(
      `INSERT INTO sales
         (tenant_id, idempotency_key, type, status, customer_id, served_by,
          delivery_address, expected_delivery_at, subtotal, total, payment_method, payment_status)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
       RETURNING *`,
      [
        tenantId,
        data.idempotencyKey,
        data.type,
        data.status,
        data.customer_id ?? null,
        data.served_by,
        data.delivery_address ?? null,
        data.expected_delivery_at ?? null,
        data.subtotal,
        data.total,
        data.payment_method,
        data.payment_status,
      ]
    );
    const sale = saleRes.rows[0];

    const items = [];
    for (const it of data.lineItems) {
      const ir = await client.query(
        `INSERT INTO sale_items (tenant_id, sale_id, product_id, quantity, unit_price)
         VALUES ($1,$2,$3,$4,$5)
         RETURNING id, product_id, quantity, unit_price, line_total`,
        [tenantId, sale.id, it.product_id, it.quantity, it.unit_price]
      );
      items.push(ir.rows[0]);
      // Deduct stock via a SALE movement (negative); trigger updates stock_qty.
      await client.query(
        `INSERT INTO stock_movements (tenant_id, product_id, idempotency_key, type, quantity, reason, created_by)
         VALUES ($1,$2,$3,'SALE',$4,$5,$6)`,
        [
          tenantId,
          it.product_id,
          crypto.randomUUID(),
          -it.quantity,
          `Sale ${sale.id}`,
          data.served_by,
        ]
      );
    }

    const payments = [];
    if (data.payment) {
      const pr = await client.query(
        `INSERT INTO payment_transactions (tenant_id, sale_id, method, amount, status, reference)
         VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
        [
          tenantId,
          sale.id,
          data.payment.method,
          data.payment.amount,
          data.payment.status,
          data.payment.reference ?? null,
        ]
      );
      payments.push(pr.rows[0]);
    }

    return { sale, items, payments };
  });

export const findSaleById = async (id, tenantId) => {
  const saleRes = await query('SELECT * FROM sales WHERE id = $1 AND tenant_id = $2', [
    id,
    tenantId,
  ]);
  const sale = saleRes.rows[0];
  if (!sale) return null;
  const items = await query(
    `SELECT id, product_id, quantity, unit_price, line_total FROM sale_items
     WHERE sale_id = $1 AND tenant_id = $2`,
    [id, tenantId]
  );
  const payments = await query(
    `SELECT id, method, amount, status, reference, created_at FROM payment_transactions
     WHERE sale_id = $1 AND tenant_id = $2 ORDER BY created_at`,
    [id, tenantId]
  );
  return { sale, items: items.rows, payments: payments.rows };
};

export const listSales = async (
  tenantId,
  { dateFrom, dateTo, type, status, paymentMethod } = {}
) => {
  const where = ['tenant_id = $1'];
  const vals = [tenantId];
  const add = (clause, value) => {
    vals.push(value);
    where.push(`${clause} $${vals.length}`);
  };
  if (dateFrom) add('created_at >=', dateFrom);
  if (dateTo) add('created_at <=', dateTo);
  if (type) add('type =', type);
  if (status) add('status =', status);
  if (paymentMethod) add('payment_method =', paymentMethod);
  const { rows } = await query(
    `SELECT * FROM sales WHERE ${where.join(' AND ')} ORDER BY created_at DESC LIMIT 200`,
    vals
  );
  return rows;
};

export const confirmPayment = (tenantId, sale, { method, reference }) =>
  withTransaction(async (client) => {
    await client.query(
      `INSERT INTO payment_transactions (tenant_id, sale_id, method, amount, status, reference)
       VALUES ($1,$2,$3,$4,'COMPLETED',$5)`,
      [tenantId, sale.id, method || sale.payment_method, sale.total, reference ?? null]
    );
    const r = await client.query(
      `UPDATE sales
       SET payment_status = 'COMPLETED',
           status = CASE WHEN type = 'SALE' AND status = 'PENDING' THEN 'COMPLETED' ELSE status END
       WHERE id = $1 AND tenant_id = $2 RETURNING *`,
      [sale.id, tenantId]
    );
    return r.rows[0];
  });

export const voidSale = (tenantId, sale, items, reason, userId) =>
  withTransaction(async (client) => {
    for (const it of items) {
      // Restore stock with a compensating ADJUSTMENT movement.
      await client.query(
        `INSERT INTO stock_movements (tenant_id, product_id, idempotency_key, type, quantity, reason, created_by)
         VALUES ($1,$2,$3,'ADJUSTMENT',$4,$5,$6)`,
        [tenantId, it.product_id, crypto.randomUUID(), it.quantity, `Void sale ${sale.id}`, userId]
      );
    }
    const r = await client.query(
      `UPDATE sales SET status = 'VOIDED', void_reason = $3 WHERE id = $1 AND tenant_id = $2 RETURNING *`,
      [sale.id, tenantId, reason]
    );
    return r.rows[0];
  });

export const updateOrderStatus = async (id, tenantId, status) => {
  const { rows } = await query(
    `UPDATE sales SET status = $3 WHERE id = $1 AND tenant_id = $2 AND type = 'ORDER' RETURNING *`,
    [id, tenantId, status]
  );
  return rows[0] || null;
};
