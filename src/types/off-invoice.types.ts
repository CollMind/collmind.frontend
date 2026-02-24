export interface AgreementTransaction {
  id: string;
  agreementId: string;
  invoiceNo: string;
  invoiceDate: string; // ISO date string
  fiscalPeriod?: string; // YYYY-MM format (used for budget deduction)
  amount: number;
  currency: string;
  cplId?: string;
  batchId?: string;
  rowNumber?: number;
  idempotencyKey: string;
  notes?: string;
  metadata?: Record<string, any>;
  createdAt: string;
  updatedAt: string;
  createdBy?: string;
  updatedBy?: string;
  tenantId: string;
  // Relations
  agreement?: {
    id: string;
    agreementCode: string;
    agreementName?: string;
    cplId: string;
    channelId: string;
    fuId: string;
    cpl?: {
      id: string;
      code: string;
      name: string;
    };
  };
  customer?: {
    id: string;
    code: string;
    name: string;
  };
}

export interface CreateOffInvoiceTransactionDto {
  agreementId: string;
  invoiceNo: string;
  invoiceDate: string; // YYYY-MM-DD
  fiscalPeriod?: string; // YYYY-MM format (used for budget deduction)
  amount: number;
  currency?: string;
  notes?: string;
}

export interface BatchImportDto {
  transactions: CreateOffInvoiceTransactionDto[];
  batchId?: string;
}

export interface BatchImportResult {
  batchId: string;
  totalRows: number;
  successCount: number;
  errorCount: number;
  errors: Array<{
    rowNumber: number;
    invoiceNo: string;
    error: string;
  }>;
  createdTransactions: string[];
}

export interface ValidationError {
  rowNumber: number;
  field?: string;
  severity: 'ERROR' | 'WARNING';
  message: string;
  originalRowData?: Record<string, any>;
}

export interface ValidationResult {
  rowNumber: number;
  isValid: boolean;
  errors: ValidationError[];
  warnings: ValidationError[];
  agreementId?: string;
  invoiceNo?: string;
}

export interface UploadFileResponse {
  totalRows: number;
  validCount: number;
  invalidCount: number;
  warningCount: number;
  validRows: Array<CreateOffInvoiceTransactionDto & { rowNumber: number; fiscalPeriod?: string }>;
  invalidRows: Array<CreateOffInvoiceTransactionDto & { rowNumber: number; errors: ValidationError[]; warnings: ValidationError[]; fiscalPeriod?: string }>;
  warningRows: Array<CreateOffInvoiceTransactionDto & { rowNumber: number; warnings: ValidationError[]; fiscalPeriod?: string }>;
  summary: {
    totalAmount: number;
    affectedAgreements: number;
  };
}

export interface TransactionSummary {
  today: {
    count: number;
    amount: number;
  };
  pending: {
    count: number;
    amount: number;
  };
  total: {
    count: number;
    amount: number;
    records: number;
  };
  offInvoiceShare: {
    off: {
      count: number;
      amount: number;
      percentage: number;
    };
    on: {
      count: number;
      amount: number;
      percentage: number;
    };
  };
}
