import { Router } from 'express';
import { roleGuard } from '../../../middleware/roleGuard.js';
import { validate } from '../../../middleware/validate.js';
import { createCategorySchema, updateCategorySchema } from './validation.js';
import * as ctrl from './controller.js';

/**
 * Tenant-scoped category management under /api/v1/categories. The parent chain
 * already applies authenticate → resolveTenant → subscriptionGuard →
 * checkIdempotency. Listing is open to any authenticated role; writes are
 * shop_admin only.
 */
const router = Router();

router.get('/', ctrl.list);
router.post('/', roleGuard(['shop_admin']), validate(createCategorySchema), ctrl.create);
router.patch('/:id', roleGuard(['shop_admin']), validate(updateCategorySchema), ctrl.update);
router.delete('/:id', roleGuard(['shop_admin']), ctrl.remove);

export default router;
