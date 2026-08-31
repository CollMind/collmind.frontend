import apiClient from '../client';

export interface Kpi {
  id: string;
  kpiCode: string;
  kpiName: string;
  kpiGroup: string;
  kpiDescription?: string;
  formulaType:
    | 'expression'
    | 'conditional'
    | 'user_input'
    | 'external'
    | 'javascript';
  formulaText: string;
  dependsOnKpis?: string[];
  calculationOrder: number;
  calculationLevel: 'sku' | 'fu' | 'plan';
  displayFormat: 'number' | 'currency' | 'percentage';
  decimalPlaces: number;
  showInGrid: boolean;
  columnOrder?: number;
  aggregationMethodFu?: 'sum' | 'avg' | 'min' | 'max' | 'weighted_avg';
  /**
   * `T-343` / `Z71 §3` — eski adı `ragGreenThreshold`. ⛔ Tüketicisi **RAG
   * DEĞİL**, Target-ROI ekseni: "hedefin altında" uyarısı + Finance kovası.
   * `ragAmberThreshold` bu sürümle **kaldırıldı** (migration 1820): kadran
   * (`Z66 §2`) RAG'ı işaret-tabanlı yaptı, eşik girdisiz kaldı.
   */
  targetRoiThreshold?: number;
  isActive: boolean;
  metadata?: Record<string, any>;
  createdAt: string;
  updatedAt: string;
}

export interface CreateKpiDto {
  kpiCode: string;
  kpiName: string;
  kpiGroup: string;
  kpiDescription?: string;
  formulaType:
    | 'expression'
    | 'conditional'
    | 'user_input'
    | 'external'
    | 'javascript';
  formulaText: string;
  dependsOnKpis?: string[];
  calculationOrder: number;
  calculationLevel: 'sku' | 'fu' | 'plan';
  displayFormat: 'number' | 'currency' | 'percentage';
  decimalPlaces?: number;
  showInGrid?: boolean;
  columnOrder?: number;
  aggregationMethodFu?: 'sum' | 'avg' | 'min' | 'max' | 'weighted_avg';
  /** `T-343`: bkz. `Kpi.targetRoiThreshold`. */
  targetRoiThreshold?: number;
  isActive?: boolean;
}

export interface UpdateKpiDto extends Partial<CreateKpiDto> {}

export interface FormulaValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  dependencies: string[];
}

const BASE = '/master-data/kpis';

export const kpiEndpoints = {
  getAll: (activeOnly?: boolean) =>
    apiClient.get<Kpi[]>(BASE, {
      params: activeOnly ? { activeOnly: true } : undefined,
    }),

  getById: (id: string) => apiClient.get<Kpi>(`${BASE}/${id}`),

  getGridKpis: () => apiClient.get<Kpi[]>(`${BASE}/grid`),

  getGridKpisForPlan: (planId: string) =>
    apiClient.get<Kpi[]>(`${BASE}/grid/${planId}`),

  create: (data: CreateKpiDto) => apiClient.post<Kpi>(BASE, data),

  update: (id: string, data: UpdateKpiDto) =>
    apiClient.patch<Kpi>(`${BASE}/${id}`, data),

  delete: (id: string) => apiClient.delete(`${BASE}/${id}`),

  validateFormula: (formula: string, formulaType: string) =>
    apiClient.post<FormulaValidationResult>(`${BASE}/validate-formula`, {
      formula,
      formulaType,
    }),

  seedDefaults: () => apiClient.post<Kpi[]>(`${BASE}/seed-defaults`),
};
