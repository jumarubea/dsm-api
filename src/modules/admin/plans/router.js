import { Router } from 'express';
import { validate } from '../../../middleware/validate.js';
import { createPlanSchema, updatePlanSchema } from './validation.js';
import * as ctrl from './controller.js';

/**
 * Subscription plan management under /admin/v1/plans. The parent chain already
 * enforces authenticate + roleGuard(['super_admin']).
 */
const router = Router();

router.get('/', ctrl.list);
router.post('/', validate(createPlanSchema), ctrl.create);
router.patch('/:id', validate(updatePlanSchema), ctrl.update);
router.delete('/:id', ctrl.remove);

export default router;
