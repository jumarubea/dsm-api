import { Router } from 'express';
import { validate } from '../../../middleware/validate.js';
import { createTenantSchema, updateTenantSchema, billingEventSchema } from './validation.js';
import * as ctrl from './controller.js';

/**
 * Super Admin tenant management. Mounted under /admin/v1/tenants — the parent
 * chain already enforces authenticate + roleGuard(['super_admin']).
 */
const router = Router();

router.get('/', ctrl.list);
router.post('/', validate(createTenantSchema), ctrl.create);
router.get('/:id', ctrl.detail);
router.patch('/:id', validate(updateTenantSchema), ctrl.update);
router.post('/:id/suspend', ctrl.suspend);
router.post('/:id/activate', ctrl.activate);
router.delete('/:id', ctrl.remove);
router.post('/:id/impersonate', ctrl.impersonate);
router.get('/:id/billing', ctrl.listBilling);
router.post('/:id/billing', validate(billingEventSchema), ctrl.recordBilling);

export default router;
