import { Router } from 'express';
import * as ctrl from './controller.js';

/**
 * Super Admin platform dashboard under /admin/v1/dashboard. The parent chain
 * already enforces authenticate + roleGuard(['super_admin']).
 */
const router = Router();

router.get('/', ctrl.summary);
router.get('/tenants-health', ctrl.tenantsHealth);

export default router;
