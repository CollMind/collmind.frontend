import { Plan } from '@/api/endpoints/plans.endpoints';
import { Card, CardContent } from '@/components/ui/card';
import { toNumber, toNumberOrZero } from '@/utils/numberUtils';
import {
  formatCoverageLabel,
  RAG_NOT_CALCULATED_LABEL,
  resolveRagPresentation,
} from '@/utils/ragCoverage';

interface GrandTotalsProps {
  plan: Plan;
}

const formatNumber = (num: number) => {
  return new Intl.NumberFormat('tr-TR', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(num);
};

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('tr-TR', {
    style: 'currency',
    currency: 'TRY',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
};

/**
 * `K-2.4.22a`/`K-2.4.22c` (`INV-N-004`): `ragStatus === null` is NOT a risk
 * judgement — it means coverage was partial/zero, or the plan has never
 * been calculated. Collapsing it into `AMBER`/"• RİSKLİ" (the previous
 * behaviour here) falsified the plan's confidence claim: a reader could not
 * tell "riskli" from "hesaplanamadı" — [[T-172]].
 *
 * `RagPresentation.isNeverCalculated` (`@/utils/ragCoverage`) distinguishes
 * "never calculated" (`coverageRatio` also `null`) from "calculated with
 * partial/zero coverage" (`coverageRatio` a number `< 1`) — both real,
 * different facts, both gray.
 */
const getRagDisplay = (
  ragStatus: Plan['ragStatus'],
  coverageRatio: Plan['coverageRatio']
) => {
  const presentation = resolveRagPresentation(ragStatus, coverageRatio);

  if (presentation.ragStatus === 'RED')
    return { text: '• KRİTİK', color: 'text-red-600', dotColor: 'bg-red-500' };
  if (presentation.ragStatus === 'GREEN')
    return { text: '• İyi', color: 'text-green-600', dotColor: 'bg-green-500' };
  if (presentation.ragStatus === 'AMBER')
    return {
      text: '• RİSKLİ',
      color: 'text-yellow-600',
      dotColor: 'bg-yellow-500',
    };

  // GRİ (K-2.4.22a) — never a colour from the full-coverage palette.
  const coverageLabel = formatCoverageLabel(presentation.coverageRatio);
  return {
    text: presentation.isNeverCalculated
      ? `• ${RAG_NOT_CALCULATED_LABEL}`
      : `• GRİ${coverageLabel ? ` · ${coverageLabel}` : ''}`,
    color: 'text-gray-500',
    dotColor: 'bg-gray-400',
  };
};

export function GrandTotals({ plan }: GrandTotalsProps) {
  // Calculate BASE VOLUME: Sum of all SKU base volumes
  const baseVolume =
    plan.planFus?.reduce(
      (sum, fu) =>
        sum +
        (fu.planSkus?.reduce((s, sku) => s + (sku.baseVolume || 0), 0) || 0),
      0
    ) || 0;

  // PLANNED VOLUME: From plan.totalPlannedVolume (aggregated from all SKUs)
  const plannedVolume = toNumberOrZero(plan.totalPlannedVolume);

  // INCREMENTAL: Planned - Base
  const incremental = plannedVolume - baseVolume;
  const incrementalPercent =
    baseVolume > 0 ? ((incremental / baseVolume) * 100).toFixed(1) : '0.0';

  // TOTAL SPEND: From plan.totalSpend (aggregated from all tactics)
  const totalSpend = toNumberOrZero(plan.totalSpend);

  // GP ROI: from plan.overallRoi. The formula is a per-tenant DB row, not a
  // constant; the seed/migration default is INCR_GP / TOTAL_PLANNED_SPEND * 100
  // (ADR 0011, migration 1801000000000) — measured 2026-08-10 in `main.kpis`
  // where kpi_code = 'GP_ROI_PCT'.
  // WARNING: at FU/plan level this is NOT that formula. `aggregate()` maps
  // WEIGHTED_AVG onto an unweighted mean over the non-null SKUs
  // (kpi-engine.service.ts:307-309, :112-116) — see T-177.
  //
  // `overallRoi` is `null` when a dependency (e.g. COGS) is missing —
  // §2.5/[[T-172]]: never coerce to `0` (that reads as "0% ROI, below
  // target" — a fabricated business judgement for "not computed"). And it
  // is a `decimal` column (arrives as a STRING from `pg` — measured), so
  // `.toFixed` was never safe to call on it directly either; `toNumber`
  // handles both facts in one place.
  const gpRoi = toNumber(plan.overallRoi ?? null);
  const targetRoi = 20.0; // Default target ROI (will be configurable from KPI config)
  const roiDiff = gpRoi !== null ? gpRoi - targetRoi : null;
  const roiDiffAbs = roiDiff !== null ? Math.abs(roiDiff).toFixed(1) : null;

  // PLAN STATUS: RAG status with FU and SKU counts
  const ragDisplay = getRagDisplay(plan.ragStatus, plan.coverageRatio);
  const fuCount = plan.planFus?.length || 0;
  const skuCount =
    plan.planFus?.reduce((sum, fu) => sum + (fu.planSkus?.length || 0), 0) || 0;

  return (
    <div className="grid grid-cols-6 gap-4">
      {/* BASE VOLUME */}
      <Card className="border-gray-200">
        <CardContent className="p-4">
          <div className="text-xs text-gray-500 mb-1 uppercase">
            BASE VOLUME
          </div>
          <div className="text-2xl font-bold text-gray-900">
            {formatNumber(baseVolume)}
          </div>
          <div className="text-xs text-gray-500 mt-1">adet</div>
        </CardContent>
      </Card>

      {/* PLANNED VOLUME */}
      <Card className="border-gray-200">
        <CardContent className="p-4">
          <div className="text-xs text-gray-500 mb-1 uppercase">
            PLANNED VOLUME
          </div>
          <div className="text-2xl font-bold text-gray-900">
            {formatNumber(plannedVolume)}
          </div>
          <div className="text-xs text-gray-500 mt-1">adet</div>
        </CardContent>
      </Card>

      {/* INCREMENTAL */}
      <Card className="border-gray-200">
        <CardContent className="p-4">
          <div className="text-xs text-gray-500 mb-1 uppercase">
            INCREMENTAL
          </div>
          <div className="text-2xl font-bold text-gray-900">
            {formatNumber(incremental)}
          </div>
          <div className="text-xs text-gray-500 mt-1">
            (+{incrementalPercent}%)
          </div>
        </CardContent>
      </Card>

      {/* TOTAL SPEND */}
      <Card className="border-gray-200">
        <CardContent className="p-4">
          <div className="text-xs text-gray-500 mb-1 uppercase">
            TOTAL SPEND
          </div>
          <div className="text-2xl font-bold text-gray-900">
            {formatCurrency(totalSpend)}
          </div>
          <div className="text-xs text-gray-500 mt-1">Harcama</div>
        </CardContent>
      </Card>

      {/* GP ROI */}
      <Card className="border-gray-200">
        <CardContent className="p-4">
          <div className="text-xs text-gray-500 mb-1 uppercase">GP ROI</div>
          <div
            className={`text-2xl font-bold ${gpRoi !== null && gpRoi < targetRoi ? 'text-red-600' : 'text-gray-900'}`}
          >
            {gpRoi !== null ? `${gpRoi.toFixed(1)}%` : '—'}
          </div>
          <div className="text-xs text-gray-500 mt-1">
            {gpRoi !== null && roiDiff !== null ? (
              <>
                Target: %{targetRoi.toFixed(0)} ({roiDiff >= 0 ? '▲' : '▼'}
                {roiDiffAbs}pp)
              </>
            ) : (
              RAG_NOT_CALCULATED_LABEL
            )}
          </div>
        </CardContent>
      </Card>

      {/* PLAN STATUS */}
      <Card className="border-gray-200">
        <CardContent className="p-4">
          <div className="text-xs text-gray-500 mb-1 uppercase">
            PLAN STATUS
          </div>
          <div className="flex items-center gap-2">
            <div
              className={`w-2.5 h-2.5 rounded-full ${ragDisplay.dotColor}`}
            />
            <div className={`text-lg font-bold ${ragDisplay.color}`}>
              {ragDisplay.text}
            </div>
          </div>
          <div className="text-xs text-gray-500 mt-1">
            {fuCount} FU, {skuCount} SKU
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
