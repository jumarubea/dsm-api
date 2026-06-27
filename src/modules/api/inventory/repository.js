import { query } from '../../../config/db.js';

export const findProduct = async (productId, tenantId) => {
  const { rows } = await query(
    'SELECT id, stock_qty, is_active FROM products WHERE id = $1 AND tenant_id = $2',
    [productId, tenantId]
  );
  return rows[0] || null;
};

export const insertMovement = async (
  tenantId,
  {
    product_id,
    idempotency_key,
    type,
    quantity,
    reason = null,
    unit_cost = null,
    created_by = null,
  }
) => {
  const { rows } = await query(
    `INSERT INTO stock_movements
       (tenant_id, product_id, idempotency_key, type, quantity, reason, unit_cost, created_by)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
     RETURNING id, product_id, type, quantity, reason, unit_cost, created_by, created_at`,
    [tenantId, product_id, idempotency_key, type, quantity, reason, unit_cost, created_by]
  );
  return rows[0];
};

export const listMovements = async (tenantId, { productId, type, dateFrom, dateTo } = {}) => {
  const where = ['tenant_id = $1'];
  const vals = [tenantId];
  const add = (clause, value) => {
    vals.push(value);
    where.push(`${clause} $${vals.length}`);
  };
  if (productId) add('product_id =', productId);
  if (type) add('type =', type);
  if (dateFrom) add('created_at >=', dateFrom);
  if (dateTo) add('created_at <=', dateTo);
  const { rows } = await query(
    `SELECT id, product_id, type, quantity, reason, unit_cost, created_by, created_at
     FROM stock_movements WHERE ${where.join(' AND ')}
     ORDER BY created_at DESC LIMIT 200`,
    vals
  );
  return rows;
};

export const listDeadStock = async (tenantId) => {
  const { rows } = await query(
    `SELECT p.id, p.name, p.stock_qty, MAX(s.created_at) AS last_sold_at
     FROM products p
     LEFT JOIN sale_items si ON si.product_id = p.id AND si.tenant_id = p.tenant_id
     LEFT JOIN sales s ON s.id = si.sale_id AND s.tenant_id = p.tenant_id AND s.status = 'COMPLETED'
     WHERE p.tenant_id = $1 AND p.is_active = true
     GROUP BY p.id
     HAVING MAX(s.created_at) IS NULL
        OR MAX(s.created_at) < NOW() - (COALESCE(p.dead_stock_days, 90) || ' days')::INTERVAL
     ORDER BY last_sold_at ASC NULLS FIRST`,
    [tenantId]
  );
  return rows;
};

export const listLowStock = async (tenantId) => {
  const { rows } = await query(
    `SELECT id, tenant_id, name, sku, category_id, unit_of_measure, retail_price, wholesale_price,
            cost_price, stock_qty, min_stock_level, dead_stock_days, is_active, created_at
     FROM products
     WHERE tenant_id = $1 AND is_active = true AND stock_qty < min_stock_level
     ORDER BY stock_qty ASC`,
    [tenantId]
  );
  return rows;
};
