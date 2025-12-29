export enum TenantStatus {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
  SUSPENDED = 'SUSPENDED',
  TRIAL = 'TRIAL',
}

export enum TenantPlan {
  FREE = 'FREE',
  BASIC = 'BASIC',
  PROFESSIONAL = 'PROFESSIONAL',
  ENTERPRISE = 'ENTERPRISE',
}

export interface Tenant {
  id: string;
  name: string;
  domain?: string;
  status: TenantStatus;
  plan: TenantPlan;
  contactEmail?: string;
  contactPhone?: string;
  contactPerson?: string;
  city?: string;
  country?: string;
  industry?: string;
  maxUsers: number;
  maxStorageGB: number;
  currentStorageGB: number;
  subscriptionStartDate?: Date;
  subscriptionEndDate?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateTenantDto {
  name: string;
  domain?: string;
  status?: TenantStatus;
  plan?: TenantPlan;
  contactEmail?: string;
  contactPhone?: string;
  contactPerson?: string;
  address?: string;
  city?: string;
  country?: string;
  postalCode?: string;
  taxNumber?: string;
  industry?: string;
  settings?: {
    defaultCurrency?: string;
    fiscalYearStart?: string;
    timezone?: string;
    dateFormat?: string;
    numberFormat?: string;
  };
  maxUsers?: number;
  maxStorageGB?: number;
  subscriptionStartDate?: string;
  subscriptionEndDate?: string;
  notes?: string;
}

export interface UpdateTenantDto extends Partial<CreateTenantDto> {}

