import { AppError } from '../utils/AppError.js';

export const validate =
  (schema, source = 'body') =>
  (req, res, next) => {
    const result = schema.safeParse(req[source]);

    if (!result.success) {
      const fields = {};
      for (const issue of result.error.issues) {
        fields[issue.path.join('.')] = issue.message;
      }
      return next(new AppError('Taarifa ulizoingiza si sahihi.', 422, 'VALIDATION_ERROR', fields));
    }

    req[source] = result.data;
    next();
  };
