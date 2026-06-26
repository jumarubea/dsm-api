import { AppError } from '../utils/AppError.js';
import { query } from '../config/db.js';

export const resolveTenant = async (req, res, next) => {
  // Super admin has no tenant scope.
  if (req.user.role === 'super_admin') return next();

  const slug = req.hostname.split('.')[0] || req.user.tenant_slug;
  if (!slug || slug === 'www' || slug === 'app') {
    return next(new AppError('Tenant haijulikani.', 400, 'TENANT_NOT_FOUND'));
  }

  // Express 5 forwards a rejected promise to the error handler automatically.
  const result = await query(
    'SELECT id, status, slug FROM tenants WHERE slug = $1',
    [slug]
  );
  if (!result.rows[0]) {
    return next(new AppError('Tenant haijulikani.', 400, 'TENANT_NOT_FOUND'));
  }

  req.tenant = result.rows[0];
  next();
};
