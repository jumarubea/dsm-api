import { query } from '../../../config/db.js';

const COLS = `id, tenant_id, name, sku, category_id, unit_of_measure, retail_price,
              wholesale_price, cost_price, stock_qty, min_stock_level, dead_stock_days,
              is_active, created_at`;

export const findCategory = async (categoryId, tenantId) => {
  const { rows } = await query('SELECT id FROM categories WHERE id = $1 AND tenant_id = $2', [
    categoryId,
    tenantId,
  ]);
  return rows[0] || null;
};

export const listProducts = async (tenantId) => {
  const { rows } = await query(
    `SELECT ${COLS} FROM products WHERE tenant_id = $1 AND is_active = true ORDER BY name`,
    [tenantId]
  );
  return rows;
};

export const findProductById = async (id, tenantId) => {
  const { rows } = await query(`SELECT ${COLS} FROM products WHERE id = $1 AND tenant_id = $2`, [
    id,
    tenantId,
  ]);
  return rows[0] || null;
};

export const listPricingRules = async (productId, tenantId) => {
  const { rows } = await query(
    `SELECT id, min_qty, price_type FROM product_pricing_rules
     WHERE product_id = $1 AND tenant_id = $2 ORDER BY min_qty`,
    [productId, tenantId]
  );
  return rows;
};

export const createProduct = async (tenantId, p) => {
  const { rows } = await query(
    `INSERT INTO products
       (tenant_id, name, sku, category_id, unit_of_measure, retail_price,
        wholesale_price, cost_price, min_stock_level, dead_stock_days)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, COALESCE($9, 5), $10)
     RETURNING ${COLS}`,
    [
      tenantId,
      p.name,
      p.sku ?? null,
      p.category_id,
      p.unit_of_measure,
      p.retail_price,
      p.wholesale_price,
      p.cost_price,
      p.min_stock_level ?? null,
      p.dead_stock_days ?? null,
    ]
  );
  return rows[0];
};

const UPDATABLE = [
  'name',
  'sku',
  'category_id',
  'unit_of_measure',
  'retail_price',
  'wholesale_price',
  'cost_price',
  'min_stock_level',
  'dead_stock_days',
  'is_active',
];

export const updateProduct = async (id, tenantId, input) => {
  const sets = ['updated_at = now()'];
  const vals = [];
  let i = 1;
  for (const key of UPDATABLE) {
    if (input[key] !== undefined) {
      sets.push(`${key} = $${i++}`);
      vals.push(input[key]);
    }
  }
  vals.push(id, tenantId);
  const { rows } = await query(
    `UPDATE products SET ${sets.join(', ')} WHERE id = $${i++} AND tenant_id = $${i}
     RETURNING ${COLS}`,
    vals
  );
  return rows[0] || null;
};

export const softDeleteProduct = async (id, tenantId) => {
  const { rows } = await query(
    `UPDATE products SET is_active = false, updated_at = now()
     WHERE id = $1 AND tenant_id = $2 RETURNING id`,
    [id, tenantId]
  );
  return rows[0] || null;
};

export const addPricingRule = async (tenantId, productId, { min_qty, price_type }) => {
  const { rows } = await query(
    `INSERT INTO product_pricing_rules (tenant_id, product_id, min_qty, price_type)
     VALUES ($1, $2, $3, $4) RETURNING id, min_qty, price_type`,
    [tenantId, productId, min_qty, price_type]
  );
  return rows[0];
};

export const removePricingRule = async (ruleId, productId, tenantId) => {
  const { rows } = await query(
    `DELETE FROM product_pricing_rules
     WHERE id = $1 AND product_id = $2 AND tenant_id = $3 RETURNING id`,
    [ruleId, productId, tenantId]
  );
  return rows[0] || null;
};
