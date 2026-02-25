import { useQuery } from '@tanstack/react-query';
import { financeReportingEndpoints, ReportFilters } from '@/api/endpoints/finance-reporting.endpoints';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

interface MechanicEffectivenessWidgetProps {
  filters: ReportFilters;
}

export function MechanicEffectivenessWidget({ filters }: MechanicEffectivenessWidgetProps) {
  const { data, isLoading, error } = useQuery({
    queryKey: ['mechanic-effectiveness', filters],
    queryFn: async () => {
      const res = await financeReportingEndpoints.getMechanicEffectiveness(filters);
      return res.data;
    },
    staleTime: 30000,
  });

  if (isLoading) {
    return <LoadingSpinner />;
  }

  if (error || !data) {
    return <div className="text-red-500 text-sm">Veri yüklenirken hata oluştu</div>;
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
      <div className="text-sm text-gray-500">
        Most Efficient: <span className="font-semibold text-gray-900">{data.mostEfficient}</span>
        {' | '}
        Least Efficient: <span className="font-semibold text-gray-900">{data.leastEfficient}</span>
      </div>

      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Mechanic</TableHead>
              <TableHead className="text-right">Total Spend</TableHead>
              <TableHead className="text-right">Plan Count</TableHead>
              <TableHead className="text-right">Avg GP ROI %</TableHead>
              <TableHead className="text-right">Efficiency Score</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.mechanics.map((mechanic) => (
              <TableRow key={mechanic.mechanicCode}>
                <TableCell className="font-medium">{mechanic.mechanicName}</TableCell>
                <TableCell className="text-right">{formatCurrency(mechanic.totalSpend)}</TableCell>
                <TableCell className="text-right">{mechanic.planCount}</TableCell>
                <TableCell className="text-right">{mechanic.avgGpRoi.toFixed(1)}%</TableCell>
                <TableCell className="text-right">
                  <span className="font-semibold">{mechanic.efficiencyScore.toFixed(2)}</span>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {data.mechanics.length === 0 && (
        <div className="text-center text-gray-500 py-8 text-sm">
          Bu dönemde mekanik kullanımı bulunmuyor.
        </div>
      )}
    </div>
  );
}
