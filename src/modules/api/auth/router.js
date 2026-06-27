import { Router } from 'express';
import { authLimiter } from '../../../middleware/rateLimit.js';
import { validate } from '../../../middleware/validate.js';
import { loginSchema } from './validation.js';
import * as ctrl from './controller.js';

/**
 * Public auth routes, mounted at /api/v1/auth BEFORE the authenticated chain —
 * login issues the first token, so it cannot sit behind authenticate.
 */
const router = Router();

router.post('/login', authLimiter, validate(loginSchema), ctrl.login);
router.post('/refresh', ctrl.refresh);
router.post('/logout', ctrl.logout);

export default router;
