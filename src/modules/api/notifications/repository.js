import { query } from '../../../config/db.js';

export const listForRole = async (tenantId, role) => {
  const { rows } = await query(
    `SELECT id, type, product_id, message, is_read, created_at
     FROM notifications
     WHERE tenant_id = $1 AND $2 = ANY(visible_to_roles) AND is_read = false
     ORDER BY created_at DESC`,
    [tenantId, role]
  );
  return rows;
};

export const markRead = async (id, tenantId, role) => {
  const { rows } = await query(
    `UPDATE notifications SET is_read = true
     WHERE id = $1 AND tenant_id = $2 AND $3 = ANY(visible_to_roles)
     RETURNING id`,
    [id, tenantId, role]
  );
  return rows[0] || null;
};
