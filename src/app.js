import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import pinoHttp from 'pino-http';
import swaggerUi from 'swagger-ui-express';
import { buildOpenApiSpec } from './docs/openapi.js';
import { env } from './config/env.js';
import { logger } from './config/logger.js';
import { resolveLanguage } from './middleware/resolveLanguage.js';
import { authenticate } from './middleware/authenticate.js';
import { resolveTenant } from './middleware/resolveTenant.js';
import { subscriptionGuard } from './middleware/subscriptionGuard.js';
import { checkIdempotency } from './middleware/checkIdempotency.js';
import { roleGuard } from './middleware/roleGuard.js';
import { errorHandler } from './middleware/errorHandler.js';
import { notFound } from './middleware/notFound.js';
import adminRouter from './modules/admin/router.js';
import authRouter from './modules/api/auth/router.js';
import apiRouter from './modules/api/router.js';

/**
 * Build the Express app. Kept as a factory so tests can spin up an instance
 * without binding a port.
 *
 * Two router prefixes, never mixed:
 *   /admin/v1  → super_admin only, no tenant context
 *   /api/v1    → tenant-scoped (resolveTenant → subscriptionGuard → idempotency)
 *
 * Public auth routes (e.g. /api/v1/auth/login) are mounted ahead of the
 * authenticated chain when the auth module lands.
 */
export const createApp = () => {
  const app = express();

  app.set('trust proxy', 1);
  app.use(helmet());
  app.use(
    cors({
      origin: [env.FRONTEND_URL, /\.localhost(:\d+)?$/],
      credentials: true,
    })
  );
  app.use(express.json({ limit: '1mb' }));
  app.use(cookieParser());
  app.use(pinoHttp({ logger }));
  app.use(resolveLanguage);

  // Health check — no auth, no tenant context.
  app.get('/health', (req, res) => {
    res.json({ status: 'ok', service: 'dsm-api' });
  });

  // API docs — OpenAPI spec + Swagger UI (import /openapi.json into Postman).
  const openApiSpec = buildOpenApiSpec();
  app.get('/openapi.json', (req, res) => res.json(openApiSpec));
  app.use('/docs', swaggerUi.serve, swaggerUi.setup(openApiSpec));

  // Super Admin platform routes — no tenant context.
  app.use('/admin/v1', authenticate, roleGuard(['super_admin']), adminRouter);

  // Public shop auth routes — must precede the authenticated chain (login issues
  // the first token, so it cannot sit behind authenticate).
  app.use('/api/v1/auth', authRouter);

  // Shop routes — tenant-scoped, subscription-gated, idempotent writes.
  app.use('/api/v1', authenticate, resolveTenant, subscriptionGuard, checkIdempotency, apiRouter);

  app.use(notFound);
  app.use(errorHandler);

  return app;
};
