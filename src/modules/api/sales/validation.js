import { z } from 'zod';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
export const isUuid = (v) => typeof v === 'string' && UUID_RE.test(v);

export const createSaleSchema = z
  .object({
    type: z.enum(['SALE', 'ORDER']).default('SALE'),
    customer_id: z.uuid().optional(),
    payment_method: z.enum(['cash', 'mpesa', 'airtel']),
    payment_reference: z.string().trim().max(100).optional(),
    delivery_address: z.string().trim().max(500).optional(),
    expected_delivery_at: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, 'Tarehe lazima iwe YYYY-MM-DD.')
      .optional(),
    items: z
      .array(
        z.object({
          product_id: z.uuid(),
          quantity: z.coerce.number().int().positive(),
        })
      )
      .min(1, 'Lazima kuwe na bidhaa angalau moja.'),
  })
  .refine((d) => d.type !== 'ORDER' || !!d.delivery_address, {
    message: 'Oda ya usafirishaji inahitaji anwani ya kufikisha.',
    path: ['delivery_address'],
  });

export const confirmPaymentSchema = z.object({
  method: z.enum(['cash', 'mpesa', 'airtel']).optional(),
  reference: z.string().trim().max(100).optional(),
});

export const voidSchema = z.object({
  reason: z.string().trim().min(2).max(500),
});

export const orderStatusSchema = z.object({
  status: z.enum(['PREPARED', 'DELIVERED']),
});

export const mpesaInitiateSchema = z.object({
  sale_id: z.uuid(),
  phone: z.string().trim().min(9).max(15),
  amount: z.coerce.number().positive(),
});
