import { query } from '../../../config/db.js';

export const listCategories = async (tenantId) => {
  const { rows } = await query(
    `SELECT id, name, created_at FROM categories WHERE tenant_id = $1 ORDER BY name`,
    [tenantId]
  );
  return rows;
};

export const findCategoryById = async (id, tenantId) => {
  const { rows } = await query(
    `SELECT id, name, created_at FROM categories WHERE id = $1 AND tenant_id = $2`,
    [id, tenantId]
  );
  return rows[0] || null;
};

export const createCategory = async (tenantId, name) => {
  const { rows } = await query(
    `INSERT INTO categories (tenant_id, name) VALUES ($1, $2)
     RETURNING id, name, created_at`,
    [tenantId, name]
  );
  return rows[0];
};

export const updateCategory = async (id, tenantId, name) => {
  const { rows } = await query(
    `UPDATE categories SET name = $3, updated_at = now()
     WHERE id = $1 AND tenant_id = $2
     RETURNING id, name, created_at`,
    [id, tenantId, name]
  );
  return rows[0] || null;
};

export const deleteCategory = async (id, tenantId) => {
  const { rows } = await query(
    `DELETE FROM categories WHERE id = $1 AND tenant_id = $2 RETURNING id`,
    [id, tenantId]
  );
  return rows[0] || null;
};

export const countProductsInCategory = async (categoryId, tenantId) => {
  const { rows } = await query(
    `SELECT COUNT(*)::int AS count FROM products WHERE category_id = $1 AND tenant_id = $2`,
    [categoryId, tenantId]
  );
  return rows[0].count;
};
