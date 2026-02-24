import { useQuery } from '@tanstack/react-query';
import { financeReportingEndpoints, ReportFilters } from '@/api/endpoints/finance-reporting.endpoints';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

interface SpendTrendWidgetProps {
  filters: ReportFilters;
}

export function SpendTrendWidget({ filters }: SpendTrendWidgetProps) {
  const { data, isLoading, error } = useQuery({
    queryKey: ['spend-trend', filters],
    queryFn: () => financeReportingEndpoints.getSpendTrend(filters, 'monthly'),
    staleTime: 30000,
  });

  if (isLoading) {
    return <LoadingSpinner />;
  }

  if (error || !data) {
    return <div className="text-red-500 text-sm">Veri yüklenirken hata oluştu</div>;
  }

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('tr-TR', {
      style: 'currency',
      currency: 'TRY',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const chartData = data.dataPoints.map((dp) => ({
    date: new Date(dp.date).toLocaleDateString('tr-TR', { month: 'short', year: 'numeric' }),
    'On-Invoice': dp.onInvoice,
    'Off-Invoice': dp.offInvoice,
    'LTA On': dp.ltaOnInvoice || 0,
    'LTA Off': dp.ltaOffInvoice || 0,
    'Promo On': dp.promoOnInvoice || 0,
    'Promo Off': dp.promoOffInvoice || 0,
  }));

  return (
    <div className="space-y-4">
      <ResponsiveContainer width="100%" height={300}>
        <LineChart data={chartData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
          <XAxis
            dataKey="date"
            stroke="#6b7280"
            fontSize={12}
            tickLine={false}
            axisLine={false}
          />
          <YAxis
            stroke="#6b7280"
            fontSize={12}
            tickLine={false}
            axisLine={false}
            tickFormatter={(value) => {
              if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M`;
              if (value >= 1000) return `${(value / 1000).toFixed(1)}K`;
              return value.toString();
            }}
          />
          <Tooltip
            formatter={(value: number) => formatCurrency(value)}
            contentStyle={{
              backgroundColor: 'white',
              border: '1px solid #e5e7eb',
              borderRadius: '8px',
              padding: '8px',
            }}
            labelStyle={{ fontWeight: 'bold', marginBottom: '4px' }}
          />
          <Legend
            wrapperStyle={{ paddingTop: '20px' }}
            iconType="line"
          />
          <Line
            type="monotone"
            dataKey="On-Invoice"
            stroke="#3b82f6"
            strokeWidth={2}
            dot={{ r: 4, fill: '#3b82f6' }}
            activeDot={{ r: 6 }}
            name="On-Invoice"
          />
          <Line
            type="monotone"
            dataKey="Off-Invoice"
            stroke="#f97316"
            strokeWidth={2}
            strokeDasharray="5 5"
            dot={{ r: 4, fill: '#f97316' }}
            activeDot={{ r: 6 }}
            name="Off-Invoice"
          />
        </LineChart>
      </ResponsiveContainer>

      <div className="grid grid-cols-2 gap-4 text-sm pt-4 border-t">
        <div>
          <span className="text-gray-500">Total On-Invoice:</span>
          <span className="ml-2 font-semibold text-blue-600">
            {formatCurrency(data.totalOnInvoice)}
          </span>
        </div>
        <div>
          <span className="text-gray-500">Total Off-Invoice:</span>
          <span className="ml-2 font-semibold text-orange-600">
            {formatCurrency(data.totalOffInvoice)}
          </span>
        </div>
        <div>
          <span className="text-gray-500">Avg Daily On-Invoice:</span>
          <span className="ml-2 font-semibold">{formatCurrency(data.avgDailyOnInvoice)}</span>
        </div>
        <div>
          <span className="text-gray-500">Avg Daily Off-Invoice:</span>
          <span className="ml-2 font-semibold">{formatCurrency(data.avgDailyOffInvoice)}</span>
        </div>
      </div>
    </div>
  );
}
