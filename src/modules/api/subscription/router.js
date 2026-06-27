import { Router } from 'express';
import { roleGuard } from '../../../middleware/roleGuard.js';
import * as ctrl from './controller.js';

/**
 * Shop-facing, read-only subscription view under /api/v1/subscription.
 * Shop Admin only (parent chain applies authenticate → resolveTenant → ...).
 */
const router = Router();

router.get('/', roleGuard(['shop_admin']), ctrl.get);

export default router;
