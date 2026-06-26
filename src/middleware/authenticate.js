import { AppError } from '../utils/AppError.js';
import { verifyAccessToken } from '../utils/jwt.js';

/**
 * Authenticate a request from its Bearer access token. On success attaches the
 * decoded identity to `req.user`; otherwise forwards a 401 AppError.
 */
export const authenticate = (req, res, next) => {
  const header = req.headers.authorization;

  if (!header || !header.startsWith('Bearer ')) {
    return next(new AppError('Tafadhali ingia kwanza.', 401, 'AUTH_REQUIRED'));
  }

  const token = header.slice('Bearer '.length).trim();

  let decoded;
  try {
    decoded = verifyAccessToken(token);
  } catch {
    return next(new AppError('Kipindi chako kimeisha. Tafadhali ingia tena.', 401, 'AUTH_INVALID'));
  }

  req.user = {
    id: decoded.sub,
    role: decoded.role,
    tenant_id: decoded.tenant_id,
    tenant_slug: decoded.tenant_slug,
  };

  next();
};
