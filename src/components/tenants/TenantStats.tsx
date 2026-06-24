import { useTenantStats } from '@/services/tenants.service';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Users, Building2, Wallet, FileText } from 'lucide-react';

interface TenantStatsProps {
  tenantId: string;
}

export function TenantStats({ tenantId }: TenantStatsProps) {
  const { data: stats, isLoading, error } = useTenantStats(tenantId);

  if (isLoading) return <LoadingSpinner />;

  if (error) {
    return (
      <div className="text-red-600 p-4">
        İstatistikler yüklenirken bir hata oluştu:{' '}
        {error instanceof Error ? error.message : 'Bilinmeyen hata'}
      </div>
    );
  }

  if (!stats) {
    return null;
  }

  const statCards = [
    {
      title: 'Toplam Kullanıcı',
      value: stats.totalUsers,
      icon: Users,
      description: 'Aktif kullanıcı sayısı',
    },
    {
      title: 'Toplam Müşteri',
      value: stats.totalCustomers,
      icon: Building2,
      description: 'Kayıtlı müşteri sayısı',
    },
    {
      title: 'Bütçe Zarfı',
      value: stats.totalBudgetEnvelopes,
      icon: Wallet,
      description: 'Toplam bütçe zarfı sayısı',
    },
    {
      title: 'Anlaşma',
      value: stats.totalAgreements,
      icon: FileText,
      description: 'Toplam anlaşma sayısı',
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {statCards.map((stat) => {
        const Icon = stat.icon;
        return (
          <Card key={stat.title}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                {stat.title}
              </CardTitle>
              <Icon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stat.value}</div>
              <p className="text-xs text-muted-foreground mt-1">
                {stat.description}
              </p>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
