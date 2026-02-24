import { useQuery } from '@tanstack/react-query';
import { financeReportingEndpoints, ReportFilters } from '@/api/endpoints/finance-reporting.endpoints';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';

interface SpendCompositionWidgetProps {
  filters: ReportFilters;
  type: 'onInvoice' | 'offInvoice';
}

export function SpendCompositionWidget({ filters, type }: SpendCompositionWidgetProps) {
  const { data, isLoading, error } = useQuery({
    queryKey: ['spend-composition', filters],
    queryFn: () => financeReportingEndpoints.getSpendComposition(filters),
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

  const slices = type === 'onInvoice' ? data.onInvoice : data.offInvoice;
  const total = type === 'onInvoice' ? data.totalOnInvoice : data.totalOffInvoice;

  // Colors for pie chart
  const COLORS = type === 'onInvoice'
    ? ['#3b82f6', '#60a5fa', '#93c5fd', '#dbeafe', '#bfdbfe', '#9bb5fe']
    : ['#f97316', '#fb923c', '#fdba74', '#fed7aa', '#ffedd5', '#ffe4cc'];

  const chartData = slices.map((slice) => ({
    name: slice.mechanicName,
    value: slice.amount,
    percentage: slice.percentage,
    planCount: slice.planCount,
    avgRoi: slice.avgRoi,
  }));

  const [selectedSlice, setSelectedSlice] = useState<string | null>(null);

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-white p-3 border border-gray-200 rounded-lg shadow-lg">
          <p className="font-semibold">{data.name}</p>
          <p className="text-sm text-gray-600">
            Amount: {formatCurrency(data.value)}
          </p>
          <p className="text-sm text-gray-600">
            Percentage: {data.percentage.toFixed(1)}%
          </p>
          <p className="text-sm text-gray-600">
            Plans: {data.planCount}
          </p>
          {data.avgRoi && (
            <p className="text-sm text-gray-600">
              Avg ROI: {data.avgRoi.toFixed(1)}%
            </p>
          )}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="space-y-4">
      <div className="text-sm text-gray-500">
        Total {type === 'onInvoice' ? 'On-Invoice' : 'Off-Invoice'}:{' '}
        <span className="font-semibold text-gray-900">{formatCurrency(total)}</span>
      </div>

      {slices.length > 0 ? (
        <>
          <ResponsiveContainer width="100%" height={250}>
            <PieChart>
              <Pie
                data={chartData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percentage }) => `${name}: ${percentage.toFixed(1)}%`}
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
                onClick={(data) => setSelectedSlice(selectedSlice === data.name ? null : data.name)}
                style={{ cursor: 'pointer' }}
              >
                {chartData.map((entry, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={COLORS[index % COLORS.length]}
                    opacity={selectedSlice === null || selectedSlice === entry.name ? 1 : 0.5}
                  />
                ))}
              </Pie>
              <Tooltip content={<CustomTooltip />} />
              <Legend />
            </PieChart>
          </ResponsiveContainer>

          <div className="space-y-2 max-h-48 overflow-y-auto">
            {slices.map((slice, idx) => (
              <div
                key={slice.mechanicCode}
                className={`flex items-center gap-3 p-2 rounded ${
                  selectedSlice === slice.mechanicName ? 'bg-blue-50' : ''
                }`}
                onClick={() => setSelectedSlice(selectedSlice === slice.mechanicName ? null : slice.mechanicName)}
                style={{ cursor: 'pointer' }}
              >
                <div
                  className="w-4 h-4 rounded"
                  style={{ backgroundColor: COLORS[idx % COLORS.length] }}
                />
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-medium">{slice.mechanicName}</span>
                    <span className="text-xs text-gray-500">{slice.percentage.toFixed(1)}%</span>
                  </div>
                  <div className="flex items-center justify-between text-xs text-gray-500">
                    <span>{formatCurrency(slice.amount)}</span>
                    <span>{slice.planCount} plan</span>
                    {slice.avgRoi && <span>Avg ROI: {slice.avgRoi.toFixed(1)}%</span>}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </>
      ) : (
        <div className="text-center text-gray-500 py-8 text-sm">
          Bu dönemde {type === 'onInvoice' ? 'On-Invoice' : 'Off-Invoice'} spend bulunmuyor.
        </div>
      )}
    </div>
  );
}
