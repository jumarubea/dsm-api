import { Router } from 'express';
import usersRouter from './users/router.js';
import categoriesRouter from './categories/router.js';
import productsRouter from './products/router.js';
import inventoryRouter from './inventory/router.js';
import notificationsRouter from './notifications/router.js';

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

export default router;
