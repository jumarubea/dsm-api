import { Router } from 'express';
import { roleGuard } from '../../../middleware/roleGuard.js';
import { validate } from '../../../middleware/validate.js';
import { stockInSchema, adjustmentSchema } from './validation.js';
import * as ctrl from './controller.js';

/**
 * Inventory under /api/v1/inventory. Parent chain applies authenticate →
 * resolveTenant → subscriptionGuard → checkIdempotency. Stock writes are
 * StoreKeeper+ ; reads are broader.
 */
const router = Router();

const STORE_WRITE = ['store_keeper', 'manager', 'shop_admin'];

router.post('/stock-in', roleGuard(STORE_WRITE), validate(stockInSchema), ctrl.stockIn);
router.post('/adjustment', roleGuard(STORE_WRITE), validate(adjustmentSchema), ctrl.adjustment);
router.get('/movements', ctrl.movements);
router.get('/low-stock', roleGuard(['manager', 'store_keeper', 'shop_admin']), ctrl.lowStock);
router.get('/dead-stock', ctrl.deadStock);

export default router;
