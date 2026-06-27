import { Router } from 'express';
import tenantsRouter from './tenants/router.js';
import plansRouter from './plans/router.js';
import dashboardRouter from './dashboard/router.js';

/**
 * Super Admin platform router, mounted at /admin/v1 (no tenant context).
 * The platform dashboard sub-router is added in a later sprint.
 */
const router = Router();

router.use('/tenants', tenantsRouter);
router.use('/plans', plansRouter);
router.use('/dashboard', dashboardRouter);

export default router;
