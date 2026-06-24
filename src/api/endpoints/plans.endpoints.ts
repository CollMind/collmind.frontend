import apiClient from '../client';

export interface CalculationResult {
  kpiCode: string;
  value: number | null;
  displayFormat: 'number' | 'currency' | 'percentage';
  decimalPlaces: number;
  ragStatus?: 'RED' | 'AMBER' | 'GREEN' | null;
  calculatedAt?: string;
}

export interface Plan {
  id: string;
  planCode: string;
  planName: string;
  description?: string;
  cplId: string;
  channelId: string;
  regionId?: string;
  categoryId: string;
  startDate: string;
  endDate: string;
  periodMonth: string;
  status: 'DRAFT' | 'PENDING_APPROVAL' | 'APPROVED' | 'REJECTED';
  approvalRequestId?: string;
  approvedAt?: string;
  approvedById?: string;
  rejectedAt?: string;
  rejectedById?: string;
  rejectionReason?: string;
  comments?: string;
  totalPlannedVolume: number | string;
  totalSpend: number | string;
  totalGp: number;
  overallRoi?: number;
  ragStatus?: 'RED' | 'AMBER' | 'GREEN';
  createdAt: string;
  updatedAt: string;
  createdBy?: string;
  updatedBy?: string;
  cpl?: { id: string; name: string; code: string };
  channel?: { id: string; name: string; code: string };
  category?: { id: string; name: string; code: string };
  region?: { id: string; name: string; code: string };
  planFus?: PlanFu[];
}

export interface PlanFu {
  id: string;
  planId: string;
  fuId: string;
  tactics?: Record<string, number>;
  totalPlannedVolume: number | string;
  totalSpend: number | string;
  totalGp: number;
  gpRoi?: number;
  ragStatus?: 'RED' | 'AMBER' | 'GREEN';
  calculatedKpis?: Record<string, CalculationResult>;
  fu?: { id: string; name: string; code: string };
  planSkus?: PlanSku[];
  planMechanicValues?: PlanMechanicValue[];
}

export interface PlanSku {
  id: string;
  planFuId: string;
  skuId: string;
  baseVolume?: number;
  plannedVolume?: number;
  incrementalVolume: number;
  plannedTurnover: number;
  tacticSpend: number;
  plannedGp: number;
  gpRoi?: number;
  ragStatus?: 'RED' | 'AMBER' | 'GREEN';
  calculatedKpis?: Record<string, CalculationResult>;
  // LTA spend alanları
  baseLtaOnInvoiceSpend: number;
  baseLtaOffInvoiceSpend: number;
  plannedLtaOnInvoiceSpend: number;
  plannedLtaOffInvoiceSpend: number;
  // Promo spend alanları
  promoOnInvoiceSpend: number;
  promoOffInvoiceSpend: number;
  sku?: {
    id: string;
    name: string;
    code: string;
    unitPrice?: number;
    cogs?: number;
  };
  spendBreakdowns?: MechanicSpendBreakdown[];
}

export interface CreatePlanDto {
  planName: string;
  description?: string;
  cplId: string;
  channelId: string;
  regionId?: string;
  categoryId: string;
  startDate: string;
  endDate: string;
  comments?: string;
}

export interface UpdatePlanDto extends Partial<CreatePlanDto> {}

export interface AddFuDto {
  fuId: string;
  tactics?: Record<string, number>;
}

export interface UpdateFuTacticDto {
  tactics?: Record<string, number>;
}

export interface UpdateSkuVolumeDto {
  baseVolume?: number;
  plannedVolume?: number;
}

export interface PlanMechanicValue {
  id: string;
  planFuId: string;
  mechanicId: string;
  enteredValue?: number;
  calculatedSpend: number;
  onInvoiceAmount: number;
  offInvoiceAmount: number;
  distributionMethod?: 'percentage' | 'per_unit' | 'lumpsum' | 'proportional';
  metadata?: Record<string, any>;
  mechanic?: {
    id: string;
    name: string;
    code: string;
    spendingType?: 'on_invoice' | 'off_invoice' | 'both';
  };
  spendBreakdowns?: MechanicSpendBreakdown[];
}

