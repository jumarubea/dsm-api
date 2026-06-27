import { Router } from 'express';
import usersRouter from './users/router.js';

/**
 * Tenant-scoped shop router, mounted at /api/v1 behind the authenticated chain.
 * Additional sub-routers (products, sales, ...) are added in later sprints.
 */
const router = Router();

router.use('/users', usersRouter);

export default router;
