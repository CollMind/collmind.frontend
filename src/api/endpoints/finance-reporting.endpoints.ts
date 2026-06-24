import apiClient from '../client';

export interface ReportFilters {
  startDate?: string;
  endDate?: string;
  cplIds?: string[];
  channels?: string[];
  categories?: string[];
  planStatuses?: string[];
  ragStatuses?: string[];
  mechanicCodes?: string[];
  fiscalYear?: string;
}

export interface PaginationParams {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'ASC' | 'DESC';
}

export interface BudgetSummary {
  allocated: number;
  utilized: number;
  reserved: number;
  available: number;
  utilizationPercent: number;
  status: 'GREEN' | 'AMBER' | 'RED';
}

export interface BudgetUtilizationReport {
  onInvoice: BudgetSummary;
  offInvoice: BudgetSummary;
  total: BudgetSummary;
  periodStart: string;
  periodEnd: string;
  byCpl?: Array<{
    cplId: string;
    cplName: string;
    onInvoice: BudgetSummary;
    offInvoice: BudgetSummary;
  }>;
  byChannel?: Array<{
    channel: string;
    onInvoice: BudgetSummary;
    offInvoice: BudgetSummary;
  }>;
  byCategory?: Array<{
    category: string;
    onInvoice: BudgetSummary;
    offInvoice: BudgetSummary;
  }>;
}

export interface TrendDataPoint {
  date: string;
  onInvoice: number;
  offInvoice: number;
  total: number;
  ltaOnInvoice?: number;
  ltaOffInvoice?: number;
  promoOnInvoice?: number;
  promoOffInvoice?: number;
  budgetTarget?: number;
  previousYear?: number;
}

export interface TrendReport {
  granularity: 'daily' | 'weekly' | 'monthly';
  dataPoints: TrendDataPoint[];
  totalOnInvoice: number;
  totalOffInvoice: number;
  avgDailyOnInvoice: number;
  avgDailyOffInvoice: number;
  growthRate?: number;
}

export interface CompositionSlice {
  mechanicCode: string;
  mechanicName: string;
  amount: number;
  percentage: number;
  planCount: number;
  avgRoi?: number;
}

export interface CompositionReport {
  onInvoice: CompositionSlice[];
  offInvoice: CompositionSlice[];
  totalOnInvoice: number;
  totalOffInvoice: number;
}

export interface PlanPerformanceRow {
  planId: string;
  planName: string;
  planCode: string;
  cplName: string;
  channel: string;
  category: string;
  totalSpend: number;
  onInvoiceSpend: number;
  offInvoiceSpend: number;
  onInvoicePercent: number;
  offInvoicePercent: number;
  gpRoi: number;
  ragStatus: 'RED' | 'AMBER' | 'GREEN';
  status: string;
  startDate: string;
  endDate: string;
}

export interface PaginatedPlanReport {
  rows: PlanPerformanceRow[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface RiskPlan {
  planId: string;
  planName: string;
  ragStatus: string;
  totalSpend: number;
  gpRoi: number;
  riskLevel: string;
}

export interface RiskReport {
  redPlansSpend: number;
  amberPlansSpend: number;
  totalAtRisk: number;
  riskPercentage: number;
  redPlans: RiskPlan[];
  amberPlans: RiskPlan[];
  recommendations?: string[];
}

export interface MechanicEffectiveness {
  mechanicCode: string;
  mechanicName: string;
  totalSpend: number;
  planCount: number;
  avgGpRoi: number;
  avgToRoi: number;
  totalIncrementalGp: number;
  efficiencyScore: number;
  insights?: string[];
}

export interface MechanicReport {
  mechanics: MechanicEffectiveness[];
  totalSpend: number;
  mostEfficient: string;
  leastEfficient: string;
}

export interface VarianceItem {
  category: string;
  planned: number;
  actual: number;
  variance: number;
  variancePercent: number;
  explanation?: string;
}

export interface VarianceReport {
  comparisonType: 'budget_vs_actual' | 'forecast_vs_actual' | 'previous_period';
  periodStart: string;
  periodEnd: string;
  variances: VarianceItem[];
  totalVariance: number;
  totalVariancePercent: number;
}

export interface CashFlowProjection {
  month: string;
  onInvoiceOutflow: number;
  offInvoiceOutflow: number;
  totalOutflow: number;
  planBreakdown?: Array<{
    planId: string;
    planName: string;
    onInvoice: number;
    offInvoice: number;
    paymentDate: string;
  }>;
}

export interface CashFlowReport {
  startDate: string;
  endDate: string;
  projections: CashFlowProjection[];
  totalOnInvoiceOutflow: number;
  totalOffInvoiceOutflow: number;
  totalOutflow: number;
}

export const financeReportingEndpoints = {
  getBudgetUtilization: (filters: ReportFilters) =>
    apiClient.get<BudgetUtilizationReport>(
      '/finance-reporting/budget-utilization',
      { params: filters }
    ),

  getSpendTrend: (
    filters: ReportFilters,
    granularity: 'daily' | 'weekly' | 'monthly' = 'monthly'
  ) =>
    apiClient.get<TrendReport>('/finance-reporting/spend-trend', {
      params: { ...filters, granularity },
    }),

  getSpendComposition: (filters: ReportFilters) =>
    apiClient.get<CompositionReport>('/finance-reporting/spend-composition', {
      params: filters,
    }),

  getPlanPerformance: (filters: ReportFilters, pagination: PaginationParams) =>
    apiClient.get<PaginatedPlanReport>('/finance-reporting/plan-performance', {
      params: { ...filters, ...pagination },
    }),

  getBudgetAtRisk: (filters: ReportFilters) =>
    apiClient.get<RiskReport>('/finance-reporting/budget-at-risk', {
      params: filters,
    }),

  getMechanicEffectiveness: (filters: ReportFilters) =>
    apiClient.get<MechanicReport>('/finance-reporting/mechanic-effectiveness', {
      params: filters,
    }),

  getVarianceAnalysis: (
    filters: ReportFilters,
    comparisonType:
      | 'budget_vs_actual'
      | 'forecast_vs_actual'
      | 'previous_period' = 'budget_vs_actual'
  ) =>
    apiClient.get<VarianceReport>('/finance-reporting/variance-analysis', {
      params: { ...filters, comparisonType },
    }),

  getCashFlowProjection: (filters: ReportFilters, months: number = 12) =>
    apiClient.get<CashFlowReport>('/finance-reporting/cash-flow-projection', {
      params: { ...filters, months },
    }),
};
