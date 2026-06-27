import { AppError } from '../utils/AppError.js';

export const subscriptionGuard = (req, res, next) => {
  // Reads req.tenant.status (set by resolveTenant) — the authoritative subscription gate.
  if (req.user.role === 'super_admin') return next();
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) return next();

  if (['past_due', 'suspended', 'cancelled'].includes(req.tenant?.status)) {
    return next(
      new AppError(
        'Usajili wako umesimama. Wasiliana na msimamizi ili kuendelea.',
        402,
        'SUBSCRIPTION_INACTIVE'
      )
    );
  }

  next();
};
