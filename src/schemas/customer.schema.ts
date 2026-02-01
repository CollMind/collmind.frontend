import { z } from 'zod';
import {
  CustomerChannel,
  CustomerType,
  CustomerStatus,
} from '@/types/customer.types';

export const createCustomerSchema = z.object({
  code: z.string().min(1, 'Code is required').max(50),
  name: z.string().min(2, 'Name must be at least 2 characters').max(200),
  channel: z.nativeEnum(CustomerChannel),
  type: z.nativeEnum(CustomerType).optional(),
  status: z.nativeEnum(CustomerStatus).optional(),
  city: z.string().optional(),
  district: z.string().optional(),
  region: z.string().optional(),
  country: z.string().optional(),
  address: z.string().optional(),
  postalCode: z.string().optional(),
  taxNumber: z.string().optional(),
  taxOffice: z.string().optional(),
  companyRegistrationNumber: z.string().optional(),
  contactPerson: z.string().optional(),
  contactEmail: z.string().email('Invalid email').optional().or(z.literal('')),
  contactPhone: z.string().optional(),
  contactMobile: z.string().optional(),
  paymentTerms: z.string().optional(),
  creditLimit: z.number().positive().optional(),
  currency: z.string().optional(),
  salesRepresentative: z.string().optional(),
  accountManager: z.string().optional(),
  customerGroup: z.string().optional(),
  customerSegment: z.string().optional(),
  customerTier: z.string().optional(),
  businessSize: z.string().optional(),
  annualRevenue: z.number().positive().optional(),
  lastOrderDate: z.string().optional(),
  firstOrderDate: z.string().optional(),
  numberOfBranches: z.number().int().min(0, 'Number of branches must be 0 or greater').optional(),
  metadata: z
    .object({
      storeSize: z.number().optional(),
      numberOfEmployees: z.number().optional(),
      numberOfLocations: z.number().optional(),
      industry: z.string().optional(),
      website: z.string().url().optional(),
      socialMedia: z
        .object({
          facebook: z.string().url().optional(),
          instagram: z.string().url().optional(),
          linkedin: z.string().url().optional(),
        })
        .optional(),
    })
    .optional(),
  notes: z.string().optional(),
  isVip: z.boolean().optional(),
  contractStartDate: z.string().optional(),
  contractEndDate: z.string().optional(),
});

export const updateCustomerSchema = createCustomerSchema.partial();

export type CreateCustomerFormData = z.infer<typeof createCustomerSchema>;
export type UpdateCustomerFormData = z.infer<typeof updateCustomerSchema>;

