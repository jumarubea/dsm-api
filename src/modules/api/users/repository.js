import { query } from '../../../config/db.js';

const RETURNING = 'id, name, email, role, tenant_id, is_active, language_preference, created_at';

export const listUsers = async (tenantId) => {
  const { rows } = await query(
    `SELECT ${RETURNING} FROM users WHERE tenant_id = $1 ORDER BY created_at DESC`,
    [tenantId]
  );
  return rows;
};

export const findUserById = async (id, tenantId) => {
  const { rows } = await query(
    `SELECT ${RETURNING} FROM users WHERE id = $1 AND tenant_id = $2`,
    [id, tenantId]
  );
  return rows[0] || null;
};

export const createUser = async (tenantId, { name, email, passwordHash, role, language }) => {
  const { rows } = await query(
    `INSERT INTO users (tenant_id, name, email, password_hash, role, language_preference)
     VALUES ($1, $2, $3, $4, $5, COALESCE($6, 'en')::language_preference)
     RETURNING ${RETURNING}`,
    [tenantId, name, email, passwordHash, role, language ?? null]
  );
  return rows[0];
};

export const updateUser = async (id, tenantId, { name, role, is_active, language_preference }) => {
  const sets = ['updated_at = now()'];
  const vals = [];
  let i = 1;
  if (name !== undefined) {
    sets.push(`name = $${i++}`);
    vals.push(name);
  }
  if (role !== undefined) {
    sets.push(`role = $${i++}`);
    vals.push(role);
  }
  if (is_active !== undefined) {
    sets.push(`is_active = $${i++}`);
    vals.push(is_active);
  }
  if (language_preference !== undefined) {
    sets.push(`language_preference = $${i++}`);
    vals.push(language_preference);
  }
  vals.push(id, tenantId);
  const { rows } = await query(
    `UPDATE users SET ${sets.join(', ')} WHERE id = $${i++} AND tenant_id = $${i}
     RETURNING ${RETURNING}`,
    vals
  );
  return rows[0] || null;
};

export const deactivateUser = async (id, tenantId) => {
  const { rows } = await query(
    `UPDATE users SET is_active = false, updated_at = now()
     WHERE id = $1 AND tenant_id = $2 RETURNING ${RETURNING}`,
    [id, tenantId]
  );
  return rows[0] || null;
};

export const setLanguage = async (id, language) => {
  const { rows } = await query(
    `UPDATE users SET language_preference = $2, updated_at = now()
     WHERE id = $1 RETURNING ${RETURNING}`,
    [id, language]
  );
  return rows[0] || null;
};
