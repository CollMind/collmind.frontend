import { useQuery } from '@tanstack/react-query';
import { financeReportingEndpoints, ReportFilters } from '@/api/endpoints/finance-reporting.endpoints';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import { Progress } from '@/components/ui/progress';

interface BudgetUtilizationWidgetProps {
  filters: ReportFilters;
}

export function BudgetUtilizationWidget({ filters }: BudgetUtilizationWidgetProps) {
  const { data, isLoading, error } = useQuery({
    queryKey: ['budget-utilization', filters],
    queryFn: () => financeReportingEndpoints.getBudgetUtilization(filters),
    staleTime: 30000, // 30 seconds
  });

  if (isLoading) {
    return <LoadingSpinner />;
  }

  if (error || !data) {
    return <div className="text-red-500 text-sm">Veri yüklenirken hata oluştu</div>;
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'GREEN':
        return 'bg-green-500';
      case 'AMBER':
        return 'bg-amber-500';
      case 'RED':
        return 'bg-red-500';
      default:
        return 'bg-gray-500';
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('tr-TR', {
      style: 'currency',
      currency: 'TRY',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  return (
    <div className="space-y-6">
      {/* On-Invoice Budget */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-blue-500" />
            <span className="text-sm font-medium">On-Invoice Budget</span>
          </div>
          <span className={`text-xs font-semibold px-2 py-1 rounded ${getStatusColor(data.onInvoice.status)} text-white`}>
            {data.onInvoice.status}
          </span>
        </div>
        <Progress value={data.onInvoice.utilizationPercent} className="h-3 mb-2" />
        <div className="grid grid-cols-2 gap-4 text-xs">
          <div>
            <span className="text-gray-500">Allocated:</span>
            <span className="ml-2 font-semibold">{formatCurrency(data.onInvoice.allocated)}</span>
          </div>
          <div>
            <span className="text-gray-500">Utilized:</span>
            <span className="ml-2 font-semibold">{formatCurrency(data.onInvoice.utilized)}</span>
          </div>
          <div>
            <span className="text-gray-500">Reserved:</span>
            <span className="ml-2 font-semibold">{formatCurrency(data.onInvoice.reserved)}</span>
          </div>
          <div>
            <span className="text-gray-500">Available:</span>
            <span className={`ml-2 font-semibold ${data.onInvoice.available < 0 ? 'text-red-600' : ''}`}>
              {formatCurrency(data.onInvoice.available)}
            </span>
          </div>
        </div>
        <div className="mt-2 text-right">
          <span className="text-sm font-bold">{data.onInvoice.utilizationPercent.toFixed(1)}%</span>
        </div>
      </div>

      {/* Off-Invoice Budget */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-orange-500" />
            <span className="text-sm font-medium">Off-Invoice Budget</span>
          </div>
          <span className={`text-xs font-semibold px-2 py-1 rounded ${getStatusColor(data.offInvoice.status)} text-white`}>
            {data.offInvoice.status}
          </span>
        </div>
        <Progress value={data.offInvoice.utilizationPercent} className="h-3 mb-2" />
        <div className="grid grid-cols-2 gap-4 text-xs">
          <div>
            <span className="text-gray-500">Allocated:</span>
            <span className="ml-2 font-semibold">{formatCurrency(data.offInvoice.allocated)}</span>
          </div>
          <div>
            <span className="text-gray-500">Utilized:</span>
            <span className="ml-2 font-semibold">{formatCurrency(data.offInvoice.utilized)}</span>
          </div>
          <div>
            <span className="text-gray-500">Reserved:</span>
            <span className="ml-2 font-semibold">{formatCurrency(data.offInvoice.reserved)}</span>
          </div>
          <div>
            <span className="text-gray-500">Available:</span>
            <span className={`ml-2 font-semibold ${data.offInvoice.available < 0 ? 'text-red-600' : ''}`}>
              {formatCurrency(data.offInvoice.available)}
            </span>
          </div>
        </div>
        <div className="mt-2 text-right">
          <span className="text-sm font-bold">{data.offInvoice.utilizationPercent.toFixed(1)}%</span>
        </div>
      </div>

      {/* Total Summary */}
      <div className="pt-4 border-t">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-semibold">Total Budget</span>
          <span className={`text-xs font-semibold px-2 py-1 rounded ${getStatusColor(data.total.status)} text-white`}>
            {data.total.status}
          </span>
        </div>
        <div className="grid grid-cols-2 gap-4 text-xs">
          <div>
            <span className="text-gray-500">Total Allocated:</span>
            <span className="ml-2 font-semibold">{formatCurrency(data.total.allocated)}</span>
          </div>
          <div>
            <span className="text-gray-500">Total Used:</span>
            <span className="ml-2 font-semibold">
              {formatCurrency(data.total.utilized + data.total.reserved)}
            </span>
          </div>
        </div>
        <div className="mt-2">
          <Progress value={data.total.utilizationPercent} className="h-2" />
          <div className="text-right mt-1">
            <span className="text-sm font-bold">{data.total.utilizationPercent.toFixed(1)}%</span>
          </div>
        </div>
      </div>
    </div>
  );
}
