/**
 * Test auth helper. Signs a real access token for a seeded user.
 *
 * NOTE: tokens are signed directly because the auth/login endpoint does not
 * exist yet (Module F). Switch to login-based tokens once it lands.
 */
import { query } from '../../src/config/db.js';
import { signAccessToken } from '../../src/utils/jwt.js';

export const TENANT = {
  A: 'shop-a',
  B: 'shop-b',
  SUSPENDED: 'shop-suspended',
};

/** Token for a shop role within a tenant (by slug). */
export const tokenFor = async (role, slug) => {
  const { rows } = await query(
    `SELECT u.id, u.role, u.tenant_id, t.slug AS tenant_slug
     FROM users u JOIN tenants t ON t.id = u.tenant_id
     WHERE u.role = $1 AND t.slug = $2
     LIMIT 1`,
    [role, slug]
  );
  if (!rows[0]) throw new Error(`No seeded ${role} for tenant ${slug}`);
  const u = rows[0];
  return signAccessToken({
    sub: u.id,
    role: u.role,
    tenant_id: u.tenant_id,
    tenant_slug: u.tenant_slug,
  });
};

/** Token for the platform super admin (no tenant). */
export const superAdminToken = async () => {
  const { rows } = await query(`SELECT id, role FROM users WHERE role = 'super_admin' LIMIT 1`);
  if (!rows[0]) throw new Error('No seeded super_admin');
  return signAccessToken({
    sub: rows[0].id,
    role: rows[0].role,
    tenant_id: null,
    tenant_slug: null,
  });
};
