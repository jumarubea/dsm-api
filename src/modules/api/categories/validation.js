import { z } from 'zod';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export const isUuid = (v) => typeof v === 'string' && UUID_RE.test(v);

export const createCategorySchema = z.object({
  name: z.string().trim().min(2).max(120),
});

export const updateCategorySchema = z
  .object({
    name: z.string().trim().min(2).max(120).optional(),
  })
  .refine((d) => Object.keys(d).length > 0, 'Hakuna taarifa za kubadilisha.');
