import { useQuery } from '@tanstack/react-query';
import { useUsers } from '@/services/users.service';
import { agreementEndpoints } from '@/api/endpoints/agreements.endpoints';
import { planEndpoints } from '@/api/endpoints/plans.endpoints';
import { auditEndpoints } from '@/api/endpoints/audit.endpoints';
import { Users, FileCheck, Target, Clock, CheckCircle2, AlertCircle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import { useMe } from '@/services/users.service';

interface Activity {
  id: string;
  type: 'plan' | 'agreement' | 'user' | 'system';
  action: string;
  user: string;
  timestamp: Date;
  status?: 'success' | 'pending' | 'error';
}

export function DashboardPage() {
  const { data: user } = useMe();
  const isAdmin = user?.role === 'ADMIN';

  // Kullanıcı verilerini getir
  const { data: users, isLoading: usersLoading } = useUsers();
  const totalUsers = Array.isArray(users) ? users.length : 0;

  // Anlaşma verilerini getir
  const { data: agreements, isLoading: agreementsLoading } = useQuery({
    queryKey: ['agreements', 'all'],
    queryFn: () => agreementEndpoints.getAll().then((res) => res.data),
    enabled: isAdmin,
  });
  const agreementsArray = Array.isArray(agreements) ? agreements : [];
  const totalAgreements = agreementsArray.length;
  const pendingAgreements = agreementsArray.filter(
    (a) => a.status === 'PENDING'
  ).length;

  // Plan verilerini getir
  const { data: plans, isLoading: plansLoading } = useQuery({
    queryKey: ['plans', 'all'],
    queryFn: () => planEndpoints.getAll().then((res) => res.data),
    enabled: isAdmin,
  });
  const plansArray = Array.isArray(plans) ? plans : [];
  const totalPlans = plansArray.length;
  const pendingPlans = plansArray.filter(
    (p) => p.status === 'PENDING_APPROVAL'
  ).length;

  // Audit log verilerini getir
  const { data: auditLogs, isLoading: auditLoading } = useQuery({
    queryKey: ['audit-logs', 'recent'],
    queryFn: () => auditEndpoints.getAll(20).then((res) => res.data),
    enabled: isAdmin,
  });

  const isLoading = usersLoading || agreementsLoading || plansLoading || auditLoading;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <LoadingSpinner />
      </div>
    );
  }

  // Audit log'ları aktivite formatına dönüştür
  const activities: Activity[] = (auditLogs || []).map((log) => {
    let type: Activity['type'] = 'system';
    let action = log.actionType;
    
    if (log.entityType === 'PLAN') {
      type = 'plan';
      action = `Plan ${log.actionType.toLowerCase()}`;
    } else if (log.entityType === 'AGREEMENT') {
      type = 'agreement';
      action = `Anlaşma ${log.actionType.toLowerCase()}`;
    } else if (log.entityType === 'USER') {
      type = 'user';
      action = `Kullanıcı ${log.actionType.toLowerCase()}`;
    }

    return {
      id: log.id,
      type,
      action,
      user: log.adminEmail,
      timestamp: new Date(log.createdAt),
      status: log.result === 'SUCCESS' ? 'success' : 'error',
    };
  });

  const formatTimeAgo = (date: Date) => {
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) return `${days} gün önce`;
    if (hours > 0) return `${hours} saat önce`;
    if (minutes > 0) return `${minutes} dakika önce`;
    return 'Az önce';
  };

  const getActivityIcon = (type: Activity['type']) => {
    switch (type) {
      case 'plan':
        return Target;
      case 'agreement':
        return FileCheck;
      case 'user':
        return Users;
      default:
        return Clock;
    }
  };

  const getActivityColor = (status?: Activity['status']) => {
    switch (status) {
      case 'success':
        return 'text-green-600';
      case 'pending':
        return 'text-yellow-600';
      case 'error':
        return 'text-red-600';
      default:
        return 'text-gray-600';
    }
  };

  if (!isAdmin) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-gray-600 mt-1">Overview and key metrics</p>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <p className="text-gray-500">Bu sayfa sadece Admin kullanıcıları için kullanılabilir.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Admin Dashboard</h1>
        <p className="text-gray-600 mt-2">Sistem genel durumu ve istatistikler</p>
      </div>

      {/* İstatistik Kartları */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Kullanıcı Yönetimi */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Kullanıcı Yönetimi</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalUsers}</div>
            <p className="text-xs text-muted-foreground">Toplam kullanıcılar</p>
          </CardContent>
        </Card>

        {/* Anlaşmalar */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Anlaşmalar</CardTitle>
            <FileCheck className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalAgreements}</div>
            <p className="text-xs text-muted-foreground mb-2">Toplam anlaşmalar</p>
            {pendingAgreements > 0 && (
              <div className="flex items-center gap-2 mt-2">
                <Badge variant="destructive" className="text-xs">
                  {pendingAgreements}
                </Badge>
                <span className="text-xs text-muted-foreground">Onay bekleyen</span>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Planlar */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Planlar</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalPlans}</div>
            <p className="text-xs text-muted-foreground mb-2">Toplam planlar</p>
            {pendingPlans > 0 && (
              <div className="flex items-center gap-2 mt-2">
                <Badge variant="destructive" className="text-xs">
                  {pendingPlans}
                </Badge>
                <span className="text-xs text-muted-foreground">Onay bekleyen</span>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Aktiviteler */}
      <Card>
        <CardHeader>
          <CardTitle>Aktiviteler</CardTitle>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[400px]">
            <div className="space-y-4">
              {activities.length === 0 ? (
                <p className="text-sm text-gray-500 text-center py-8">Henüz aktivite bulunmuyor</p>
              ) : (
                activities.map((activity) => {
                  const Icon = getActivityIcon(activity.type);
                  const StatusIcon = activity.status === 'success' 
                    ? CheckCircle2 
                    : activity.status === 'pending' 
                    ? Clock 
                    : AlertCircle;

                  return (
                    <div
                      key={activity.id}
                      className="flex items-start gap-4 p-3 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors"
                    >
                      <div className={`p-2 rounded-full bg-gray-100 ${getActivityColor(activity.status)}`}>
                        <Icon className="h-4 w-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <p className="text-sm font-medium text-gray-900">{activity.action}</p>
                          {activity.status && (
                            <StatusIcon
                              className={`h-4 w-4 ${getActivityColor(activity.status)}`}
                            />
                          )}
                        </div>
                        <div className="flex items-center gap-2 text-xs text-gray-500">
                          <span>{activity.user}</span>
                          <span>•</span>
                          <span>{formatTimeAgo(activity.timestamp)}</span>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
}

