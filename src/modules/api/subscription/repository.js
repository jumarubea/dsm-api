import { query } from '../../../config/db.js';

export const getSubscription = async (tenantId) => {
  const { rows } = await query(
    `SELECT s.status, s.trial_ends_at, s.current_period_start, s.current_period_end, s.cancelled_at,
            p.name AS plan_name, p.price_tzs, p.billing_cycle, p.max_users, p.max_products,
            (SELECT COUNT(*)::int FROM users WHERE tenant_id = $1 AND is_active = true) AS user_count,
            (SELECT COUNT(*)::int FROM products WHERE tenant_id = $1 AND is_active = true) AS product_count
     FROM subscriptions s
     JOIN subscription_plans p ON p.id = s.plan_id
     WHERE s.tenant_id = $1`,
    [tenantId]
  );
  return rows[0] || null;
};
