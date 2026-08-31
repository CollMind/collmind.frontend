import apiClient from '../client';

export interface CalculationResult {
  kpiCode: string;
  value: number | null;
  displayFormat: 'number' | 'currency' | 'percentage';
  decimalPlaces: number;
  ragStatus?: 'RED' | 'AMBER' | 'GREEN' | null;
  calculatedAt?: string;
  /**
   * T-177/T-218: fraction of children (SKUs for an FU rollup, FUs for a plan
   * rollup) that resolved into `value` — 0..1, `null` when this result was
   * never an aggregate (`recomputeRatioFromChildren`, `kpi-engine.service.ts`).
   * `ragStatus` is only ever non-null when this is exactly `1`
   * (`K-2.4.22c` — see `src/utils/ragCoverage.ts`). Key may be entirely
   * absent (not just `undefined`) on older JSONB rows persisted before
   * T-177 — always read through `resolveRagPresentation`, not directly.
   */
  coverageRatio?: number | null;
  /**
   * `T-342` / `Z68 §2` — TANIMLI-YOKLUK. `ragStatus === null` iken
   * *"değerlendirme DIŞI"* (`'LTA_ONLY'`) ile *"değerlendirilemedi"*
   * (`null`/anahtar yok) ayrımını taşır. `plan_fus`/`plan_skus`'ın
   * `calculated_kpis` JSONB'sinden gelir — `resolveRagPresentation`'ın
   * üçüncü argümanı.
   */
  ragExclusionReason?: string | null;
}

export interface Plan {
  id: string;
  /**
   * T-034f: optimistic-locking CAS token for plans.* (structural/header
   * mutations). Always present on entities read from the backend since
   * T-034 (strict mode) — see docs/analysis/0005-optimistic-locking-design.md.
   * Send back on update/addFu(planVersion)/removeFu(planVersion)/delete.
   */
  version: number;
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
  /**
   * `plans.overall_roi` is a `decimal` column — the `pg` driver returns it as
   * a STRING (measured: `numeric(18,4)` → `typeof 'string'`, no
   * `DecimalTransformer` on this entity). `null` when a dependency (e.g.
   * COGS) is missing — never coerce to `0` (`§2.5`, `T-172`). Read through
   * `toNumber`/`toNumberOrZero` (`@/utils/numberUtils`), never `.toFixed`
   * directly.
   */
  overallRoi?: number | string | null;
  /**
   * `null` = coverage was not full; no colour is safe to show (`K-2.4.22a1`).
   *
   */
  ragStatus?: 'RED' | 'AMBER' | 'GREEN' | null;

  /**
   * `T-342` / `Z68 §2` + `Z71 §2` — TANIMLI-YOKLUK, plan seviyesinde.
   * `ragStatus === null` iken: `'LTA_ONLY'` = *"değerlendirme DIŞI"*,
   * `null`/yok = *"değerlendirilemedi"* (bkz. `coverageRatio`).
   * ⛔ `resolveRagPresentation`'ın ÜÇÜNCÜ argümanı — doğrudan okunmaz.
   */
  ragExclusionReason?: string | null;
  /**
   * T-218: fraction of FUs that resolved into `overallRoi` — same
   * decimal-as-string caveat as `overallRoi` above. `null` = never
   * calculated (no FUs, or recalc has not run). See
   * `@/utils/ragCoverage#resolveRagPresentation`.
   */
  coverageRatio?: number | string | null;
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
  /** T-034f: optimistic-locking CAS token for this plan_fus row (tactics). */
  version: number;
  planId: string;
  fuId: string;
  tactics?: Record<string, number>;
  totalPlannedVolume: number | string;
  totalSpend: number | string;
  totalGp: number;
  /** `decimal` column, arrives as string — see `Plan.overallRoi` above. */
  gpRoi?: number | string | null;
  ragStatus?: 'RED' | 'AMBER' | 'GREEN' | null;
  calculatedKpis?: Record<string, CalculationResult>;
  fu?: { id: string; name: string; code: string };
  planSkus?: PlanSku[];
  planMechanicValues?: PlanMechanicValue[];
}

