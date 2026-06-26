import { AppError } from '../utils/AppError.js';

/** Catch-all for unmatched routes. */
export const notFound = (req, res, next) => {
  next(new AppError('Njia haipatikani.', 404, 'NOT_FOUND'));
};
