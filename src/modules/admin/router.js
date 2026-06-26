import { Router } from 'express';

/**
 * Super Admin platform router, mounted at /admin/v1 (no tenant context).
 * Sub-routers (tenants, plans, billing, dashboard) are added in later sprints.
 */
const router = Router();

export default router;