export interface PlanSku {
  id: string;
  /** T-034f: optimistic-locking CAS token for this plan_skus row (volume). */
  version: number;
  planFuId: string;
  skuId: string;
  baseVolume?: number;
  plannedVolume?: number;
  incrementalVolume: number;
  plannedTurnover: number;
  tacticSpend: number;
  plannedGp: number;
  /** `decimal` column, arrives as string — see `Plan.overallRoi` above. */
  gpRoi?: number | string | null;
  ragStatus?: 'RED' | 'AMBER' | 'GREEN' | null;
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

export interface UpdatePlanDto extends Partial<CreatePlanDto> {
  /**
   * T-034f: expected current `plans.version` (optimistic locking, strict
   * mode). Omitting it → 409 MISSING_VERSION; a stale value → 409
   * STALE_VERSION. See docs/analysis/0005-optimistic-locking-design.md §5.
   */
  version?: number;
}

export interface AddFuDto {
  fuId: string;
  // T-079: `tactics` removed. The backend no longer accepts it here, and
  // because the API runs with `forbidNonWhitelisted`, sending it now produces a
  // 400 rather than being ignored. Keeping the field in this type would let a
  // caller write code that type-checks and then fails at runtime.
  //
  // A new FU is created with no tactics; they are entered through
  // `updateFuTactic`, the one write path with scale validation (F2/C3).
  //
  // `//` and not `/** */` on purpose: a JSDoc block that documents no member is
  // collected differently by typedoc/api-extractor than by tsc, and the backend
  // counterpart in add-fu.dto.ts uses `//` too.
  /** T-034f: expected current `plans.version` (adding an FU is structural). */
  planVersion?: number;
}

export interface UpdateFuTacticDto {
  tactics?: Record<string, number>;
  /** T-034f: expected current `plan_fus.version` (row-level CAS). */
  version?: number;
}

export interface UpdateSkuVolumeDto {
  baseVolume?: number;
  plannedVolume?: number;
  /** T-034f: expected current `plan_skus.version` (row-level CAS). */
  version?: number;
}

export interface RemoveFuDto {
  /** T-034f: expected current `plans.version` (removing an FU is structural). */
  planVersion?: number;
}

export interface DeletePlanDto {
  /** T-034f: expected current `plans.version`. */
  version?: number;
}

export interface SubmitPlanDto {
  /**
   * T-034f: expected current `plans.version`. Unlike approve/reject/
   * returnToDraft (status-CAS only), submit() ALSO validates version because
   * it commits the plan's current totalSpend to a budget reserve — see
   * submit-plan.dto.ts on the backend. Omitting it → 409 MISSING_VERSION; a
   * stale value → 409 STALE_VERSION.
   */
  version?: number;

  /**
   * `T-344`: ölen `POST /plans/:id/submit-for-approval` rotasından taşındı.
   * Bugün UI bunu göndermiyor; alan sözleşmede duruyor.
   */
  submissionNotes?: string;
}

/**
 * `T-344` / `Z73 §1` — **`POST /plans/:id/submit`'İN YENİ DÖNÜŞ ŞEKLİ.**
 *
 * ⛔ **`Plan` DEĞİL.** Bu, bu dalganın var-oluş cümlesinin taşıyıcısıdır:
 * *"uyarı kullanıcıya **ULAŞIR**."*
 *
 * `Q13` uyarı katmanı (`RED` *"ciro kaybı"* · `AMBER` *"kârsız büyüme"* ·
 * `LTA_ONLY` *"değerlendirme dışı"* · *"hedefin altında"*) `2026-08-02`'den
 * beri backend'de VARDI — ama frontend'in **hiç çağırmadığı** bir rotanın
 * içinde. `T-344` rotayı öldürdü ve uyarıları buraya bağladı.
 *
 * ```
 * validationErrors      BLOKLAR      success:false, plan DRAFT kalır
 * budgetCheck.warnings  BLOKLAMAZ    submit OLDU, karar desteği konuşuyor
 * ```
 * ⛔ İkisini aynı kutuda göstermek `K-2.2.7c`'yi kırar: uyarı bir RED
 * DEĞİLDİR ve kullanıcıya öyle okutulmamalıdır.
 */
export interface SubmissionResult {
  success: boolean;
  planId: string;
  status: string;
  budgetCheck: {
    onInvoice: { available: number; requested: number; sufficient: boolean };
    offInvoice: { available: number; requested: number; sufficient: boolean };
    overallSufficient: boolean;
    /** BLOKLAMAYAN karar-desteği cümleleri (`Z70 §1` · `Z71 §1`). */
    warnings?: string[];
  };
  /** BLOKLAYAN kalemler — doluysa `success` `false`'tur. */
  validationErrors?: string[];
  approvalRequestId: string;
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
  // T-034f: axios DELETE gövdesi `{ data }` config'i ile gider, ikinci
  // pozisyonel argüman olarak DEĞİL — aksi halde gövde sessizce düşer ve
  // backend her seferinde 409 MISSING_VERSION döner.
  removeFu: (planId: string, fuId: string, data: RemoveFuDto) =>
    apiClient.delete(`/plans/${planId}/fus/${fuId}`, { data }),

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
  // T-034f: submit() is the one status transition that ALSO requires
  // `version` (see SubmitPlanDto). approve/reject deliberately do NOT take
  // version — do not add it there.
  // T-344 (`Z73 §1`): dönüş tipi `Plan` → `SubmissionResult`. Tek submit
  // yolu; `POST /plans/:id/submit-for-approval` KALDIRILDI ([[T-058]]).
  submit: (id: string, data: SubmitPlanDto) =>
    apiClient.post<SubmissionResult>(`/plans/${id}/submit`, data),

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
  // T-034f: bkz. removeFu yorumu — DELETE gövdesi `{ data }` config'i.
  delete: (id: string, data: DeletePlanDto) =>
    apiClient.delete(`/plans/${id}`, { data }),

  // Plan Analizi
  getAnalysis: (id: string) => apiClient.get(`/plans/${id}/analysis`),

  // KPI Hesaplama
  calculateKpis: (id: string) => apiClient.post(`/plans/${id}/calculate-kpis`),

  // Plan Yeniden Hesaplama
  recalculate: (id: string) => apiClient.post<Plan>(`/plans/${id}/recalculate`),

  // Pending Approval Plans
  getPendingApprovals: () => apiClient.get<Plan[]>('/plans/pending-approvals'),
};
