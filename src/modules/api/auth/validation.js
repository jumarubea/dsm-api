import { z } from 'zod';

export const loginSchema = z.object({
  email: z.email().max(255),
  password: z.string().min(1).max(100),
});

export const registerSchema = z.object({
  shop_name: z.string().trim().min(2).max(120),
  owner_name: z.string().trim().min(2).max(120),
  email: z.email().max(255),
  password: z.string().min(8, 'Nenosiri liwe na herufi 8 au zaidi.').max(100),
  plan_id: z.uuid(),
});
