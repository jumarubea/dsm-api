import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    globalSetup: './tests/globalSetup.js',
    // Generous timeout: many tests do bcrypt-heavy tenant/user creation in parallel.
    testTimeout: 20000,
    hookTimeout: 20000,
    env: {
      NODE_ENV: 'test',
      DATABASE_URL: process.env.TEST_DATABASE_URL || 'postgres://localhost:5432/dsm_test',
      JWT_SECRET: 'test_jwt_secret_at_least_16_chars',
      JWT_REFRESH_SECRET: 'test_jwt_refresh_secret_min_16_chars',
    },
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov'],
      include: ['src/**/*.js'],
    },
  },
});