export interface MechanicSpendBreakdown {
  id: string;
  planSkuId: string;
  mechanicId: string;
  planMechanicValueId: string;
  calculatedAmount: number;
  distributionBasis?: 'base_volume_ratio' | 'planned_volume_ratio' | 'equal';
  metadata?: Record<string, any>;
  mechanic?: { id: string; name: string; code: string };
}

export interface LtaAgreement {
  id: string;
  cplId: string;
  channelId: string;
  onInvoicePercentage?: number;
  offInvoicePercentage?: number;
  effectiveDate: string;
  expiryDate?: string;
  isActive: boolean;
  description?: string;
  metadata?: Record<string, any>;
  cpl?: { id: string; name: string; code: string };
  channel?: { id: string; name: string; code: string };
}

export interface BudgetAllocation {
  id: string;
  envelopeId: string;
  onInvoiceBudget: number;
  offInvoiceBudget: number;
  utilizedOnInvoice: number;
  utilizedOffInvoice: number;
  alertThresholds?: {
    warning?: number;
    critical?: number;
    exceeded?: number;
  };
  metadata?: Record<string, any>;
  envelope?: { id: string; code: string; name: string };
}

export interface BudgetCheckResult {
  hasBudget: boolean;
  planTotalSpend: number;
  channel: string;
  channelName: string;
  period: string;
  envelope?: {
    id: string;
    code: string;
    name: string;
    allocatedAmount: number;
    availableAmount: number;
    currency: string;
  };
  sufficient?: boolean;
}

export interface PlanFilterDto {
  status?: 'DRAFT' | 'PENDING_APPROVAL' | 'APPROVED' | 'REJECTED';
  cplId?: string;
  channelId?: string;
  categoryId?: string;
}

export const planEndpoints = {
  // Plan Listesi
  getAll: (filters?: PlanFilterDto) =>
    apiClient.get<Plan[]>('/plans', { params: filters }),

  // Plan Detayı
  getById: (id: string) => apiClient.get<Plan>(`/plans/${id}`),

  // Plan Oluşturma
  create: (data: CreatePlanDto) => apiClient.post<Plan>('/plans', data),

  // Plan Güncelleme (Sadece DRAFT)
  update: (id: string, data: UpdatePlanDto) =>
    apiClient.patch<Plan>(`/plans/${id}`, data),

  // FU Ekleme
  addFu: (planId: string, data: AddFuDto) =>
    apiClient.post<PlanFu>(`/plans/${planId}/fus`, data),

  // FU Tactic Güncelleme
  updateFuTactic: (planId: string, fuId: string, data: UpdateFuTacticDto) =>
    apiClient.patch<PlanFu>(`/plans/${planId}/fus/${fuId}/tactics`, data),

  // FU Silme
  removeFu: (planId: string, fuId: string) =>
    apiClient.delete(`/plans/${planId}/fus/${fuId}`),

  // SKU Volume Güncelleme
  updateSkuVolume: (
    planId: string,
    fuId: string,
    skuId: string,
    data: UpdateSkuVolumeDto
  ) =>
    apiClient.patch<PlanSku>(
      `/plans/${planId}/fus/${fuId}/skus/${skuId}/volume`,
      data
    ),

  // Durum Geçişleri
  submit: (id: string) => apiClient.post<Plan>(`/plans/${id}/submit`),

  approve: (
    id: string,
    data?: {
      comments?: string;
      autoCreateBudget?: boolean;
      budgetAmount?: number;
    }
  ) => apiClient.post<Plan>(`/plans/${id}/approve`, data),

  // Bütçe Kontrolü
  checkBudget: (id: string) =>
    apiClient.get<BudgetCheckResult>(`/plans/${id}/budget-check`),

  reject: (id: string, data: { reason: string }) =>
    apiClient.post<Plan>(`/plans/${id}/reject`, data),

  // Plan Silme
  delete: (id: string) => apiClient.delete(`/plans/${id}`),

  // Plan Analizi
  getAnalysis: (id: string) => apiClient.get(`/plans/${id}/analysis`),

  // KPI Hesaplama
  calculateKpis: (id: string) => apiClient.post(`/plans/${id}/calculate-kpis`),

  // Plan Yeniden Hesaplama
  recalculate: (id: string) => apiClient.post<Plan>(`/plans/${id}/recalculate`),

  // Pending Approval Plans
  getPendingApprovals: () => apiClient.get<Plan[]>('/plans/pending-approvals'),
};
