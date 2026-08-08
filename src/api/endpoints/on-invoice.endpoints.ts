import apiClient from '../client';

export interface CreateOnInvoiceEntryDto {
  customerCode: string;
  invoiceNo: string;
  invoiceDate: string; // YYYY-MM-DD
  fiscalPeriod: string; // YYYY-MM
  skuCode: string;
  quantity: number;
  listPrice: number;
  actualPrice: number;
  discount: number;
  discountType: 'CPP_ON' | 'LTA_ON' | 'PROMO_DISCOUNT';
  currency?: string;
}

export interface UploadFileResponse {
  batchId: string;
  totalRows: number;
  validation: ValidationResponseDto;
}

export interface ValidationResponseDto {
  lineAnalysis: {
    total: number;
    valid: number;
    errors: number;
  };
  financialSummary: {
    totalDiscount: number;
  };
  discountDistribution: {
    cppOnInvoice?: { amount: number; percentage: number };
    ltaOnInvoice?: { amount: number; percentage: number };
    promoDiscount?: { amount: number; percentage: number };
  };
  // T-098: null when the envelope's figures could not be read. NOT zero —
  // formatCurrency(null) renders ₺0,00, which is exactly the disguise the backend
  // change removed, so these must be branched on before being formatted.
  budgetImpact: Array<{
    envelopeCode: string;
    current: number | null;
    thisUpload: number;
    after: number | null;
    status: 'GREEN' | 'AMBER' | 'RED' | null;
    // Optional on purpose: rows persisted before T-098 have no dataStatus.
    // `isUnreadable` below is what makes an absent one read as unknown rather
    // than as 'ok' — this type only records that it can be absent.
    dataStatus?: 'ok' | 'unavailable';
  }>;
  // T-098: envelopes whose figures could not be computed. Counted separately from
  // criticalEnvelopesCount — an unreadable envelope is not a finding.
  //
  // The UI does NOT render this number; it counts with `isUnreadable` so the count
  // and the rows come from one predicate. A count from here and cells from there
  // could disagree, and the disagreement would be invisible.
  unreadableEnvelopesCount?: number;
  errors: Array<{
    rowNumber: number;
    field?: string;
    message: string;
  }>;
  criticalEnvelopesCount: number;
  // T-101: where the RAG thresholds behind `status` came from. When this is not
  // 'config', every row's `status` is null — RED means "breaches YOUR threshold"
  // and that is not something we can say about a default nobody chose.
  thresholdSource?: 'config' | 'default' | 'unavailable';
  thresholdReason?: string;
}

export interface CompletionResponseDto {
  batchId: string;
  uploadedRecords: number;
  totalDiscount: number;
  affectedEnvelopes: number;
}

export interface OnInvoiceBatch {
  id: string;
  batchCode: string;
  status:
    | 'PENDING'
    | 'VALIDATING'
    | 'VALIDATED'
    | 'PROCESSING'
    | 'COMPLETED'
    | 'FAILED';
  fiscalPeriod: string;
  totalRows: number;
  validRows: number;
  errorRows: number;
  totalDiscountAmount: number;
  affectedEnvelopesCount: number;
  fileName?: string;
  fileSize?: number;
  validationSummary?: ValidationResponseDto;
  createdAt: string;
  updatedAt: string;
}

export interface OnInvoiceEntry {
  id: string;
  batchId: string;
  invoiceNo: string;
  invoiceDate: string; // ISO date string
  fiscalPeriod: string; // YYYY-MM
  customerId: string;
  customerCode: string;
  skuId: string;
  skuCode: string;
  quantity: number;
  listPrice: number;
  actualPrice: number;
  discount: number;
  discountType: 'CPP_ON' | 'LTA_ON' | 'PROMO_DISCOUNT';
  currency: string;
  status: 'PENDING' | 'VALIDATED' | 'POSTED' | 'ERROR';
  validationStatus?: string;
  validationErrors?: Array<{
    field?: string;
    message: string;
    severity: 'ERROR' | 'WARNING';
  }>;
  rowNumber: number;
  budgetEnvelopeId?: string;
  idempotencyKey: string;
  metadata?: Record<string, any>;
  createdAt: string;
  updatedAt: string;
  // Relations
  customer?: {
    id: string;
    code: string;
    name: string;
  };
  sku?: {
    id: string;
    code: string;
    name: string;
  };
  batch?: {
    id: string;
    batchCode: string;
    fileName?: string;
  };
}

