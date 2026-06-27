/**
 * Minimal app that mounts the REAL middleware chain plus throwaway probe routes.
 * It lets the Module-0 tests exercise authenticate / resolveTenant /
 * subscriptionGuard / checkIdempotency / roleGuard before any domain module
 * (products, sales) exists.
 */
import express from 'express';
import { authenticate } from '../../src/middleware/authenticate.js';
import { resolveTenant } from '../../src/middleware/resolveTenant.js';
import { subscriptionGuard } from '../../src/middleware/subscriptionGuard.js';
import { checkIdempotency } from '../../src/middleware/checkIdempotency.js';
import { roleGuard } from '../../src/middleware/roleGuard.js';
import { errorHandler } from '../../src/middleware/errorHandler.js';
import { notFound } from '../../src/middleware/notFound.js';

export const buildProbeApp = () => {
  const app = express();
  app.set('trust proxy', 1);
  app.use(express.json());

  // Super Admin chain.
  app.use('/admin/v1', authenticate, roleGuard(['super_admin']), (req, res) => {
    res.json({ ok: true, role: req.user.role });
  });

  // Tenant-scoped shop chain.
  const shop = express.Router();
  app.use('/api/v1', authenticate, resolveTenant, subscriptionGuard, checkIdempotency, shop);

  // Proves auth + tenant resolution + JWT/tenant binding.
  shop.get('/whoami', (req, res) => {
    res.json({ tenant_id: req.tenant.id, tenant_slug: req.tenant.slug, role: req.user.role });
  });

  // Write route — exercises subscriptionGuard (402) and checkIdempotency.
  shop.post('/echo', (req, res) => {
    res.status(201).json({ tenant_id: req.tenant.id, idempotencyKey: req.idempotencyKey });
  });

  // Privileged read — exercises roleGuard.
  shop.get('/profit', roleGuard(['shop_admin', 'manager']), (req, res) => {
    res.json({ ok: true });
  });

  app.use(notFound);
  app.use(errorHandler);
  return app;
};
