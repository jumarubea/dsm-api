import { AppError } from '../utils/AppError.js';
import { logger } from '../config/logger.js';
import { isProduction } from '../config/env.js';

/**
 * Global error handler. Emits the consistent error shape:
 *   { error: { code, message, fields? } }
 * Stack traces and raw errors never reach the client in production.
 */
// eslint-disable-next-line no-unused-vars
export const errorHandler = (err, req, res, next) => {
  const isOperational = err instanceof AppError;
  const statusCode = isOperational ? err.statusCode : 500;
  const code = isOperational ? err.code : 'INTERNAL_ERROR';
  const message = isOperational
    ? err.message
    : 'Hitilafu ya seva. Tafadhali jaribu tena.';

  if (!isOperational || statusCode >= 500) {
    logger.error({ err, path: req.path, method: req.method }, 'Request error');
  }

  const body = { error: { code, message } };
  if (err.fields) body.error.fields = err.fields;
  if (!isProduction && !isOperational) body.error.stack = err.stack;

  res.status(statusCode).json(body);
};
