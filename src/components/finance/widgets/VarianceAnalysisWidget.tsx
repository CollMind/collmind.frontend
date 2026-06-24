import { useQuery } from '@tanstack/react-query';
import {
  financeReportingEndpoints,
  ReportFilters,
} from '@/api/endpoints/finance-reporting.endpoints';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';

interface VarianceAnalysisWidgetProps {
  filters: ReportFilters;
}

export function VarianceAnalysisWidget({
  filters,
}: VarianceAnalysisWidgetProps) {
  const { data, isLoading, error } = useQuery({
    queryKey: ['variance-analysis', filters],
    queryFn: async () => {
      const res = await financeReportingEndpoints.getVarianceAnalysis(
        filters,
        'budget_vs_actual'
      );
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

  const getVarianceColor = (variance: number) => {
    if (variance > 0) return 'text-green-600';
    if (variance < 0) return 'text-red-600';
    return 'text-gray-600';
  };

  return (
    <div className="space-y-4">
      <div className="text-sm text-gray-500">
        Comparison:{' '}
        <span className="font-semibold text-gray-900">
          {data.comparisonType.replace('_', ' ')}
        </span>
      </div>

      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Category</TableHead>
              <TableHead className="text-right">Planned</TableHead>
              <TableHead className="text-right">Actual</TableHead>
              <TableHead className="text-right">Variance</TableHead>
              <TableHead className="text-right">Variance %</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.variances.map((variance) => (
              <TableRow key={variance.category}>
                <TableCell className="font-medium">
                  {variance.category}
                </TableCell>
                <TableCell className="text-right">
                  {formatCurrency(variance.planned)}
                </TableCell>
                <TableCell className="text-right">
                  {formatCurrency(variance.actual)}
                </TableCell>
                <TableCell
                  className={`text-right font-semibold ${getVarianceColor(variance.variance)}`}
                >
                  {formatCurrency(variance.variance)}
                </TableCell>
                <TableCell className="text-right">
                  <Badge
                    className={
                      variance.variancePercent > 0
                        ? 'bg-green-100 text-green-800'
                        : variance.variancePercent < 0
                          ? 'bg-red-100 text-red-800'
                          : 'bg-gray-100 text-gray-800'
                    }
                  >
                    {variance.variancePercent > 0 ? '+' : ''}
                    {variance.variancePercent.toFixed(1)}%
                  </Badge>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <div className="p-4 bg-gray-50 rounded-lg">
        <div className="flex items-center justify-between">
          <span className="font-semibold">Total Variance:</span>
          <div className="flex items-center gap-2">
            <span
              className={`text-lg font-bold ${getVarianceColor(data.totalVariance)}`}
            >
              {formatCurrency(data.totalVariance)}
            </span>
            <Badge
              className={
                data.totalVariancePercent > 0
                  ? 'bg-green-100 text-green-800'
                  : data.totalVariancePercent < 0
                    ? 'bg-red-100 text-red-800'
                    : 'bg-gray-100 text-gray-800'
              }
            >
              {data.totalVariancePercent > 0 ? '+' : ''}
              {data.totalVariancePercent.toFixed(1)}%
            </Badge>
          </div>
        </div>
      </div>
    </div>
  );
}
