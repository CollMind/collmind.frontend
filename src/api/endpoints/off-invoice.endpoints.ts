import apiClient from '../client';
import { AgreementTransaction } from '@/types/off-invoice.types';

export interface CreateOffInvoiceTransactionDto {
  agreementId: string;
  invoiceNo: string;
  invoiceDate: string; // YYYY-MM-DD
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
  validRows: Array<
    CreateOffInvoiceTransactionDto & {
      rowNumber: number;
      fiscalPeriod?: string;
    }
  >;
  invalidRows: Array<
    CreateOffInvoiceTransactionDto & {
      rowNumber: number;
      errors: ValidationError[];
      warnings: ValidationError[];
      fiscalPeriod?: string;
    }
  >;
  warningRows: Array<
    CreateOffInvoiceTransactionDto & {
      rowNumber: number;
      warnings: ValidationError[];
      fiscalPeriod?: string;
    }
  >;
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

export const offInvoiceEndpoints = {
  /**
   * Upload Off-Invoice file (Excel/CSV) and validate
   */
  uploadFile: async (file: File): Promise<UploadFileResponse> => {
    const formData = new FormData();
    formData.append('file', file);

    const response = await apiClient.post<UploadFileResponse>(
      '/agreement-transactions/upload',
      formData,
      {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      }
    );
    return response.data;
  },

  /**
   * Validate and import validated rows
   */
  validateAndImport: async (
    rows: CreateOffInvoiceTransactionDto[],
    batchId?: string
  ): Promise<BatchImportResult> => {
    const response = await apiClient.post<BatchImportResult>(
      '/agreement-transactions/validate-and-import',
      { rows, batchId }
    );
    return response.data;
  },

  /**
   * Download Excel template
   */
  downloadExcelTemplate: async (): Promise<Blob> => {
    const response = await apiClient.get(
      '/agreement-transactions/template/excel',
      {
        responseType: 'blob',
      }
    );
    return response.data;
  },

  /**
   * Download CSV template
   */
  downloadCSVTemplate: async (): Promise<Blob> => {
    const response = await apiClient.get(
      '/agreement-transactions/template/csv',
      {
        responseType: 'blob',
      }
    );
    return response.data;
  },

  /**
   * Get all transactions with filters
   */
  getTransactions: async (filters?: {
    agreementId?: string;
    batchId?: string;
    invoiceDateFrom?: string;
    invoiceDateTo?: string;
    cplId?: string;
    status?: string;
  }): Promise<AgreementTransaction[]> => {
    const response = await apiClient.get<AgreementTransaction[]>(
      '/agreement-transactions',
      { params: filters }
    );
    return response.data;
  },

  /**
   * Get transaction by ID
   */
  getTransaction: async (id: string): Promise<AgreementTransaction> => {
    const response = await apiClient.get<AgreementTransaction>(
      `/agreement-transactions/${id}`
    );
    return response.data;
  },

  /**
   * Get transactions by agreement ID
   */
  getTransactionsByAgreement: async (
    agreementId: string
  ): Promise<AgreementTransaction[]> => {
    const response = await apiClient.get<AgreementTransaction[]>(
      `/agreement-transactions/agreement/${agreementId}`
    );
    return response.data;
  },

  /**
   * Get transactions by batch ID
   */
  getTransactionsByBatch: async (
    batchId: string
  ): Promise<AgreementTransaction[]> => {
    const response = await apiClient.get<AgreementTransaction[]>(
      `/agreement-transactions/batch/${batchId}`
    );
    return response.data;
  },

  /**
   * Get transaction statistics summary
   */
  getSummary: async (filters?: {
    invoiceDateFrom?: string;
    invoiceDateTo?: string;
  }): Promise<TransactionSummary> => {
    const response = await apiClient.get<TransactionSummary>(
      '/agreement-transactions/stats/summary',
      { params: filters }
    );
    return response.data;
  },

  /**
   * Get total transaction amount for agreement
   */
  getTotalByAgreement: async (agreementId: string): Promise<number> => {
    const response = await apiClient.get<{
      agreementId: string;
      total: number;
    }>(`/agreement-transactions/agreement/${agreementId}/total`);
    return response.data.total;
  },

  /**
   * Get budget impact for agreement and fiscal period
   */
  getBudgetImpact: async (
    agreementId: string,
    fiscalPeriod: string
  ): Promise<{
    envelope: {
      id: string;
      code: string;
      channel: string;
      category?: string;
      period: string;
      availableAmount: number;
    } | null;
    currentAvailable: number;
    channel: string;
    category?: string;
    period: string;
  }> => {
    const response = await apiClient.get(
      `/agreement-transactions/budget-impact/${agreementId}`,
      { params: { fiscalPeriod } }
    );
    return response.data;
  },

  /**
   * Create single transaction
   */
  createTransaction: async (
    dto: CreateOffInvoiceTransactionDto
  ): Promise<AgreementTransaction> => {
    const response = await apiClient.post<AgreementTransaction>(
      '/agreement-transactions',
      dto
    );
    return response.data;
  },

  /**
   * Get total count of off-invoice transactions
   */
  getCount: async (): Promise<number> => {
    const response = await apiClient.get<{ count: number }>(
      '/agreement-transactions/count'
    );
    return response.data.count;
  },
};
