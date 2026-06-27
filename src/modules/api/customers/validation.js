import { z } from 'zod';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
export const isUuid = (v) => typeof v === 'string' && UUID_RE.test(v);

export const createCustomerSchema = z.object({
  name: z.string().trim().min(2).max(150),
  phone: z.string().trim().min(5).max(30).optional(),
  email: z.email().max(255).optional(),
  address: z.string().trim().max(500).optional(),
});

export const updateCustomerSchema = z
  .object({
    name: z.string().trim().min(2).max(150).optional(),
    phone: z.string().trim().min(5).max(30).optional(),
    email: z.email().max(255).optional(),
    address: z.string().trim().max(500).optional(),
  })
  .refine((d) => Object.keys(d).length > 0, 'Hakuna taarifa za kubadilisha.');