export const onInvoiceEndpoints = {
  /**
   * Adım 1: Upload file and validate
   */
  uploadFile: async (file: File): Promise<UploadFileResponse> => {
    const formData = new FormData();
    formData.append('file', file);

    const response = await apiClient.post<UploadFileResponse>(
      '/on-invoice/upload',
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
   * Adım 2: Validate batch (if needed separately)
   */
  validateBatch: async (batchId: string): Promise<ValidationResponseDto> => {
    const response = await apiClient.post<ValidationResponseDto>(
      `/on-invoice/${batchId}/validate`
    );
    return response.data;
  },

  /**
   * Adım 3: Process batch
   */
  processBatch: async (batchId: string): Promise<CompletionResponseDto> => {
    const response = await apiClient.post<CompletionResponseDto>(
      `/on-invoice/${batchId}/process`
    );
    return response.data;
  },

  /**
   * Get batch by ID
   */
  getBatch: async (batchId: string): Promise<OnInvoiceBatch> => {
    const response = await apiClient.get<OnInvoiceBatch>(
      `/on-invoice/batch/${batchId}`
    );
    return response.data;
  },

  /**
   * Download Excel template
   */
  downloadExcelTemplate: async (): Promise<Blob> => {
    const response = await apiClient.get('/on-invoice/template/excel', {
      responseType: 'blob',
    });
    return response.data;
  },

  /**
   * Download CSV template
   */
  downloadCSVTemplate: async (): Promise<Blob> => {
    const response = await apiClient.get('/on-invoice/template/csv', {
      responseType: 'blob',
    });
    return response.data;
  },

  /**
   * Get all On-Invoice entries with filters
   */
  getEntries: async (filters?: {
    batchId?: string;
    customerId?: string;
    skuId?: string;
    fiscalPeriod?: string;
    discountType?: string;
    invoiceDateFrom?: string;
    invoiceDateTo?: string;
    status?: string;
  }): Promise<OnInvoiceEntry[]> => {
    const response = await apiClient.get<OnInvoiceEntry[]>(
      '/on-invoice/entries',
      {
        params: filters,
      }
    );
    return response.data;
  },

  /**
   * Get total count of On-Invoice entries
   */
  getCount: async (): Promise<number> => {
    const response = await apiClient.get<{ count: number }>(
      '/on-invoice/count'
    );
    return response.data.count;
  },
};

/**
 * T-098: the single question "can this row's figures be trusted?".
 *
 * Exported and separate because it has three callers in the page — the two value
 * cells, the RAG colour, and the summary banner's count — and a second derivation
 * anywhere would let the banner disagree with the rows it summarises.
 *
 * A MISSING `dataStatus` counts as unreadable. Rows persisted before T-098 carry
 * `current: 0` with no dataStatus, and that zero has three possible origins: a
 * real zero balance, an unreadable envelope (the old catch wrote 0), or a missing
 * envelope (that branch writes 0 too). Since the three cannot be told apart, the
 * honest reading is "unknown" — printing ₺0,00 would assert a figure the data
 * cannot support.
 */
export function isUnreadable(impact: {
  dataStatus?: 'ok' | 'unavailable';
  current: number | null;
  after: number | null;
}): boolean {
  return (
    impact.dataStatus !== 'ok' ||
    impact.current === null ||
    impact.after === null
  );
}
