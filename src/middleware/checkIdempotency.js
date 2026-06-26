import { AppError } from '../utils/AppError.js';

// Duplicate-key 409 dedup is enforced at the database level via each write table's
// UNIQUE constraint on idempotency_key (sales, stock_movements). This middleware only
// guarantees the key is present and well-formed — it does not detect duplicates.

const WRITE_METHODS = ['POST', 'PUT', 'PATCH', 'DELETE'];
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export const checkIdempotency = (req, res, next) => {
  if (!WRITE_METHODS.includes(req.method)) {
    return next();
  }

  const key = req.get('Idempotency-Key');
  if (!key) {
    return next(new AppError('Idempotency-Key inahitajika.', 400, 'IDEMPOTENCY_KEY_REQUIRED'));
  }

  if (!UUID_REGEX.test(key)) {
    return next(new AppError('Idempotency-Key si sahihi.', 400, 'IDEMPOTENCY_KEY_INVALID'));
  }

  req.idempotencyKey = key;
  next();
};
