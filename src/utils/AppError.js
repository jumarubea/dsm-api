/**
 * Operational error with an HTTP status, a stable machine code, and an optional
 * per-field map. The global error handler renders these directly to the client;
 * any other thrown value is treated as an unexpected 500.
 */
export class AppError extends Error {
  constructor(message, statusCode = 500, code = 'INTERNAL_ERROR', fields) {
    super(message);
    this.name = 'AppError';
    this.statusCode = statusCode;
    this.code = code;
    if (fields) this.fields = fields;
    this.isOperational = true;
    Error.captureStackTrace?.(this, this.constructor);
  }
}
