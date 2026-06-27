import rateLimit from 'express-rate-limit';
import { env } from '../config/env.js';

/**
 * Login throttle — 10 attempts per IP per 15 minutes. Applied to the auth login
 * route(s). Skipped under NODE_ENV=test so the suite is not throttled.
 */
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  skip: () => env.NODE_ENV === 'test',
  message: {
    error: {
      code: 'TOO_MANY_REQUESTS',
      message: 'Umejaribu mara nyingi. Subiri dakika 15.',
    },
  },
});
