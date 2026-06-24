import apiClient from '../client';

// DTO: GET /dashboard/summary?period=YYYY-MM
export interface DashboardBudgetBucket {
  allocated: number;
  utilized: number;
  reserved: number;
  available: number;
  utilizationPercent: number;
  status: 'GREEN' | 'AMBER' | 'RED';
}

export interface DashboardBudgetUtilization {
  onInvoice: DashboardBudgetBucket;
  offInvoice: DashboardBudgetBucket;
  total: DashboardBudgetBucket;
  periodStart: string;
  periodEnd: string;
}

export interface DashboardSummaryDto {
  periodCode: string;
  activeAgreementCount: number;
  pendingApprovalCount: number;
  openTaskCount: number;
  budgetUtilization: DashboardBudgetUtilization | null;
}

// DTO: GET /dashboard/pending-tasks?period=YYYY-MM&includePast=false
export interface PendingApprovalItem {
  agreementId: string;
  agreementName: string;
  agreementType: 'STA' | 'LTA';
  cplName: string;
  channelCode: string;
  period: string;
  status: string;
}

export interface PendingManualClaimItem {
  agreementId: string;
  agreementName: string;
  agreementType: string;
  cplName: string;
  channelCode: string;
  period: string;
  capTotalAmount: number;
  isPastPeriod: boolean;
}

export interface SubmittedClaimItem {
  agreementId: string;
  agreementName: string;
  agreementType: string;
  cplName: string;
  channelCode: string;
  period: string;
  consumedAmount: number;
}

export interface AwaitingInvoiceClaimItem {
  agreementId: string;
  agreementName: string;
  agreementType: string;
  cplName: string;
  channelCode: string;
  period: string;
  consumedAmount: number;
  isPastPeriod: boolean;
  daysWaiting?: number;
}

export interface PendingTasksDto {
  pendingApprovals: PendingApprovalItem[];
  pendingManualClaims: PendingManualClaimItem[];
  submittedClaims: SubmittedClaimItem[];
  awaitingInvoiceClaims: AwaitingInvoiceClaimItem[];
}

// DTO: GET /dashboard/cpl-status
export interface CplStatusItem {
  cplId: string;
  cplName: string;
  channelCode: string;
  staCount: number;
  ltaCount: number;
  pendingApproval: number;
  pendingManual: number;
  awaitingInvoice: number;
  isUpToDate: boolean;
}

export interface CplStatusDto {
  items: CplStatusItem[];
}

export const dashboardEndpoints = {
  getSummary: (period: string) =>
    apiClient.get<DashboardSummaryDto>('/dashboard/summary', {
      params: { period },
    }),

  getPendingTasks: (period: string, includePast = false) =>
    apiClient.get<PendingTasksDto>('/dashboard/pending-tasks', {
      params: { period, includePast },
    }),

  getCplStatus: () => apiClient.get<CplStatusDto>('/dashboard/cpl-status'),
};
