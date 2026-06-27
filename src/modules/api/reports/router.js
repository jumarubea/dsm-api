import { Router } from 'express';
import { roleGuard } from '../../../middleware/roleGuard.js';
import * as ctrl from './controller.js';

/**
 * Reports under /api/v1/reports. All reads. ?format=csv returns CSV for the
 * tabular portion. The profit report is restricted to Shop Admin / Manager.
 */
const router = Router();

router.get('/daily', ctrl.daily);
router.get('/monthly', ctrl.monthly);
router.get('/fast-moving', ctrl.fastMoving);
router.get('/dead-stock', ctrl.deadStock);
router.get('/profit', roleGuard(['shop_admin', 'manager']), ctrl.profit);

export default router;
