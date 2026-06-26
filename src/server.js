import { createApp } from './app.js';
import { env } from './config/env.js';
import { logger } from './config/logger.js';
import { verifyConnection, closePool } from './config/db.js';

const start = async () => {
  try {
    await verifyConnection();
  } catch (err) {
    logger.error({ err }, 'Failed to connect to PostgreSQL — refusing to start');
    process.exit(1);
  }

  const app = createApp();
  const server = app.listen(env.PORT, () => {
    logger.info(`dsm-api listening on port ${env.PORT} (${env.NODE_ENV})`);
  });

  const shutdown = (signal) => {
    logger.info(`${signal} received — shutting down gracefully`);
    server.close(async () => {
      await closePool();
      process.exit(0);
    });
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
};

start();
