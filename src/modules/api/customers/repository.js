import { query } from '../../../config/db.js';

const COLS = 'id, name, phone, email, address, created_at, updated_at';

export const listCustomers = async (tenantId, search) => {
  if (search) {
    const { rows } = await query(
      `SELECT ${COLS} FROM customers
       WHERE tenant_id = $1 AND (name ILIKE $2 OR phone ILIKE $2)
       ORDER BY name LIMIT 200`,
      [tenantId, `%${search}%`]
    );
    return rows;
  }
  const { rows } = await query(
    `SELECT ${COLS} FROM customers WHERE tenant_id = $1 ORDER BY name LIMIT 200`,
    [tenantId]
  );
  return rows;
};

export const findCustomerById = async (id, tenantId) => {
  const { rows } = await query(`SELECT ${COLS} FROM customers WHERE id = $1 AND tenant_id = $2`, [
    id,
    tenantId,
  ]);
  return rows[0] || null;
};

export const createCustomer = async (tenantId, { name, phone, email, address }) => {
  const { rows } = await query(
    `INSERT INTO customers (tenant_id, name, phone, email, address)
     VALUES ($1, $2, $3, $4, $5) RETURNING ${COLS}`,
    [tenantId, name, phone ?? null, email ?? null, address ?? null]
  );
  return rows[0];
};

export const updateCustomer = async (id, tenantId, fields) => {
  const sets = ['updated_at = now()'];
  const vals = [];
  for (const key of ['name', 'phone', 'email', 'address']) {
    if (fields[key] !== undefined) {
      vals.push(fields[key]);
      sets.push(`${key} = $${vals.length}`);
    }
  }
  vals.push(id, tenantId);
  const { rows } = await query(
    `UPDATE customers SET ${sets.join(', ')}
     WHERE id = $${vals.length - 1} AND tenant_id = $${vals.length}
     RETURNING ${COLS}`,
    vals
  );
  return rows[0] || null;
};

export const purchaseHistory = async (id, tenantId) => {
  const { rows } = await query(
    `SELECT id, type, status, subtotal, total, payment_method, payment_status, created_at
     FROM sales WHERE customer_id = $1 AND tenant_id = $2
     ORDER BY created_at DESC LIMIT 200`,
    [id, tenantId]
  );
  return rows;
};
