import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import type { DashboardBudgetBucket, DashboardBudgetUtilization } from '@/api/endpoints/dashboard.endpoints';
import { ragTextClass } from './ragColorUtils';

function formatCurrency(amount: number): string {
  if (amount >= 1_000_000) return `₺${(amount / 1_000_000).toFixed(1)}M`;
  if (amount >= 1_000) return `₺${(amount / 1_000).toFixed(0)}K`;
  return `₺${amount.toFixed(0)}`;
}

function BudgetRow({
  label,
  bucket,
}: {
  label: string;
  bucket: DashboardBudgetBucket;
}) {
  // RAG rengi ve yüzdesi backend'den geliyor — frontend hesap yapmıyor
  const progressColorClass =
    bucket.status === 'GREEN'
      ? 'bg-emerald-500'
      : bucket.status === 'AMBER'
        ? 'bg-amber-400'
        : 'bg-red-500';

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-xs">
        <span className="font-medium text-gray-700">{label}</span>
        <span className={cn('font-semibold', ragTextClass(bucket.status))}>
          %{bucket.utilizationPercent.toFixed(1)}
        </span>
      </div>
      {/* Progress bileşeninin rengi backend status ile belirleniyor */}
      <div className="relative h-2 w-full overflow-hidden rounded-full bg-gray-200">
        <div
          className={cn('h-full transition-all duration-300', progressColorClass)}
          style={{ width: `${Math.min(bucket.utilizationPercent, 100)}%` }}
          role="progressbar"
          aria-valuenow={bucket.utilizationPercent}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label={`${label} kullanım oranı`}
        />
      </div>
      <div className="flex gap-3 text-[11px] text-gray-500">
        <span>Kullanılan: {formatCurrency(bucket.utilized)}</span>
        <span>Tahsis: {formatCurrency(bucket.allocated)}</span>
        <span>Mevcut: {formatCurrency(bucket.available)}</span>
      </div>
    </div>
  );
}

export function BudgetUtilizationPanel({
  budgetUtilization,
  period,
}: {
  budgetUtilization: DashboardBudgetUtilization;
  period: string;
}) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium text-gray-900">
          Bütçe Kullanımı
          <span className="ml-2 text-xs font-normal text-gray-400">{period}</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <BudgetRow label="Toplam" bucket={budgetUtilization.total} />
        <BudgetRow label="On-Invoice" bucket={budgetUtilization.onInvoice} />
        <BudgetRow label="Off-Invoice" bucket={budgetUtilization.offInvoice} />
      </CardContent>
    </Card>
  );
}
