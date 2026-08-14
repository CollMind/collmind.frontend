import { useQuery } from '@tanstack/react-query';
import {
  financeReportingEndpoints,
  ReportFilters,
} from '@/api/endpoints/finance-reporting.endpoints';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import { AlertTriangle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface BudgetAtRiskWidgetProps {
  filters: ReportFilters;
}

export function BudgetAtRiskWidget({ filters }: BudgetAtRiskWidgetProps) {
  const { data, isLoading, error } = useQuery({
    queryKey: ['budget-at-risk', filters],
    queryFn: async () => {
      const res = await financeReportingEndpoints.getBudgetAtRisk(filters);
      return res.data;
    },
    staleTime: 30000,
  });

  if (isLoading) {
    return <LoadingSpinner />;
  }

  if (error || !data) {
    return (
      <div className="text-red-500 text-sm">Veri yüklenirken hata oluştu</div>
    );
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('tr-TR', {
      style: 'currency',
      currency: 'TRY',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="p-4 bg-red-50 rounded-lg border border-red-200">
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle className="h-5 w-5 text-red-600" />
            <span className="font-semibold text-red-900">RED Plans</span>
          </div>
          <div className="text-2xl font-bold text-red-600">
            {formatCurrency(data.redPlansSpend)}
          </div>
          <div className="text-sm text-red-700">
            {data.redPlans.length} plan
          </div>
        </div>

        <div className="p-4 bg-amber-50 rounded-lg border border-amber-200">
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle className="h-5 w-5 text-amber-600" />
            <span className="font-semibold text-amber-900">AMBER Plans</span>
          </div>
          <div className="text-2xl font-bold text-amber-600">
            {formatCurrency(data.amberPlansSpend)}
          </div>
          <div className="text-sm text-amber-700">
            {data.amberPlans.length} plan
          </div>
        </div>
      </div>

      <div className="p-4 bg-gray-50 rounded-lg">
        <div className="text-sm text-gray-600 mb-2">Total at Risk</div>
        <div className="text-2xl font-bold">
          {formatCurrency(data.totalAtRisk)}
        </div>
        <div className="text-sm text-gray-500 mt-1">
          {data.riskPercentage.toFixed(1)}% of total budget
        </div>
      </div>

      {data.recommendations && data.recommendations.length > 0 && (
        <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
          <div className="font-semibold text-blue-900 mb-2">Öneriler:</div>
          <ul className="list-disc list-inside space-y-1 text-sm text-blue-800">
            {data.recommendations.map((rec, idx) => (
              <li key={idx}>{rec}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Top Risk Plans */}
      {data.redPlans.length > 0 && (
        <div>
          <div className="font-semibold text-sm mb-2">
            Top Risk Plans (RED):
          </div>
          <div className="space-y-2">
            {data.redPlans.slice(0, 5).map((plan) => (
              <div
                key={plan.planId}
                className="flex items-center justify-between p-2 bg-red-50 rounded text-sm"
              >
                <span className="font-medium">{plan.planName}</span>
                <div className="flex items-center gap-2">
                  <span>{formatCurrency(plan.totalSpend)}</span>
                  <Badge className="bg-red-600 text-white">
                    ROI: {plan.gpRoi == null ? '—' : `${Number(plan.gpRoi).toFixed(1)}%`}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
