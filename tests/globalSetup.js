/**
 * Vitest global setup — runs ONCE before the whole suite.
 * Applies migrations to the test database and seeds a deterministic fixture:
 * two active tenants (shop-a, shop-b), one suspended tenant (shop-suspended),
 * a user for every shop role in each tenant, and a platform super admin.
 */
import { execSync } from 'node:child_process';
import pg from 'pg';
import bcrypt from 'bcrypt';

const TEST_DB_URL = process.env.TEST_DATABASE_URL || 'postgres://localhost:5432/dsm_test';
const SHOP_ROLES = ['shop_admin', 'manager', 'sales_attendant', 'store_keeper'];

export default async function setup() {
  // Apply migrations to the test DB. Explicit DATABASE_URL wins over .env
  // (dotenv does not override already-set env vars).
  execSync('npx node-pg-migrate up', {
    stdio: 'ignore',
    env: { ...process.env, DATABASE_URL: TEST_DB_URL },
  });

  const pool = new pg.Pool({ connectionString: TEST_DB_URL });
  const passwordHash = await bcrypt.hash('test', 12);

  try {
    await pool.query(
      'TRUNCATE TABLE audit_log, billing_events, subscriptions, users, tenants, subscription_plans RESTART IDENTITY CASCADE'
    );

    await pool.query(
      `INSERT INTO subscription_plans (name, price_tzs, billing_cycle, trial_days, max_users, max_products)
       VALUES ('Basic', 30000, 'monthly', 14, 3, 100), ('Pro', 75000, 'monthly', 14, -1, -1)`
    );

    const tenants = [
      { slug: 'shop-a', status: 'active' },
      { slug: 'shop-b', status: 'active' },
      { slug: 'shop-suspended', status: 'suspended' },
    ];

    for (const t of tenants) {
      const { rows } = await pool.query(
        `INSERT INTO tenants (name, slug, status, owner_email)
         VALUES ($1, $2, $3, $4) RETURNING id`,
        [`Shop ${t.slug}`, t.slug, t.status, `owner@${t.slug}.test`]
      );
      const tenantId = rows[0].id;
      const roles = t.slug === 'shop-suspended' ? ['shop_admin'] : SHOP_ROLES;
      for (const role of roles) {
        await pool.query(
          `INSERT INTO users (tenant_id, name, email, password_hash, role)
           VALUES ($1, $2, $3, $4, $5)`,
          [tenantId, `${role} ${t.slug}`, `${role}.${t.slug}@dsm.test`, passwordHash, role]
        );
      }
    }

    await pool.query(
      `INSERT INTO users (tenant_id, name, email, password_hash, role)
       VALUES (NULL, 'Platform Owner', 'superadmin@dsm.test', $1, 'super_admin')`,
      [passwordHash]
    );
  } finally {
    await pool.end();
  }
}
