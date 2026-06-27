import { Router } from 'express';
import tenantsRouter from './tenants/router.js';

/**
 * Super Admin platform router, mounted at /admin/v1 (no tenant context).
 * Additional sub-routers (plans, billing, dashboard) are added in later sprints.
 */
const router = Router();

router.use('/tenants', tenantsRouter);

export default router;
