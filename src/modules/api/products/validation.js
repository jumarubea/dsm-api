import { z } from 'zod';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export const isUuid = (v) => typeof v === 'string' && UUID_RE.test(v);

// stock_qty is intentionally NOT accepted — it is maintained only by the
// stock_movements trigger (Inventory module).
export const createProductSchema = z.object({
  name: z.string().trim().min(1).max(200),
  sku: z.string().trim().min(1).max(80).optional(),
  category_id: z.uuid(),
  unit_of_measure: z.string().trim().min(1).max(40),
  retail_price: z.coerce.number().nonnegative(),
  wholesale_price: z.coerce.number().nonnegative(),
  cost_price: z.coerce.number().nonnegative(),
  min_stock_level: z.coerce.number().int().nonnegative().optional(),
  dead_stock_days: z.coerce.number().int().positive().optional(),
});

export const updateProductSchema = z
  .object({
    name: z.string().trim().min(1).max(200).optional(),
    sku: z.string().trim().min(1).max(80).optional(),
    category_id: z.uuid().optional(),
    unit_of_measure: z.string().trim().min(1).max(40).optional(),
    retail_price: z.coerce.number().nonnegative().optional(),
    wholesale_price: z.coerce.number().nonnegative().optional(),
    cost_price: z.coerce.number().nonnegative().optional(),
    min_stock_level: z.coerce.number().int().nonnegative().optional(),
    dead_stock_days: z.coerce.number().int().positive().optional(),
    is_active: z.boolean().optional(),
  })
  .refine((d) => Object.keys(d).length > 0, 'Hakuna taarifa za kubadilisha.');

export const pricingRuleSchema = z.object({
  min_qty: z.coerce.number().int().positive(),
  price_type: z.enum(['retail', 'wholesale']),
});
