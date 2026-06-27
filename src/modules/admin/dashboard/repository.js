import { query } from '../../../config/db.js';

export const tenantCounts = async () => {
  const { rows } = await query(
    `SELECT status, COUNT(*)::int AS count FROM tenants GROUP BY status`
  );
  const counts = { active: 0, trialing: 0, past_due: 0, suspended: 0, cancelled: 0 };
  for (const r of rows) counts[r.status] = r.count;
  counts.total = Object.values(counts).reduce((a, b) => a + b, 0);
  return counts;
};

export const mrr = async () => {
  // Monthly recurring revenue from active subscriptions; annual plans are /12.
  const { rows } = await query(
    `SELECT COALESCE(SUM(
       CASE p.billing_cycle WHEN 'annual' THEN p.price_tzs / 12 ELSE p.price_tzs END
     ), 0) AS mrr
     FROM subscriptions s
     JOIN subscription_plans p ON p.id = s.plan_id
     WHERE s.status = 'active'`
  );
  return rows[0].mrr;
};

export const trialsExpiring = async () => {
  const { rows } = await query(
    `SELECT COUNT(*)::int AS count FROM subscriptions
     WHERE status = 'trialing' AND trial_ends_at IS NOT NULL
       AND trial_ends_at < now() + interval '3 days'`
  );
  return rows[0].count;
};

export const tenantsHealth = async () => {
  const { rows } = await query(
    `SELECT t.id, t.name, t.slug, t.status, t.created_at,
            p.name AS plan_name, s.status AS subscription_status, s.current_period_end,
            (SELECT COUNT(*)::int FROM sales
             WHERE tenant_id = t.id AND status = 'COMPLETED'
               AND created_at >= date_trunc('month', now())) AS sales_this_month
     FROM tenants t
     LEFT JOIN subscriptions s ON s.tenant_id = t.id
     LEFT JOIN subscription_plans p ON p.id = s.plan_id
     ORDER BY t.created_at DESC`
  );
  return rows;
};
