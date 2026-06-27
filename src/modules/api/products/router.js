import { Router } from 'express';
import { roleGuard } from '../../../middleware/roleGuard.js';
import { validate } from '../../../middleware/validate.js';
import { createProductSchema, updateProductSchema, pricingRuleSchema } from './validation.js';
import * as ctrl from './controller.js';

/**
 * Tenant-scoped product catalogue under /api/v1/products. Parent chain applies
 * authenticate → resolveTenant → subscriptionGuard → checkIdempotency.
 * Reads are open to any authenticated role (cost_price is stripped per-role at
 * the serialiser); writes are role-restricted.
 */
const router = Router();

router.get('/', ctrl.list);
router.post('/', roleGuard(['shop_admin']), validate(createProductSchema), ctrl.create);
router.get('/:id', ctrl.detail);
router.patch(
  '/:id',
  roleGuard(['shop_admin', 'manager']),
  validate(updateProductSchema),
  ctrl.update
);
router.delete('/:id', roleGuard(['shop_admin']), ctrl.remove);

router.post(
  '/:id/pricing-rules',
  roleGuard(['shop_admin']),
  validate(pricingRuleSchema),
  ctrl.addPricingRule
);
router.delete('/:id/pricing-rules/:rid', roleGuard(['shop_admin']), ctrl.removePricingRule);

export default router;
