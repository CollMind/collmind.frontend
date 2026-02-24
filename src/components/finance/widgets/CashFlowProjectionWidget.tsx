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

interface CashFlowProjectionWidgetProps {
  filters: ReportFilters;
}

export function CashFlowProjectionWidget({ filters }: CashFlowProjectionWidgetProps) {
  const { data, isLoading, error } = useQuery({
    queryKey: ['cash-flow-projection', filters],
    queryFn: () => financeReportingEndpoints.getCashFlowProjection(filters, 12),
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
      <div className="grid grid-cols-3 gap-4 p-4 bg-gray-50 rounded-lg">
        <div>
          <div className="text-sm text-gray-500">Total On-Invoice</div>
          <div className="text-lg font-bold text-blue-600">
            {formatCurrency(data.totalOnInvoiceOutflow)}
          </div>
        </div>
        <div>
          <div className="text-sm text-gray-500">Total Off-Invoice</div>
          <div className="text-lg font-bold text-orange-600">
            {formatCurrency(data.totalOffInvoiceOutflow)}
          </div>
        </div>
        <div>
          <div className="text-sm text-gray-500">Total Outflow</div>
          <div className="text-lg font-bold">
            {formatCurrency(data.totalOutflow)}
          </div>
        </div>
      </div>

      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Month</TableHead>
              <TableHead className="text-right">On-Invoice</TableHead>
              <TableHead className="text-right">Off-Invoice</TableHead>
              <TableHead className="text-right">Total</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.projections.map((projection) => (
              <TableRow key={projection.month}>
                <TableCell className="font-medium">
                  {new Date(projection.month + '-01').toLocaleDateString('tr-TR', {
                    month: 'long',
                    year: 'numeric',
                  })}
                </TableCell>
                <TableCell className="text-right text-blue-600">
                  {formatCurrency(projection.onInvoiceOutflow)}
                </TableCell>
                <TableCell className="text-right text-orange-600">
                  {formatCurrency(projection.offInvoiceOutflow)}
                </TableCell>
                <TableCell className="text-right font-semibold">
                  {formatCurrency(projection.totalOutflow)}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {data.projections.length === 0 && (
        <div className="text-center text-gray-500 py-8 text-sm">
          Bu dönemde nakit akış projeksiyonu bulunmuyor.
        </div>
      )}
    </div>
  );
}
