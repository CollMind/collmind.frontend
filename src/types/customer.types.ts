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
  numberOfBranches?: number;
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
  numberOfBranches?: number;
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

export enum ImportErrorType {
  MISSING_FIELD = 'MISSING_FIELD',
  INVALID_DATE = 'INVALID_DATE',
  INVALID_AMOUNT = 'INVALID_AMOUNT',
  ALREADY_EXISTS = 'ALREADY_EXISTS',
  DUPLICATE_IN_FILE = 'DUPLICATE_IN_FILE',
  DATABASE_ERROR = 'DATABASE_ERROR',
  INVALID_EMAIL = 'INVALID_EMAIL',
}

export interface ImportError {
  row: number;
  code: string;
  error_type: ImportErrorType;
  error_message: string;
  original_row_data?: Record<string, any>;
}

export interface ImportResult {
  total: number;
  created: number;
  skipped: number;
  errors: ImportError[];
}
