import apiClient from '../client';

export interface DistributionResult {
  status: 'success' | 'partial' | 'failed';
  totalSpend: number;
  distributedTotal: number;
  difference: number;
  skuDistributions: Array<{
    skuId: string;
    skuCode: string;
    amount: number;
    ratio: number;
    basis: string;
  }>;
  warnings?: string[];
  errors?: string[];
}

export interface FUDistributionBreakdown {
  planFuId: string;
  mechanics: Record<
    string,
    {
      mechanicCode: string;
      mechanicName: string;
      fuValue: number;
      distributionMethod: string;
      skuDistributions: Array<{
        skuId: string;
        skuCode: string;
        amount: number;
        ratio: number;
        basis: string;
      }>;
      totalDistributed: number;
      isValid: boolean;
    }
  >;
  totalOnInvoice: number;
  totalOffInvoice: number;
}

export interface DistributionValidationResult {
  isValid: boolean;
  fuTotalSpend: number;
  skuTotalDistributed: number;
  difference: number;
  tolerance: number;
  invalidMechanics?: string[];
  adjustments?: Record<string, number>;
}

export interface ValidationError {
  severity: 'ERROR' | 'WARNING' | 'INFO';
  category: 'INPUT_ERROR' | 'COMBINATION_ERROR' | 'BUDGET_ERROR' | 'BUSINESS_RULE_ERROR' | 'CALCULATION_ERROR';
  message: string;
  field?: string;
  fuId?: string;
  skuId?: string;
  suggestion?: string;
  context?: Record<string, any>;
}

export interface InputValidationResult {
  isValid: boolean;
  errors: ValidationError[];
  errorCount: number;
  warningCount: number;
}

export interface CombinationValidationResult {
  isValid: boolean;
  totalOnInvoiceDiscount: number;
  totalOffInvoiceDiscount: number;
  combinedDiscount: number;
  errors: ValidationError[];
  conflicts: string[];
}

export interface BudgetValidationResult {
  isSufficient: boolean;
  onInvoiceAvailable: number;
  offInvoiceAvailable: number;
  onInvoiceShortfall: number;
  offInvoiceShortfall: number;
  errors: ValidationError[];
  suggestions: string[];
}

export interface PreSubmissionValidation {
  canSubmit: boolean;
  hasBlockingErrors: boolean;
  inputValidation: InputValidationResult;
  combinationValidation: CombinationValidationResult;
  budgetValidation: BudgetValidationResult;
  allErrors: ValidationError[];
  totalErrorCount: number;
  totalWarningCount: number;
  autoFixSuggestions: string[];
}

export const spendCalculationEndpoints = {
  // Distribution
  distributeMechanicSpend: (planFuId: string, mechanicId: string) =>
    apiClient.post<DistributionResult>(`/spend-calculation/distribute/${planFuId}/${mechanicId}`),

  recalculateOnVolumeChange: (skuId: string, newVolume: number) =>
    apiClient.post(`/spend-calculation/recalculate-on-volume-change/${skuId}`, { newVolume }),

  getDistributionBreakdown: (planFuId: string) =>
    apiClient.get<FUDistributionBreakdown>(`/spend-calculation/breakdown/${planFuId}`),

  validateDistribution: (planFuId: string) =>
    apiClient.get<DistributionValidationResult>(`/spend-calculation/validate-distribution/${planFuId}`),

  // Validation
  validateInputs: (planFuId: string) =>
    apiClient.get<InputValidationResult>(`/spend-calculation/validate-inputs/${planFuId}`),

  validateCombinations: (planFuId: string) =>
    apiClient.get<CombinationValidationResult>(`/spend-calculation/validate-combinations/${planFuId}`),

  validateBudget: (planId: string) =>
    apiClient.get<BudgetValidationResult>(`/spend-calculation/validate-budget/${planId}`),

  validateBeforeSubmission: (planId: string) =>
    apiClient.get<PreSubmissionValidation>(`/spend-calculation/validate-before-submission/${planId}`),
};
