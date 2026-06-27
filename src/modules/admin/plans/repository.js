import { query } from '../../../config/db.js';

const COLS =
  'id, name, price_tzs, billing_cycle, trial_days, max_users, max_products, features, is_active';

export const listPlans = async () => {
  const { rows } = await query(`SELECT ${COLS} FROM subscription_plans ORDER BY price_tzs`);
  return rows;
};

export const createPlan = async (p) => {
  const { rows } = await query(
    `INSERT INTO subscription_plans
       (name, price_tzs, billing_cycle, trial_days, max_users, max_products, features)
     VALUES ($1, $2, $3, COALESCE($4, 14), $5, $6, COALESCE($7, '{}'::jsonb))
     RETURNING ${COLS}`,
    [
      p.name,
      p.price_tzs,
      p.billing_cycle,
      p.trial_days ?? null,
      p.max_users,
      p.max_products,
      p.features ?? null,
    ]
  );
  return rows[0];
};

const UPDATABLE = [
  'name',
  'price_tzs',
  'billing_cycle',
  'trial_days',
  'max_users',
  'max_products',
  'features',
  'is_active',
];

export const updatePlan = async (id, input) => {
  const sets = [];
  const vals = [];
  for (const key of UPDATABLE) {
    if (input[key] !== undefined) {
      vals.push(input[key]);
      sets.push(`${key} = $${vals.length}`);
    }
  }
  if (sets.length === 0) return null;
  vals.push(id);
  const { rows } = await query(
    `UPDATE subscription_plans SET ${sets.join(', ')} WHERE id = $${vals.length} RETURNING ${COLS}`,
    vals
  );
  return rows[0] || null;
};

export const deactivatePlan = async (id) => {
  const { rows } = await query(
    `UPDATE subscription_plans SET is_active = false WHERE id = $1 RETURNING id`,
    [id]
  );
  return rows[0] || null;
};
