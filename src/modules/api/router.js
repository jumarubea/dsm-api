import { Router } from 'express';
import usersRouter from './users/router.js';
import categoriesRouter from './categories/router.js';
import productsRouter from './products/router.js';
import inventoryRouter from './inventory/router.js';
import notificationsRouter from './notifications/router.js';
import salesRouter from './sales/router.js';
import paymentsRouter from './payments/router.js';
import customersRouter from './customers/router.js';
import dashboardRouter from './dashboard/router.js';
import reportsRouter from './reports/router.js';
import subscriptionRouter from './subscription/router.js';

/**
 * Tenant-scoped shop router, mounted at /api/v1 behind the authenticated chain.
 * Additional sub-routers (sales, customers, ...) are added in later sprints.
 */
const router = Router();

router.use('/users', usersRouter);
router.use('/categories', categoriesRouter);
router.use('/products', productsRouter);
router.use('/inventory', inventoryRouter);
router.use('/notifications', notificationsRouter);
router.use('/sales', salesRouter);
router.use('/payments', paymentsRouter);
router.use('/customers', customersRouter);
router.use('/dashboard', dashboardRouter);
router.use('/reports', reportsRouter);
router.use('/subscription', subscriptionRouter);

export default router;
