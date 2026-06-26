import { AppError } from '../utils/AppError.js';

export const roleGuard = (allowedRoles) => (req, res, next) => {
  if (!allowedRoles.includes(req.user.role)) {
    return next(new AppError('Huna ruhusa ya kufanya hivi.', 403, 'FORBIDDEN'));
  }
  next();
};
