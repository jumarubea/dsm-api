import { AppError } from '../../../utils/AppError.js';
import { serializeProduct } from '../../../serialisers/product.js';
import * as repo from './repository.js';

const productNotFound = () => new AppError('Bidhaa haipatikani.', 404, 'NOT_FOUND');

// A duplicate idempotency_key means this exact write was already applied.
const idempotencyConflict = () =>
  new AppError('Ombi hili limeshatekelezwa.', 409, 'IDEMPOTENCY_CONFLICT');

const insertGuarded = async (tenantId, payload) => {
  try {
    return await repo.insertMovement(tenantId, payload);
  } catch (err) {
    if (err.code === '23505') throw idempotencyConflict();
    throw err;
  }
};

export const stockIn = async (tenantId, input, idempotencyKey, userId) => {
  const product = await repo.findProduct(input.product_id, tenantId);
  if (!product || !product.is_active) throw productNotFound();
  return insertGuarded(tenantId, {
    product_id: input.product_id,
    idempotency_key: idempotencyKey,
    type: 'STOCK_IN',
    quantity: input.quantity,
    reason: input.reason ?? null,
    unit_cost: input.unit_cost ?? null,
    created_by: userId,
  });
};

export const adjustment = async (tenantId, input, idempotencyKey, userId) => {
  const product = await repo.findProduct(input.product_id, tenantId);
  if (!product || !product.is_active) throw productNotFound();
  if (input.quantity < 0 && product.stock_qty + input.quantity < 0) {
    throw new AppError('Hisa haitoshi kwa marekebisho haya.', 422, 'INSUFFICIENT_STOCK');
  }
  return insertGuarded(tenantId, {
    product_id: input.product_id,
    idempotency_key: idempotencyKey,
    type: 'ADJUSTMENT',
    quantity: input.quantity,
    reason: input.reason,
    created_by: userId,
  });
};

export const movements = (tenantId, filters) => repo.listMovements(tenantId, filters);

export const deadStock = (tenantId) => repo.listDeadStock(tenantId);

export const lowStock = async (tenantId, role) => {
  const products = await repo.listLowStock(tenantId);
  return products.map((p) => serializeProduct(p, role));
};
