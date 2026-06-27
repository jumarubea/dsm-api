import { Router } from 'express';
import * as ctrl from './controller.js';

/**
 * Role-filtered notifications under /api/v1/notifications (parent chain applies
 * authenticate → resolveTenant → subscriptionGuard → checkIdempotency).
 */
const router = Router();

router.get('/', ctrl.list);
router.patch('/:id/read', ctrl.markRead);

export default router;
