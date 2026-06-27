import { z } from 'zod';
import dotenv from 'dotenv';

dotenv.config();

const isProd = process.env.NODE_ENV === 'production';

// External-integration credentials are mandatory in production but optional in
// development/test, so the app can boot before M-Pesa / email onboarding finishes.
const requiredInProd = (schema) => (isProd ? schema : schema.optional());

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(3000),
  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),
  JWT_SECRET: z.string().min(16, 'JWT_SECRET must be at least 16 characters'),
  JWT_REFRESH_SECRET: z.string().min(16, 'JWT_REFRESH_SECRET must be at least 16 characters'),
  JWT_EXPIRES_IN: z.string().default('8h'),
  JWT_REFRESH_EXPIRES_IN: z.string().default('7d'),
  FRONTEND_URL: z.url().default('http://localhost:5173'),
  MPESA_API_KEY: requiredInProd(z.string().min(1)),
  MPESA_SERVICE_PROVIDER_CODE: requiredInProd(z.string().min(1)),
  MPESA_LIVE: z.string().optional(),
  EMAIL_SERVICE_API_KEY: requiredInProd(z.string().min(1)),
  EMAIL_FROM_ADDRESS: requiredInProd(z.email()),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  const issues = parsed.error.issues.map((i) => `  - ${i.path.join('.')}: ${i.message}`).join('\n');
  // eslint-disable-next-line no-console
  console.error(`\nInvalid environment configuration:\n${issues}\n`);
  process.exit(1);
}

export const env = parsed.data;
export const isProduction = env.NODE_ENV === 'production';
export const isTest = env.NODE_ENV === 'test';

// Live Vodacom M-Pesa integration is on only when an API key is present AND
// explicitly enabled. Otherwise payments run in manual/external mode.
export const mpesaLive = Boolean(env.MPESA_API_KEY) && env.MPESA_LIVE === 'true';
