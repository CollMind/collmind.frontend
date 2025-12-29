export enum CustomerChannel {
  NKA = 'NKA',
  TRADITIONAL_TRADE = 'TRADITIONAL_TRADE',
  E_COMMERCE = 'E_COMMERCE',
  EXPORT = 'EXPORT',
  WHOLESALE = 'WHOLESALE',
  RETAIL = 'RETAIL',
  HORECA = 'HORECA',
}

export enum CustomerStatus {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
  PENDING = 'PENDING',
  SUSPENDED = 'SUSPENDED',
}

export enum CustomerType {
  DIRECT = 'DIRECT',
  DISTRIBUTOR = 'DISTRIBUTOR',
  WHOLESALER = 'WHOLESALER',
  RETAILER = 'RETAILER',
  END_CUSTOMER = 'END_CUSTOMER',
}

export interface Customer {
  id: string;
  code: string;
  name: string;
  channel: CustomerChannel;
  type: CustomerType;
  status: CustomerStatus;
  city?: string;
  district?: string;
  region?: string;
  country?: string;
  contactPerson?: string;
  contactEmail?: string;
  contactPhone?: string;
  customerTier?: string;
  isVip: boolean;
  tenantId: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateCustomerDto {
  code: string;
  name: string;
  channel: CustomerChannel;
  type?: CustomerType;
  status?: CustomerStatus;
  city?: string;
  district?: string;
  region?: string;
  country?: string;
  address?: string;
  postalCode?: string;
  taxNumber?: string;
  taxOffice?: string;
  companyRegistrationNumber?: string;
  contactPerson?: string;
  contactEmail?: string;
  contactPhone?: string;
  contactMobile?: string;
  paymentTerms?: string;
  creditLimit?: number;
  currency?: string;
  salesRepresentative?: string;
  accountManager?: string;
  customerGroup?: string;
  customerSegment?: string;
  customerTier?: string;
  businessSize?: string;
  annualRevenue?: number;
  lastOrderDate?: string;
  firstOrderDate?: string;
  metadata?: {
    storeSize?: number;
    numberOfEmployees?: number;
    numberOfLocations?: number;
    industry?: string;
    website?: string;
    socialMedia?: {
      facebook?: string;
      instagram?: string;
      linkedin?: string;
    };
  };
  notes?: string;
  isVip?: boolean;
  contractStartDate?: string;
  contractEndDate?: string;
}

export interface UpdateCustomerDto extends Partial<CreateCustomerDto> {}

export interface CustomerFilterDto {
  channel?: CustomerChannel;
  city?: string;
  region?: string;
  status?: CustomerStatus;
  tier?: string;
  isVip?: boolean;
  search?: string;
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'ASC' | 'DESC';
}

