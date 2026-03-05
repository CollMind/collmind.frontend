import { z } from 'zod';

export const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(4, 'Password must be at least 4 characters'),
  ipAddress: z.string().ip().optional(),
});

export type LoginFormData = z.infer<typeof loginSchema>;

