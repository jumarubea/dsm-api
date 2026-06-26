/**
 * Seed: the broker's first Super Admin account and the starter subscription
 * plans. Idempotent — safe to run repeatedly (ON CONFLICT DO NOTHING).
 *
 *   npm run seed
 *
 * Override defaults with SEED_SUPERADMIN_EMAIL / SEED_SUPERADMIN_PASSWORD.
 */
import bcrypt from 'bcrypt';
import { query, closePool } from '../src/config/db.js';
import { logger } from '../src/config/logger.js';

const SUPERADMIN_EMAIL = process.env.SEED_SUPERADMIN_EMAIL || 'superadmin@dsm.co.tz';
const SUPERADMIN_PASSWORD = process.env.SEED_SUPERADMIN_PASSWORD || 'ChangeMe123!';

const PLANS = [
  {
    name: 'Basic',
    price_tzs: 30000,
    billing_cycle: 'monthly',
    trial_days: 14,
    max_users: 3,
    max_products: 100,
    features: {},
  },
  {
    name: 'Pro',
    price_tzs: 75000,
    billing_cycle: 'monthly',
    trial_days: 14,
    max_users: -1,
    max_products: -1,
    features: { reports_export: true, multi_branch: true },
  },
];

const seedPlans = async () => {
  for (const p of PLANS) {
    await query(
      `INSERT INTO subscription_plans
         (name, price_tzs, billing_cycle, trial_days, max_users, max_products, features)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       ON CONFLICT (name) DO NOTHING`,
      [p.name, p.price_tzs, p.billing_cycle, p.trial_days, p.max_users, p.max_products, p.features]
    );
  }
  logger.info(`Seeded ${PLANS.length} subscription plans`);
};

const seedSuperAdmin = async () => {
  const passwordHash = await bcrypt.hash(SUPERADMIN_PASSWORD, 12);
  const res = await query(
    `INSERT INTO users (tenant_id, name, email, password_hash, role)
     VALUES (NULL, 'Platform Owner', $1, $2, 'super_admin')
     ON CONFLICT (email) DO NOTHING
     RETURNING id`,
    [SUPERADMIN_EMAIL, passwordHash]
  );
  if (res.rowCount > 0) {
    logger.info(`Seeded Super Admin: ${SUPERADMIN_EMAIL}`);
  } else {
    logger.info(`Super Admin already exists: ${SUPERADMIN_EMAIL}`);
  }
};

const run = async () => {
  try {
    await seedPlans();
    await seedSuperAdmin();
    logger.info('Seed complete');
  } catch (err) {
    logger.error({ err }, 'Seed failed');
    process.exitCode = 1;
  } finally {
    await closePool();
  }
};

run();
