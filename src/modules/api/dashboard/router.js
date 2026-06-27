import { Router } from 'express';
import { roleGuard } from '../../../middleware/roleGuard.js';
import * as ctrl from './controller.js';

/**
 * Shop dashboard under /api/v1/dashboard (parent chain: authenticate →
 * resolveTenant → subscriptionGuard → checkIdempotency). All reads; profit and
 * cost_price fields are stripped per-role at the service/serialiser layer.
 */
const router = Router();

router.get('/summary', ctrl.summary);
router.get('/chart', ctrl.chart);
router.get('/alerts', roleGuard(['manager', 'store_keeper', 'shop_admin']), ctrl.alerts);
router.get('/orders', ctrl.orders);
router.get('/prices', ctrl.prices);

export default router;
