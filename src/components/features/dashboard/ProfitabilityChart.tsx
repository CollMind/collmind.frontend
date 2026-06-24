import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface ChartData {
  category: string;
  netSales: number;
  totalSpending: number;
  percentage: number;
}

const dummyData: ChartData[] = [
  {
    category: 'Migros',
    netSales: 1000000,
    totalSpending: 200000,
    percentage: 40.0,
  },
  {
    category: 'Yerel',
    netSales: 1100000,
    totalSpending: 100000,
    percentage: 30.0,
  },
  {
    category: 'Gratis',
    netSales: 700000,
    totalSpending: 100000,
    percentage: 30.0,
  },
  {
    category: 'Mopaş',
    netSales: 300000,
    totalSpending: 100000,
    percentage: 50.0,
  },
  { category: 'Diğer', netSales: 0, totalSpending: 0, percentage: 0.0 },
  { category: 'Marmara', netSales: 0, totalSpending: 0, percentage: 0.0 },
];

const formatCurrency = (value: number): string => {
  if (value === 0) return '₺0';
  const millions = value / 1000000;
  return `₺${millions.toFixed(1)}M`;
};

const formatCurrencyFull = (value: number): string => {
  return new Intl.NumberFormat('tr-TR', {
    style: 'currency',
    currency: 'TRY',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
};

export function ProfitabilityChart() {
  const maxValue = 1600000; // 1.6M for consistent scaling
  const chartHeight = 256; // 16rem = 256px

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg font-medium">
          CPL-Based Profitability (Revenue vs Spending)
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          {/* Legend */}
          <div className="flex items-center gap-4 text-sm">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded bg-blue-300"></div>
              <span className="text-gray-700">Net Sales</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded bg-pink-300"></div>
              <span className="text-gray-700">Total Spending</span>
            </div>
          </div>

          {/* Chart */}
          <div className="relative">
            <div className="flex items-end gap-4">
              {/* Y-axis labels */}
              <div className="w-16 flex flex-col justify-end h-64 text-xs text-gray-500 relative">
                {[1.6, 1.2, 0.8, 0.4, 0].map((val) => {
                  const position = (val / 1.6) * 100;
                  return (
                    <div
                      key={val}
                      className="absolute right-0"
                      style={{
                        bottom: `${position}%`,
                        transform: 'translateY(50%)',
                      }}
                    >
                      ₺{val.toFixed(1)}M
                    </div>
                  );
                })}
              </div>

              {/* Bars */}
              <div className="flex-1 flex items-end gap-3 h-64 relative pl-4">
                {/* Grid lines */}
                {[1.6, 1.2, 0.8, 0.4, 0].map((val) => {
                  const position = (val / 1.6) * 100;
                  return (
                    <div
                      key={`grid-${val}`}
                      className="absolute left-4 right-0 border-t border-gray-200"
                      style={{
                        bottom: `${position}%`,
                      }}
                    />
                  );
                })}

                {dummyData.map((item, index) => {
                  const totalValue = item.netSales + item.totalSpending;
                  const netSalesHeight =
                    (item.netSales / maxValue) * chartHeight;
                  const spendingHeight =
                    (item.totalSpending / maxValue) * chartHeight;
                  const totalHeight = netSalesHeight + spendingHeight;

                  return (
                    <div
                      key={index}
                      className="flex-1 flex flex-col items-center gap-1 h-full relative"
                    >
                      {/* Percentage label */}
                      <div className="text-xs font-normal text-gray-700 mb-auto">
                        %{item.percentage.toFixed(1)}
                      </div>

                      {/* Bar container */}
                      <div className="w-full flex flex-col justify-end h-full relative">
                        {totalValue > 0 ? (
                          <div
                            className="w-full flex flex-col"
                            style={{
                              height: `${totalHeight}px`,
                              minHeight: '4px',
                            }}
                          >
                            {/* Net Sales (bottom) */}
                            {item.netSales > 0 && (
                              <div
                                className="w-full bg-blue-300 rounded-t"
                                style={{
                                  height: `${netSalesHeight}px`,
                                  minHeight: netSalesHeight > 0 ? '2px' : '0',
                                }}
                              />
                            )}
                            {/* Total Spending (top) */}
                            {item.totalSpending > 0 && (
                              <div
                                className="w-full bg-pink-300 rounded-b"
                                style={{
                                  height: `${spendingHeight}px`,
                                  minHeight: spendingHeight > 0 ? '2px' : '0',
                                }}
                              />
                            )}
                          </div>
                        ) : (
                          <div className="w-full h-1 bg-gray-100 rounded"></div>
                        )}
                      </div>

                      {/* Category label */}
                      <div className="text-xs text-gray-600 mt-1 text-center">
                        {item.category}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
