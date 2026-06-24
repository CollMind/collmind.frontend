import { useQuery } from '@tanstack/react-query';
import { customerEndpoints } from '@/api/endpoints/customers.endpoints';
import { useCustomers } from '@/services/customers.service';
import { cplEndpoints } from '@/api/endpoints/master-data.endpoints';
import { fuEndpoints } from '@/api/endpoints/master-data.endpoints';
import { skuEndpoints } from '@/api/endpoints/master-data.endpoints';
import { kpiEndpoints } from '@/api/endpoints/kpi.endpoints';
import { Users, ClipboardList, Factory, Boxes, TrendingUp } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';

export function AdminOverviewPage() {
  // Müşteri verilerini getir - filters olmadan tüm müşterileri al
  // Backend'den paginated response gelebilir, bu yüzden useCustomers hook'unu kullanıyoruz
  const { data: customers, isLoading: customersLoading } = useCustomers();

  // Response formatını kontrol et: array veya paginated object olabilir
  let customersArray: any[] = [];
  if (Array.isArray(customers)) {
    customersArray = customers;
  } else if (
    customers &&
    typeof customers === 'object' &&
    'data' in customers
  ) {
    customersArray = (customers as any).data || [];
  }

  const totalCustomers = customersArray.length;

  // CPL verilerini getir
  const { data: cpls, isLoading: cplsLoading } = useQuery({
    queryKey: ['cpls', 'all'],
    queryFn: () => cplEndpoints.getAll().then((res) => res.data),
  });
  const cplsArray = Array.isArray(cpls) ? cpls : [];
  const totalCpls = cplsArray.length;

  // FU verilerini getir
  const { data: fus, isLoading: fusLoading } = useQuery({
    queryKey: ['forecasting-units', 'all'],
    queryFn: () => fuEndpoints.getAll().then((res) => res.data),
  });
  const fusArray = Array.isArray(fus) ? fus : [];
  const totalFus = fusArray.length;

  // SKU verilerini getir
  const { data: skus, isLoading: skusLoading } = useQuery({
    queryKey: ['skus', 'all'],
    queryFn: () => skuEndpoints.getAll().then((res) => res.data),
  });
  const skusArray = Array.isArray(skus) ? skus : [];
  const totalSkus = skusArray.length;

  // KPI verilerini getir
  const { data: kpis, isLoading: kpisLoading } = useQuery({
    queryKey: ['kpis', 'all'],
    queryFn: () => kpiEndpoints.getAll().then((res) => res.data),
  });
  const kpisArray = Array.isArray(kpis) ? kpis : [];
  const totalKpis = kpisArray.length;

  const isLoading =
    customersLoading || cplsLoading || fusLoading || skusLoading || kpisLoading;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Admin Genel Bakış</h1>
        <p className="text-gray-600 mt-2">
          Master veri yönetimi ve istatistikler
        </p>
      </div>

      {/* Master Data Kartları */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
        {/* Müşteri */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Müşteri</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalCustomers}</div>
            <p className="text-xs text-muted-foreground">Toplam müşteri</p>
          </CardContent>
        </Card>

        {/* CPL */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">CPL</CardTitle>
            <ClipboardList className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalCpls}</div>
            <p className="text-xs text-muted-foreground">Toplam CPL</p>
          </CardContent>
        </Card>

        {/* FU */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">FU</CardTitle>
            <Factory className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalFus}</div>
            <p className="text-xs text-muted-foreground">
              Toplam Forecasting Unit
            </p>
          </CardContent>
        </Card>

        {/* SKU */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">SKU</CardTitle>
            <Boxes className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalSkus}</div>
            <p className="text-xs text-muted-foreground">Toplam SKU</p>
          </CardContent>
        </Card>

        {/* KPI */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">KPI</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalKpis}</div>
            <p className="text-xs text-muted-foreground">Toplam KPI</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
