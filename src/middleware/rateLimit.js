import rateLimit from 'express-rate-limit';

/**
 * Login throttle — 10 attempts per IP per 15 minutes. Applied to the auth login
 * routes (both /api/v1/auth/login and /admin/v1/auth/login) when they land.
 */
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: {
      code: 'TOO_MANY_REQUESTS',
      message: 'Umejaribu mara nyingi. Subiri dakika 15.',
    },
  },
});
