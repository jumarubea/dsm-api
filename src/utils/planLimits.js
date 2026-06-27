import { query } from '../config/db.js';
import { AppError } from './AppError.js';

/**
 * Enforce the plan's max_users limit for a tenant. -1 means unlimited.
 * Throws 422 PLAN_LIMIT_REACHED when the active user count is at the cap.
 */
export const checkUserLimit = async (tenantId) => {
  const { rows } = await query(
    `SELECT sp.max_users,
            (SELECT COUNT(*) FROM users WHERE tenant_id = $1 AND is_active = true) AS user_count
     FROM subscriptions s
     JOIN subscription_plans sp ON sp.id = s.plan_id
     WHERE s.tenant_id = $1`,
    [tenantId]
  );
  const row = rows[0];
  if (!row) return;
  if (row.max_users !== -1 && parseInt(row.user_count, 10) >= row.max_users) {
    throw new AppError(
      'Umefika kiwango cha juu cha watumiaji kwa mpango wako. Panda mpango ili kuongeza zaidi.',
      422,
      'PLAN_LIMIT_REACHED'
    );
  }
};
