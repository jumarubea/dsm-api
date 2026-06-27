import { z } from 'zod';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const SHOP_ROLES = ['shop_admin', 'manager', 'sales_attendant', 'store_keeper'];

export const isUuid = (v) => typeof v === 'string' && UUID_RE.test(v);

export const createUserSchema = z.object({
  name: z.string().trim().min(2).max(120),
  email: z.email().max(255),
  password: z.string().min(8).max(100),
  role: z.enum(SHOP_ROLES),
  language_preference: z.enum(['en', 'sw']).optional(),
});

export const updateUserSchema = z
  .object({
    name: z.string().trim().min(2).max(120).optional(),
    role: z.enum(SHOP_ROLES).optional(),
    is_active: z.boolean().optional(),
    language_preference: z.enum(['en', 'sw']).optional(),
  })
  .refine((d) => Object.keys(d).length > 0, 'Hakuna taarifa za kubadilisha.');

export const languageSchema = z.object({ language_preference: z.enum(['en', 'sw']) });
