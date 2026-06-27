import { Router } from 'express';
import { roleGuard } from '../../../middleware/roleGuard.js';
import { validate } from '../../../middleware/validate.js';
import { createCustomerSchema, updateCustomerSchema } from './validation.js';
import * as ctrl from './controller.js';

/**
 * Customers under /api/v1/customers. Parent chain applies authenticate →
 * resolveTenant → subscriptionGuard → checkIdempotency. Reads are open to any
 * authenticated role; writes are Attendant+.
 */
const router = Router();

const WRITE = ['sales_attendant', 'manager', 'shop_admin'];

router.get('/', ctrl.list);
router.post('/', roleGuard(WRITE), validate(createCustomerSchema), ctrl.create);
router.get('/:id', ctrl.detail);
router.get('/:id/history', ctrl.history);
router.patch('/:id', roleGuard(WRITE), validate(updateCustomerSchema), ctrl.update);

export default router;
