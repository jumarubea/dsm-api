import { Router } from 'express';
import { roleGuard } from '../../../middleware/roleGuard.js';
import { validate } from '../../../middleware/validate.js';
import {
  createSaleSchema,
  confirmPaymentSchema,
  voidSchema,
  orderStatusSchema,
} from './validation.js';
import * as ctrl from './controller.js';

/**
 * Sales under /api/v1/sales. Parent chain applies authenticate → resolveTenant →
 * subscriptionGuard → checkIdempotency. Attendant+ can sell; Manager+ can void
 * and advance order status.
 */
const router = Router();

const SELL = ['sales_attendant', 'manager', 'shop_admin'];
const MANAGE = ['manager', 'shop_admin'];

router.get('/', ctrl.list);
router.post('/', roleGuard(SELL), validate(createSaleSchema), ctrl.create);
router.get('/:id', ctrl.detail);
router.get('/:id/receipt', ctrl.receipt);
router.post(
  '/:id/confirm-payment',
  roleGuard(SELL),
  validate(confirmPaymentSchema),
  ctrl.confirmPayment
);
router.patch('/:id/status', roleGuard(MANAGE), validate(orderStatusSchema), ctrl.updateOrderStatus);
router.post('/:id/void', roleGuard(MANAGE), validate(voidSchema), ctrl.voidSale);

export default router;
