import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  financeReportingEndpoints,
  ReportFilters,
  PaginationParams,
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
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight, ArrowUpDown } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface PlanPerformanceWidgetProps {
  filters: ReportFilters;
}

export function PlanPerformanceWidget({ filters }: PlanPerformanceWidgetProps) {
  const [pagination, setPagination] = useState<PaginationParams>({
    page: 1,
    limit: 50,
    sortBy: 'totalSpend',
    sortOrder: 'DESC',
  });

  const { data, isLoading, error } = useQuery({
    queryKey: ['plan-performance', filters, pagination],
    queryFn: async () => {
      const res = await financeReportingEndpoints.getPlanPerformance(
        filters,
        pagination
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

  const getRagBadge = (status: string) => {
    const colors: Record<string, string> = {
      GREEN: 'bg-green-100 text-green-800',
      AMBER: 'bg-amber-100 text-amber-800',
      RED: 'bg-red-100 text-red-800',
    };
    return (
      <Badge className={colors[status] || 'bg-gray-100 text-gray-800'}>
        {status}
      </Badge>
    );
  };

  const handleSort = (field: string) => {
    setPagination((prev) => ({
      ...prev,
      sortBy: field,
      sortOrder:
        prev.sortBy === field && prev.sortOrder === 'ASC' ? 'DESC' : 'ASC',
    }));
  };

  // Use lazy loading for large datasets - only render visible rows
  const useLazyLoading = data.rows.length > 100;
  const [visibleRange, setVisibleRange] = useState({ start: 0, end: 50 });

  const visibleRows = useMemo(() => {
    if (!useLazyLoading) return data.rows;
    return data.rows.slice(visibleRange.start, visibleRange.end);
  }, [data.rows, visibleRange, useLazyLoading]);

  const TableContent = () => {
    return (
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8"
                  onClick={() => handleSort('planName')}
                >
                  Plan Name
                  <ArrowUpDown className="ml-2 h-3 w-3" />
                </Button>
              </TableHead>
              <TableHead>CPL</TableHead>
              <TableHead>Category</TableHead>
              <TableHead>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8"
                  onClick={() => handleSort('totalSpend')}
                >
                  Total Spend
                  <ArrowUpDown className="ml-2 h-3 w-3" />
                </Button>
              </TableHead>
              <TableHead>On-Inv %</TableHead>
              <TableHead>Off-Inv %</TableHead>
              <TableHead>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8"
                  onClick={() => handleSort('gpRoi')}
                >
                  GP ROI %
                  <ArrowUpDown className="ml-2 h-3 w-3" />
                </Button>
              </TableHead>
              <TableHead>RAG</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {visibleRows.map((row) => (
              <TableRow key={row.planId}>
                <TableCell className="font-medium">{row.planName}</TableCell>
                <TableCell>{row.cplName}</TableCell>
                <TableCell>{row.category}</TableCell>
                <TableCell>{formatCurrency(row.totalSpend)}</TableCell>
                <TableCell>{row.onInvoicePercent.toFixed(1)}%</TableCell>
                <TableCell>{row.offInvoicePercent.toFixed(1)}%</TableCell>
                <TableCell>{row.gpRoi.toFixed(1)}%</TableCell>
                <TableCell>{getRagBadge(row.ragStatus)}</TableCell>
                <TableCell>
                  <Badge variant="outline">{row.status}</Badge>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        {useLazyLoading && visibleRange.end < data.rows.length && (
          <div className="p-4 text-center">
            <Button
              variant="outline"
              onClick={() => {
                setVisibleRange((prev) => ({
                  start: prev.start,
                  end: Math.min(prev.end + 50, data.rows.length),
                }));
              }}
            >
              Daha Fazla Yükle ({data.rows.length - visibleRange.end} kaldı)
            </Button>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-4">
      <TableContent />

      {/* Pagination */}
      <div className="flex items-center justify-between">
        <div className="text-sm text-gray-500">
          Toplam {data.total} plan, Sayfa {data.page} / {data.totalPages}
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={data.page === 1}
            onClick={() =>
              setPagination((prev) => ({ ...prev, page: prev.page! - 1 }))
            }
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            disabled={data.page === data.totalPages}
            onClick={() =>
              setPagination((prev) => ({ ...prev, page: prev.page! + 1 }))
            }
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
