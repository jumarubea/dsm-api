import { Router } from 'express';
import { roleGuard } from '../../../middleware/roleGuard.js';
import { validate } from '../../../middleware/validate.js';
import { mpesaInitiateSchema } from '../sales/validation.js';
import * as ctrl from './controller.js';

/**
 * M-Pesa (Vodacom Tanzania) under /api/v1/payments. Parent chain applies
 * authenticate → resolveTenant → subscriptionGuard → checkIdempotency.
 * Runs in manual mode until live integration is enabled.
 */
const router = Router();

const SELL = ['sales_attendant', 'manager', 'shop_admin'];

router.post('/mpesa/initiate', roleGuard(SELL), validate(mpesaInitiateSchema), ctrl.initiate);
router.get('/mpesa/status/:saleId', roleGuard(SELL), ctrl.status);

export default router;
