import { AppError } from '../utils/AppError.js';
import { query } from '../config/db.js';

export const resolveTenant = async (req, res, next) => {
  // Super admin has no tenant scope.
  if (req.user.role === 'super_admin') return next();

  // Prefer the subdomain; on non-tenant hosts (localhost / www / app) fall back
  // to the JWT's tenant_slug so the API is testable without a subdomain.
  const sub = req.hostname.split('.')[0];
  const slug = !sub || ['www', 'app', 'localhost'].includes(sub) ? req.user.tenant_slug : sub;
  if (!slug) {
    return next(new AppError('Tenant haijulikani.', 400, 'TENANT_NOT_FOUND'));
  }

  // Express 5 forwards a rejected promise to the error handler automatically.
  const result = await query('SELECT id, status, slug FROM tenants WHERE slug = $1', [slug]);
  if (!result.rows[0]) {
    return next(new AppError('Tenant haijulikani.', 400, 'TENANT_NOT_FOUND'));
  }

  req.tenant = result.rows[0];

  // Bind the JWT to the resolved tenant: a token issued for one tenant must not
  // be replayed against another tenant's subdomain. 404 (not 403) per the
  // cross-tenant isolation rule — never confirm another tenant's existence.
  if (req.user.tenant_id !== req.tenant.id) {
    return next(new AppError('Rasilimali haipatikani.', 404, 'NOT_FOUND'));
  }

  next();
};
