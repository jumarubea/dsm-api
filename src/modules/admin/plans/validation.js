import { z } from 'zod';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
export const isUuid = (v) => typeof v === 'string' && UUID_RE.test(v);

export const createPlanSchema = z.object({
  name: z.string().trim().min(2).max(80),
  price_tzs: z.coerce.number().nonnegative(),
  billing_cycle: z.enum(['monthly', 'annual']),
  trial_days: z.coerce.number().int().min(0).max(365).optional(),
  max_users: z.coerce.number().int().min(-1),
  max_products: z.coerce.number().int().min(-1),
  features: z.record(z.string(), z.unknown()).optional(),
});

export const updatePlanSchema = z
  .object({
    name: z.string().trim().min(2).max(80).optional(),
    price_tzs: z.coerce.number().nonnegative().optional(),
    billing_cycle: z.enum(['monthly', 'annual']).optional(),
    trial_days: z.coerce.number().int().min(0).max(365).optional(),
    max_users: z.coerce.number().int().min(-1).optional(),
    max_products: z.coerce.number().int().min(-1).optional(),
    features: z.record(z.string(), z.unknown()).optional(),
    is_active: z.boolean().optional(),
  })
  .refine((d) => Object.keys(d).length > 0, 'Hakuna taarifa za kubadilisha.');
