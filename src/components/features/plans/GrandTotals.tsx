import { Plan } from '@/api/endpoints/plans.endpoints';
import { Card, CardContent } from '@/components/ui/card';
import { toNumberOrZero } from '@/utils/numberUtils';

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

const getRagStatus = (ragStatus?: string) => {
  if (!ragStatus || ragStatus === 'AMBER')
    return {
      text: '• RİSKLİ',
      color: 'text-yellow-600',
      dotColor: 'bg-yellow-500',
    };
  if (ragStatus === 'RED')
    return { text: '• KRİTİK', color: 'text-red-600', dotColor: 'bg-red-500' };
  if (ragStatus === 'GREEN')
    return { text: '• İyi', color: 'text-green-600', dotColor: 'bg-green-500' };
  return {
    text: '• RİSKLİ',
    color: 'text-yellow-600',
    dotColor: 'bg-yellow-500',
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

  // GP ROI: From plan.overallRoi (calculated as: (Incremental GP / Total Spend) * 100)
  const gpRoi = plan.overallRoi || 0;
  const targetRoi = 20.0; // Default target ROI (will be configurable from KPI config)
  const roiDiff = gpRoi - targetRoi;
  const roiDiffAbs = Math.abs(roiDiff).toFixed(1);

  // PLAN STATUS: RAG status with FU and SKU counts
  const ragStatus = getRagStatus(plan.ragStatus);
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
            className={`text-2xl font-bold ${gpRoi < targetRoi ? 'text-red-600' : 'text-gray-900'}`}
          >
            {gpRoi.toFixed(1)}%
          </div>
          <div className="text-xs text-gray-500 mt-1">
            Target: %{targetRoi.toFixed(0)} ({roiDiff >= 0 ? '▲' : '▼'}
            {roiDiffAbs}pp)
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
            <div className={`w-2.5 h-2.5 rounded-full ${ragStatus.dotColor}`} />
            <div className={`text-lg font-bold ${ragStatus.color}`}>
              {ragStatus.text}
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
