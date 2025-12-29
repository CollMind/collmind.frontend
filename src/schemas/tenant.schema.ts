import { z } from 'zod';
import { TenantStatus, TenantPlan } from '@/types/tenant.types';

export const createTenantSchema = z.object({
  name: z.string().min(3, 'Name must be at least 3 characters').max(200),
  domain: z.string().max(100).optional(),
  status: z.nativeEnum(TenantStatus).optional(),
  plan: z.nativeEnum(TenantPlan).optional(),
  contactEmail: z.string().email('Invalid email').optional().or(z.literal('')),
  contactPhone: z.string().optional(),
  contactPerson: z.string().optional(),
  address: z.string().optional(),
  city: z.string().optional(),
  country: z.string().optional(),
  postalCode: z.string().optional(),
  taxNumber: z.string().optional(),
  industry: z.string().optional(),
  settings: z
    .object({
      defaultCurrency: z.string().optional(),
      fiscalYearStart: z.string().optional(),
      timezone: z.string().optional(),
      dateFormat: z.string().optional(),
      numberFormat: z.string().optional(),
    })
    .optional(),
  maxUsers: z.number().min(1, 'Max users must be at least 1').optional(),
  maxStorageGB: z.number().min(1, 'Max storage must be at least 1').optional(),
  subscriptionStartDate: z.string().optional(),
  subscriptionEndDate: z.string().optional(),
  notes: z.string().optional(),
});

export const updateTenantSchema = createTenantSchema.partial();

export type CreateTenantFormData = z.infer<typeof createTenantSchema>;
export type UpdateTenantFormData = z.infer<typeof updateTenantSchema>;

