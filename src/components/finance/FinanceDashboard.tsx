import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Badge } from '@/components/ui/badge';
import { RefreshCw, Download, Calendar as CalendarIcon, Filter, Maximize2, Minimize2 } from 'lucide-react';
import { format } from 'date-fns';
import { financeReportingEndpoints, ReportFilters } from '@/api/endpoints/finance-reporting.endpoints';
import { BudgetUtilizationWidget } from './widgets/BudgetUtilizationWidget';
import { SpendTrendWidget } from './widgets/SpendTrendWidget';
import { SpendCompositionWidget } from './widgets/SpendCompositionWidget';
import { PlanPerformanceWidget } from './widgets/PlanPerformanceWidget';
import { BudgetAtRiskWidget } from './widgets/BudgetAtRiskWidget';
import { MechanicEffectivenessWidget } from './widgets/MechanicEffectivenessWidget';
import { VarianceAnalysisWidget } from './widgets/VarianceAnalysisWidget';
import { CashFlowProjectionWidget } from './widgets/CashFlowProjectionWidget';

export function FinanceDashboard() {
  const [filters, setFilters] = useState<ReportFilters>({
    startDate: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0],
  });
  const [dateRange, setDateRange] = useState<{ from?: Date; to?: Date }>({
    from: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
    to: new Date(),
  });
  const [expandedWidget, setExpandedWidget] = useState<string | null>(null);

  const handlePeriodSelect = (period: string) => {
    const today = new Date();
    let start: Date;
    let end: Date = today;

    switch (period) {
      case 'thisMonth':
        start = new Date(today.getFullYear(), today.getMonth(), 1);
        break;
      case 'thisQuarter':
        const quarter = Math.floor(today.getMonth() / 3);
        start = new Date(today.getFullYear(), quarter * 3, 1);
        break;
      case 'thisYear':
        start = new Date(today.getFullYear(), 0, 1);
        break;
      case 'lastMonth':
        start = new Date(today.getFullYear(), today.getMonth() - 1, 1);
        end = new Date(today.getFullYear(), today.getMonth(), 0);
        break;
      case 'lastQuarter':
        const lastQuarter = Math.floor(today.getMonth() / 3) - 1;
        start = new Date(today.getFullYear(), lastQuarter * 3, 1);
        end = new Date(today.getFullYear(), (lastQuarter + 1) * 3, 0);
        break;
      default:
        return;
    }

    setDateRange({ from: start, to: end });
    setFilters({
      ...filters,
      startDate: start.toISOString().split('T')[0],
      endDate: end.toISOString().split('T')[0],
    });
  };

  const handleCustomDateRange = (range: { from?: Date; to?: Date }) => {
    setDateRange(range);
    if (range.from && range.to) {
      setFilters({
        ...filters,
        startDate: range.from.toISOString().split('T')[0],
        endDate: range.to.toISOString().split('T')[0],
      });
    }
  };

  const toggleWidget = (widgetId: string) => {
    setExpandedWidget(expandedWidget === widgetId ? null : widgetId);
  };

  // Fetch all reports for export
  const { data: budgetUtilization } = useQuery({
    queryKey: ['budget-utilization', filters],
    queryFn: () => financeReportingEndpoints.getBudgetUtilization(filters),
    staleTime: 30000,
  });

  const { data: spendTrend } = useQuery({
    queryKey: ['spend-trend', filters],
    queryFn: () => financeReportingEndpoints.getSpendTrend(filters, 'monthly'),
    staleTime: 30000,
  });

  const { data: spendComposition } = useQuery({
    queryKey: ['spend-composition', filters],
    queryFn: () => financeReportingEndpoints.getSpendComposition(filters),
    staleTime: 30000,
  });

  const { data: planPerformance } = useQuery({
    queryKey: ['plan-performance', filters, { page: 1, limit: 1000 }],
    queryFn: () => financeReportingEndpoints.getPlanPerformance(filters, { page: 1, limit: 1000 }),
    staleTime: 30000,
  });

  const { data: budgetAtRisk } = useQuery({
    queryKey: ['budget-at-risk', filters],
    queryFn: () => financeReportingEndpoints.getBudgetAtRisk(filters),
    staleTime: 30000,
  });

  const { data: mechanicEffectiveness } = useQuery({
    queryKey: ['mechanic-effectiveness', filters],
    queryFn: () => financeReportingEndpoints.getMechanicEffectiveness(filters),
    staleTime: 30000,
  });

  const { data: varianceAnalysis } = useQuery({
    queryKey: ['variance-analysis', filters],
    queryFn: () => financeReportingEndpoints.getVarianceAnalysis(filters, 'budget_vs_actual'),
    staleTime: 30000,
  });

  const { data: cashFlowProjection } = useQuery({
    queryKey: ['cash-flow-projection', filters],
    queryFn: () => financeReportingEndpoints.getCashFlowProjection(filters, 12),
    staleTime: 30000,
  });

  const handleExport = () => {
    // TODO: Implement export functionality
    console.log('Export functionality not yet implemented', {
      budgetUtilization,
      spendTrend,
      spendComposition,
      planPerformance,
      budgetAtRisk,
      mechanicEffectiveness,
      varianceAnalysis,
      cashFlowProjection,
      filters
    });
  };

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Finance Dashboard</h1>
          <p className="text-gray-500 mt-1">On-Invoice ve Off-Invoice spend analizi ve raporlama</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={handleExport}>
            <Download className="h-4 w-4 mr-2" />
            Export Excel
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              // Refetch all queries
              window.location.reload();
            }}
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Yenile
          </Button>
        </div>
      </div>

      {/* Filter Bar */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-4 flex-wrap">
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-gray-500" />
              <span className="text-sm font-medium">Filtreler:</span>
            </div>

            <Select onValueChange={handlePeriodSelect}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Periyot seçin" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="thisMonth">Bu Ay</SelectItem>
                <SelectItem value="thisQuarter">Bu Çeyrek</SelectItem>
                <SelectItem value="thisYear">Bu Yıl</SelectItem>
                <SelectItem value="lastMonth">Geçen Ay</SelectItem>
                <SelectItem value="lastQuarter">Geçen Çeyrek</SelectItem>
                <SelectItem value="custom">Özel Tarih Aralığı</SelectItem>
              </SelectContent>
            </Select>

            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="w-[280px] justify-start text-left font-normal">
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {dateRange.from && dateRange.to ? (
                    <>
                      {format(dateRange.from, 'dd MMM yyyy')} -{' '}
                      {format(dateRange.to, 'dd MMM yyyy')}
                    </>
                  ) : (
                    <span>Tarih aralığı seçin</span>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="range"
                  selected={{ from: dateRange.from, to: dateRange.to }}
                  onSelect={(range) => handleCustomDateRange(range || {})}
                  numberOfMonths={2}
                />
              </PopoverContent>
            </Popover>

            {/* Additional filters can be added here */}
          </div>
        </CardContent>
      </Card>

      {/* Widgets Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Budget Utilization */}
        <Card className={expandedWidget === 'budget' ? 'lg:col-span-2' : ''}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle>Bütçe Kullanım Özeti</CardTitle>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => toggleWidget('budget')}
            >
              {expandedWidget === 'budget' ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
            </Button>
          </CardHeader>
          <CardContent>
            <BudgetUtilizationWidget filters={filters} />
          </CardContent>
        </Card>

        {/* Spend Trend */}
        <Card className={expandedWidget === 'trend' ? 'lg:col-span-2' : ''}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle>Spend Trend</CardTitle>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => toggleWidget('trend')}
            >
              {expandedWidget === 'trend' ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
            </Button>
          </CardHeader>
          <CardContent>
            <SpendTrendWidget filters={filters} />
          </CardContent>
        </Card>

        {/* Spend Composition - On-Invoice */}
        <Card className={expandedWidget === 'composition-on' ? 'lg:col-span-2' : ''}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle>On-Invoice Spend Kompozisyonu</CardTitle>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => toggleWidget('composition-on')}
            >
              {expandedWidget === 'composition-on' ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
            </Button>
          </CardHeader>
          <CardContent>
            <SpendCompositionWidget filters={filters} type="onInvoice" />
          </CardContent>
        </Card>

        {/* Spend Composition - Off-Invoice */}
        <Card className={expandedWidget === 'composition-off' ? 'lg:col-span-2' : ''}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle>Off-Invoice Spend Kompozisyonu</CardTitle>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => toggleWidget('composition-off')}
            >
              {expandedWidget === 'composition-off' ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
            </Button>
          </CardHeader>
          <CardContent>
            <SpendCompositionWidget filters={filters} type="offInvoice" />
          </CardContent>
        </Card>

        {/* Budget at Risk */}
        <Card className={expandedWidget === 'risk' ? 'lg:col-span-2' : ''}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle>Budget at Risk Analizi</CardTitle>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => toggleWidget('risk')}
            >
              {expandedWidget === 'risk' ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
            </Button>
          </CardHeader>
          <CardContent>
            <BudgetAtRiskWidget filters={filters} />
          </CardContent>
        </Card>

        {/* Mechanic Effectiveness */}
        <Card className={expandedWidget === 'mechanic' ? 'lg:col-span-2' : ''}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle>Mekanik Etkinlik Raporu</CardTitle>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => toggleWidget('mechanic')}
            >
              {expandedWidget === 'mechanic' ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
            </Button>
          </CardHeader>
          <CardContent>
            <MechanicEffectivenessWidget filters={filters} />
          </CardContent>
        </Card>

        {/* Plan Performance */}
        <Card className={expandedWidget === 'performance' ? 'lg:col-span-2' : 'lg:col-span-2'}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle>Plan Performans Tablosu</CardTitle>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => toggleWidget('performance')}
            >
              {expandedWidget === 'performance' ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
            </Button>
          </CardHeader>
          <CardContent>
            <PlanPerformanceWidget filters={filters} />
          </CardContent>
        </Card>

        {/* Variance Analysis */}
        <Card className={expandedWidget === 'variance' ? 'lg:col-span-2' : ''}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle>Varyans Analizi</CardTitle>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => toggleWidget('variance')}
            >
              {expandedWidget === 'variance' ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
            </Button>
          </CardHeader>
          <CardContent>
            <VarianceAnalysisWidget filters={filters} />
          </CardContent>
        </Card>

        {/* Cash Flow Projection */}
        <Card className={expandedWidget === 'cashflow' ? 'lg:col-span-2' : ''}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle>Nakit Akış Projeksiyonu</CardTitle>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => toggleWidget('cashflow')}
            >
              {expandedWidget === 'cashflow' ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
            </Button>
          </CardHeader>
          <CardContent>
            <CashFlowProjectionWidget filters={filters} />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
