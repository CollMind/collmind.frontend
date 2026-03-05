import { useMe, useDashboardSummary } from '@/services/users.service';
import { CheckCircle2, FileText, Wallet, TrendingUp, BarChart3, Building2, Clock } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import { Link } from 'react-router-dom';
import { isReadOnly } from '@/utils/roleUtils';

export function DashboardPage() {
  const { data: user, isLoading: userLoading } = useMe();
  const { data: dashboardData, isLoading: dashboardLoading } = useDashboardSummary();

  const isLoading = userLoading || dashboardLoading;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <LoadingSpinner />
      </div>
    );
  }

  const formatCurrency = (amount: number) => {
    if (amount >= 1000000) {
      return `₺${(amount / 1000000).toFixed(1)}M`;
    } else if (amount >= 1000) {
      return `₺${(amount / 1000).toFixed(1)}K`;
    }
    return `₺${amount.toFixed(0)}`;
  };

  const activeOperations = dashboardData?.activeOperations || 0;
  const drafts = dashboardData?.drafts || 0;
  const managedBudget = dashboardData?.managedBudget || 0;
  const budgetUsage = dashboardData?.budgetUsage || 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
        </div>
      </div>

      {/* Welcome Section */}
      <div className="space-y-2">
        <h2 className="text-2xl font-bold text-gray-900">
          Hoş Geldin, {user?.fullName || 'Kullanıcı'} 👋
        </h2>
        <p className="text-gray-600">
          Bugün planlamalarında yapman gerekenler aşağıda.
        </p>
      </div>

      {/* Action Buttons */}
      {!isReadOnly(user?.role) && (
        <div className="flex gap-4 justify-end">
          <Link to="/agreements?new=true">
            <Button variant="outline" className="bg-blue-50 text-blue-700 hover:bg-blue-100">
              <FileText className="mr-2 h-4 w-4" />
              Yeni Anlaşma
            </Button>
          </Link>
          <Link to="/plans?new=true">
            <Button className="bg-blue-600 text-white hover:bg-blue-700">
              <span className="mr-2">+</span>
              Yeni Plan
            </Button>
          </Link>
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Aktif İşlemler */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">AKTİF İŞLEMLER</CardTitle>
            <CheckCircle2 className="h-5 w-5 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{activeOperations}</div>
          </CardContent>
        </Card>

        {/* Taslaklar */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">TASLAKLAR</CardTitle>
            <FileText className="h-5 w-5 text-gray-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{drafts}</div>
          </CardContent>
        </Card>

        {/* Yönetilen Bütçe */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">YÖNETİLEN BÜTÇE</CardTitle>
            <Wallet className="h-5 w-5 text-gray-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(managedBudget)}</div>
          </CardContent>
        </Card>

        {/* Bütçe Durumu (Q1) */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">BÜTÇE DURUMU (Q1)</CardTitle>
            <TrendingUp className="h-5 w-5 text-gray-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">%{budgetUsage.toFixed(1)}</div>
            <Progress value={budgetUsage} className="mt-2" />
          </CardContent>
        </Card>
      </div>

      {/* Navigation Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Planlama Grid'i */}
        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader>
            <div className="flex items-center gap-3">
              <BarChart3 className="h-6 w-6 text-blue-600" />
              <CardTitle>Planlama Grid'i</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-600 mb-4">
              Mevcut planlarını düzenle, kopyala veya detaylı analiz et.
            </p>
            <Link to="/plans">
              <Button variant="link" className="p-0 text-blue-600">
                Planlara Git →
              </Button>
            </Link>
          </CardContent>
        </Card>

        {/* Anlaşmalarım */}
        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader>
            <div className="flex items-center gap-3">
              <Building2 className="h-6 w-6 text-blue-600" />
              <CardTitle>Anlaşmalarım</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-600 mb-4">
              STA ve LTA anlaşmalarını yönet, durumlarını takip et.
            </p>
            <Link to="/agreements">
              <Button variant="link" className="p-0 text-blue-600">
                Anlaşmalara Git →
              </Button>
            </Link>
          </CardContent>
        </Card>

        {/* Performans Raporu */}
        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader>
            <div className="flex items-center gap-3">
              <Clock className="h-6 w-6 text-blue-600" />
              <CardTitle>Performans Raporu</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-600 mb-4">
              Planlarının gerçekleşen satış ve ROI performansını incele.
            </p>
            <Button variant="link" className="p-0 text-blue-600" disabled>
              Rapora Git →
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
