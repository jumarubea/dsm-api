import { z } from 'zod';

const RESERVED_SLUGS = ['www', 'app', 'admin', 'api'];
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export const isUuid = (v) => typeof v === 'string' && UUID_RE.test(v);

export const createTenantSchema = z.object({
  name: z.string().trim().min(2).max(150),
  slug: z
    .string()
    .trim()
    .toLowerCase()
    .min(2)
    .max(80)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Slug lazima iwe herufi ndogo, namba na vistari.')
    .refine((s) => !RESERVED_SLUGS.includes(s), 'Slug hii imehifadhiwa.'),
  owner_email: z.email().max(255),
  plan_id: z.uuid(),
  trial_days: z.coerce.number().int().min(0).max(365).optional(),
});

export const updateTenantSchema = z
  .object({
    name: z.string().trim().min(2).max(150).optional(),
    status: z.enum(['active', 'trialing', 'past_due', 'suspended', 'cancelled']).optional(),
    plan_id: z.uuid().optional(),
  })
  .refine((d) => Object.keys(d).length > 0, 'Hakuna taarifa za kubadilisha.');
