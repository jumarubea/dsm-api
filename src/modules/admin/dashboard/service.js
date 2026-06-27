import * as repo from './repository.js';

export const summary = async () => {
  const [counts, mrr, trials_expiring] = await Promise.all([
    repo.tenantCounts(),
    repo.mrr(),
    repo.trialsExpiring(),
  ]);
  return {
    tenants: counts,
    mrr,
    trials_expiring,
    past_due: counts.past_due,
  };
};

export const tenantsHealth = () => repo.tenantsHealth();
