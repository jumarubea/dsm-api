import { AppError } from '../../../utils/AppError.js';
import { serializeSale } from '../../../serialisers/sale.js';
import { resolveUnitPrice } from './pricing.js';
import * as repo from './repository.js';

const notFound = () => new AppError('Mauzo hayapatikani.', 404, 'NOT_FOUND');

const round = (n) => Math.round(n);

export const create = async (tenantId, input, user, idempotencyKey) => {
  const ids = [...new Set(input.items.map((i) => i.product_id))];
  const products = await repo.getProducts(tenantId, ids);
  for (const id of ids) {
    const p = products.get(id);
    if (!p || !p.is_active) throw new AppError('Bidhaa haipatikani.', 422, 'PRODUCT_NOT_FOUND');
  }
  const rules = await repo.getPricingRules(tenantId, ids);

  const lineItems = input.items.map((it) => {
    const product = products.get(it.product_id);
    const unitPrice = resolveUnitPrice(product, it.quantity, rules.get(it.product_id));
    return { product_id: it.product_id, quantity: it.quantity, unit_price: unitPrice };
  });

  const subtotal = round(lineItems.reduce((sum, li) => sum + li.unit_price * li.quantity, 0));
  const total = subtotal;

  const type = input.type || 'SALE';
  // Paid up-front when cash, or when an external payment reference is supplied.
  const paid = input.payment_method === 'cash' || Boolean(input.payment_reference);
  const paymentStatus = paid ? 'COMPLETED' : 'PENDING';
  const status = type === 'ORDER' ? 'PENDING' : paid ? 'COMPLETED' : 'PENDING';

  let created;
  try {
    created = await repo.createSale(tenantId, {
      idempotencyKey,
      type,
      status,
      customer_id: input.customer_id,
      served_by: user.id,
      delivery_address: input.delivery_address,
      expected_delivery_at: input.expected_delivery_at,
      subtotal,
      total,
      payment_method: input.payment_method,
      payment_status: paymentStatus,
      lineItems,
      payment: paid
        ? {
            method: input.payment_method,
            amount: total,
            status: 'COMPLETED',
            reference: input.payment_reference,
          }
        : null,
    });
  } catch (err) {
    if (err.code === '23505')
      throw new AppError('Mauzo haya yameshatekelezwa.', 409, 'IDEMPOTENCY_CONFLICT');
    throw err;
  }

  return serializeSale(created.sale, created.items, created.payments);
};

export const list = (tenantId, filters) => repo.listSales(tenantId, filters);

export const detail = async (id, tenantId) => {
  const found = await repo.findSaleById(id, tenantId);
  if (!found) throw notFound();
  return serializeSale(found.sale, found.items, found.payments);
};

export const receipt = async (id, tenantId) => {
  const found = await repo.findSaleById(id, tenantId);
  if (!found) throw notFound();
  const s = found.sale;
  return {
    sale_id: s.id,
    date: s.created_at,
    status: s.status,
    payment_method: s.payment_method,
    payment_status: s.payment_status,
    items: found.items.map((i) => ({
      product_id: i.product_id,
      quantity: i.quantity,
      unit_price: i.unit_price,
      line_total: i.line_total,
    })),
    subtotal: s.subtotal,
    total: s.total,
    currency: 'TZS',
  };
};

export const confirmPayment = async (id, tenantId, input) => {
  const found = await repo.findSaleById(id, tenantId);
  if (!found) throw notFound();
  if (found.sale.status === 'VOIDED') {
    throw new AppError('Mauzo yamefutwa.', 422, 'SALE_VOIDED');
  }
  if (found.sale.payment_status === 'COMPLETED') {
    throw new AppError('Malipo yameshakamilika.', 409, 'ALREADY_PAID');
  }
  const sale = await repo.confirmPayment(tenantId, found.sale, input);
  const fresh = await repo.findSaleById(id, tenantId);
  return serializeSale(sale, fresh.items, fresh.payments);
};

export const voidSale = async (id, tenantId, reason, user) => {
  const found = await repo.findSaleById(id, tenantId);
  if (!found) throw notFound();
  if (found.sale.status === 'VOIDED') {
    throw new AppError('Mauzo yamefutwa tayari.', 409, 'ALREADY_VOIDED');
  }
  const sale = await repo.voidSale(tenantId, found.sale, found.items, reason, user.id);
  return serializeSale(sale, found.items, found.payments);
};

const ORDER_TRANSITIONS = { PENDING: 'PREPARED', PREPARED: 'DELIVERED' };

export const updateOrderStatus = async (id, tenantId, nextStatus) => {
  const found = await repo.findSaleById(id, tenantId);
  if (!found || found.sale.type !== 'ORDER') throw notFound();
  const current = found.sale.status;
  if (ORDER_TRANSITIONS[current] !== nextStatus) {
    throw new AppError('Mabadiliko ya hali si halali.', 422, 'INVALID_STATUS_TRANSITION');
  }
  const sale = await repo.updateOrderStatus(id, tenantId, nextStatus);
  return serializeSale(sale, found.items, found.payments);
};
