import { useUser } from '@/services/users.service';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import { EmptyState } from '@/components/common/EmptyState';
import { EnumBadge } from '@/components/common/EnumBadge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Edit, Mail, Phone, Building, Briefcase, Calendar, Shield } from 'lucide-react';
import { format } from 'date-fns';
import { tr } from 'date-fns/locale';

interface UserDetailProps {
  userId: string;
  onEdit?: () => void;
}

export function UserDetail({ userId, onEdit }: UserDetailProps) {
  const { data: user, isLoading, error } = useUser(userId);

  if (isLoading) return <LoadingSpinner />;

  if (error) {
    return (
      <div className="text-red-600 p-4">
        Kullanıcı yüklenirken bir hata oluştu:{' '}
        {error instanceof Error ? error.message : 'Bilinmeyen hata'}
      </div>
    );
  }

  if (!user) {
    return <EmptyState message="Kullanıcı bulunamadı" />;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold">{user.fullName}</h1>
          <p className="text-gray-600 mt-1">{user.email}</p>
        </div>
        {onEdit && (
          <Button onClick={onEdit}>
            <Edit className="mr-2 h-4 w-4" />
            Düzenle
          </Button>
        )}
      </div>

      {/* Main Info Card */}
      <Card>
        <CardHeader>
          <CardTitle>Kullanıcı Bilgileri</CardTitle>
          <CardDescription>Kullanıcının temel bilgileri</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex items-start gap-3">
              <Mail className="h-5 w-5 text-gray-400 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-gray-500">Email</p>
                <p className="text-sm text-gray-900">{user.email}</p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <Shield className="h-5 w-5 text-gray-400 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-gray-500">Rol</p>
                <div className="mt-1">
                  <EnumBadge value={user.role} type="role" />
                </div>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <Shield className="h-5 w-5 text-gray-400 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-gray-500">Durum</p>
                <div className="mt-1">
                  <EnumBadge value={user.status} type="status" />
                </div>
              </div>
            </div>

            {user.phoneNumber && (
              <div className="flex items-start gap-3">
                <Phone className="h-5 w-5 text-gray-400 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-gray-500">Telefon</p>
                  <p className="text-sm text-gray-900">{user.phoneNumber}</p>
                </div>
              </div>
            )}

            {user.department && (
              <div className="flex items-start gap-3">
                <Building className="h-5 w-5 text-gray-400 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-gray-500">Departman</p>
                  <p className="text-sm text-gray-900">{user.department}</p>
                </div>
              </div>
            )}

            {user.jobTitle && (
              <div className="flex items-start gap-3">
                <Briefcase className="h-5 w-5 text-gray-400 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-gray-500">Pozisyon</p>
                  <p className="text-sm text-gray-900">{user.jobTitle}</p>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Additional Info Card */}
      <Card>
        <CardHeader>
          <CardTitle>Ek Bilgiler</CardTitle>
          <CardDescription>Kullanıcının ek bilgileri</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {user.firstName && (
              <div>
                <p className="text-sm font-medium text-gray-500">Ad</p>
                <p className="text-sm text-gray-900">{user.firstName}</p>
              </div>
            )}

            {user.lastName && (
              <div>
                <p className="text-sm font-medium text-gray-500">Soyad</p>
                <p className="text-sm text-gray-900">{user.lastName}</p>
              </div>
            )}

            <div>
              <p className="text-sm font-medium text-gray-500">Tenant ID</p>
              <p className="text-sm text-gray-900 font-mono">{user.tenantId}</p>
            </div>

            {user.lastLoginAt && (
              <div className="flex items-start gap-3">
                <Calendar className="h-5 w-5 text-gray-400 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-gray-500">Son Giriş</p>
                  <p className="text-sm text-gray-900">
                    {format(new Date(user.lastLoginAt), 'dd MMMM yyyy, HH:mm', {
                      locale: tr,
                    })}
                  </p>
                </div>
              </div>
            )}

            <div className="flex items-start gap-3">
              <Calendar className="h-5 w-5 text-gray-400 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-gray-500">Oluşturulma Tarihi</p>
                <p className="text-sm text-gray-900">
                  {format(new Date(user.createdAt), 'dd MMMM yyyy, HH:mm', {
                    locale: tr,
                  })}
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <Calendar className="h-5 w-5 text-gray-400 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-gray-500">Güncellenme Tarihi</p>
                <p className="text-sm text-gray-900">
                  {format(new Date(user.updatedAt), 'dd MMMM yyyy, HH:mm', {
                    locale: tr,
                  })}
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
