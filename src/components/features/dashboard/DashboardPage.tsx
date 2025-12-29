import { MetricCard } from './MetricCard';
import { ProfitabilityChart } from './ProfitabilityChart';
import { RecentTransactions } from './RecentTransactions';

export function DashboardPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-600 mt-1">Overview and key metrics</p>
      </div>

      {/* Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <MetricCard
          title="Gross Sales (2026-01)"
          value="₺4.600.000"
        />
        <MetricCard
          title="Total Spending"
          value="₺1.660.000"
          subtitle="On-Inv: ₺1.380.000"
        />
        <MetricCard
          title="Discount Rate"
          value="%36.1"
        />
        <MetricCard
          title="Pending Approval"
          value="1 Item"
        />
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Chart - Takes 2 columns */}
        <div className="lg:col-span-2">
          <ProfitabilityChart />
        </div>

        {/* Recent Transactions - Takes 1 column */}
        <div className="lg:col-span-1">
          <RecentTransactions />
        </div>
      </div>
    </div>
  );
}

