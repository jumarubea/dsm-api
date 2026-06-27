import { z } from 'zod';

export const stockInSchema = z.object({
  product_id: z.uuid(),
  quantity: z.coerce.number().int().positive(),
  unit_cost: z.coerce.number().nonnegative().optional(),
  reason: z.string().trim().max(200).optional(),
});

export const adjustmentSchema = z.object({
  product_id: z.uuid(),
  quantity: z.coerce
    .number()
    .int()
    .refine((n) => n !== 0, 'Kiasi lazima kisiwe sifuri.'),
  reason: z.string().trim().min(2).max(200),
});
