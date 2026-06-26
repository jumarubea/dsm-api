import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import pinoHttp from 'pino-http';
import { env } from './config/env.js';
import { logger } from './config/logger.js';
import { errorHandler } from './middleware/errorHandler.js';
import { notFound } from './middleware/notFound.js';
import adminRouter from './modules/admin/router.js';
import apiRouter from './modules/api/router.js';

/**
 * Build the Express app. Kept as a factory so tests can spin up an instance
 * without binding a port.
 *
 * The two router prefixes are mounted here. Their middleware chains
 * (authenticate, resolveTenant, subscriptionGuard, roleGuard) are wired in the
 * feat/middleware work — do not mix shop routes onto /admin/v1 or vice versa.
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

  // Health check — no auth, no tenant context.
  app.get('/health', (req, res) => {
    res.json({ status: 'ok', service: 'dsm-api' });
  });

  app.use('/admin/v1', adminRouter);
  app.use('/api/v1', apiRouter);

  app.use(notFound);
  app.use(errorHandler);

  return app;
};
