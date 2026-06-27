import { AppError } from '../../../utils/AppError.js';
import * as repo from './repository.js';

export const get = async (tenantId) => {
  const sub = await repo.getSubscription(tenantId);
  if (!sub) throw new AppError('Hakuna usajili.', 404, 'NOT_FOUND');
  return {
    status: sub.status,
    plan: { name: sub.plan_name, price_tzs: sub.price_tzs, billing_cycle: sub.billing_cycle },
    trial_ends_at: sub.trial_ends_at,
    current_period_start: sub.current_period_start,
    current_period_end: sub.current_period_end,
    cancelled_at: sub.cancelled_at,
    limits: { max_users: sub.max_users, max_products: sub.max_products },
    usage: { users: sub.user_count, products: sub.product_count },
  };
};
