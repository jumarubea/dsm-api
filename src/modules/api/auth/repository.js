import { query } from '../../../config/db.js';

export const findByEmail = async (email) => {
  const { rows } = await query(
    `SELECT u.id, u.name, u.email, u.password_hash, u.role, u.tenant_id, u.is_active,
            u.language_preference, t.slug AS tenant_slug
     FROM users u
     LEFT JOIN tenants t ON t.id = u.tenant_id
     WHERE u.email = $1`,
    [email]
  );
  return rows[0] || null;
};

export const findById = async (id) => {
  const { rows } = await query(
    `SELECT u.id, u.name, u.email, u.role, u.tenant_id, u.is_active,
            u.language_preference, t.slug AS tenant_slug
     FROM users u
     LEFT JOIN tenants t ON t.id = u.tenant_id
     WHERE u.id = $1`,
    [id]
  );
  return rows[0] || null;
};
