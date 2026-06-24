import { useTenant } from '@/services/tenants.service';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import { EmptyState } from '@/components/common/EmptyState';
import { EnumBadge } from '@/components/common/EnumBadge';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Edit,
  Mail,
  Phone,
  Building,
  MapPin,
  Calendar,
  Globe,
  Briefcase,
} from 'lucide-react';
import { format } from 'date-fns';
import { tr } from 'date-fns/locale';

interface TenantDetailProps {
  tenantId: string;
  onEdit?: () => void;
}

export function TenantDetail({ tenantId, onEdit }: TenantDetailProps) {
  const { data: tenant, isLoading, error } = useTenant(tenantId);

  if (isLoading) return <LoadingSpinner />;

  if (error) {
    return (
      <div className="text-red-600 p-4">
        Kiracı yüklenirken bir hata oluştu:{' '}
        {error instanceof Error ? error.message : 'Bilinmeyen hata'}
      </div>
    );
  }

  if (!tenant) {
    return <EmptyState message="Kiracı bulunamadı" />;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold">{tenant.name}</h1>
          {tenant.domain && (
            <p className="text-gray-600 mt-1">{tenant.domain}</p>
          )}
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
          <CardTitle>Kiracı Bilgileri</CardTitle>
          <CardDescription>Kiracının temel bilgileri</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex items-start gap-3">
              <Building className="h-5 w-5 text-gray-400 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-gray-500">Durum</p>
                <div className="mt-1">
                  <EnumBadge value={tenant.status} type="status" />
                </div>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <Briefcase className="h-5 w-5 text-gray-400 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-gray-500">Plan</p>
                <div className="mt-1">
                  <EnumBadge value={tenant.plan} type="plan" />
                </div>
              </div>
            </div>

            {tenant.domain && (
              <div className="flex items-start gap-3">
                <Globe className="h-5 w-5 text-gray-400 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-gray-500">Domain</p>
                  <p className="text-sm text-gray-900">{tenant.domain}</p>
                </div>
              </div>
            )}

            {tenant.industry && (
              <div className="flex items-start gap-3">
                <Briefcase className="h-5 w-5 text-gray-400 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-gray-500">Sektör</p>
                  <p className="text-sm text-gray-900">{tenant.industry}</p>
                </div>
              </div>
            )}

            {tenant.contactEmail && (
              <div className="flex items-start gap-3">
                <Mail className="h-5 w-5 text-gray-400 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-gray-500">
                    İletişim Email
                  </p>
                  <p className="text-sm text-gray-900">{tenant.contactEmail}</p>
                </div>
              </div>
            )}

            {tenant.contactPhone && (
              <div className="flex items-start gap-3">
                <Phone className="h-5 w-5 text-gray-400 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-gray-500">
                    İletişim Telefon
                  </p>
                  <p className="text-sm text-gray-900">{tenant.contactPhone}</p>
                </div>
              </div>
            )}

            {tenant.contactPerson && (
              <div className="flex items-start gap-3">
                <Building className="h-5 w-5 text-gray-400 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-gray-500">
                    İletişim Kişisi
                  </p>
                  <p className="text-sm text-gray-900">
                    {tenant.contactPerson}
                  </p>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Address Card */}
      {(tenant.address ||
        tenant.city ||
        tenant.country ||
        tenant.postalCode) && (
        <Card>
          <CardHeader>
            <CardTitle>Adres Bilgileri</CardTitle>
            <CardDescription>Kiracının adres bilgileri</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {tenant.address && (
                <div className="flex items-start gap-3">
                  <MapPin className="h-5 w-5 text-gray-400 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-gray-500">Adres</p>
                    <p className="text-sm text-gray-900">{tenant.address}</p>
                  </div>
                </div>
              )}

              {tenant.city && (
                <div>
                  <p className="text-sm font-medium text-gray-500">Şehir</p>
                  <p className="text-sm text-gray-900">{tenant.city}</p>
                </div>
              )}

              {tenant.country && (
                <div>
                  <p className="text-sm font-medium text-gray-500">Ülke</p>
                  <p className="text-sm text-gray-900">{tenant.country}</p>
                </div>
              )}

              {tenant.postalCode && (
                <div>
                  <p className="text-sm font-medium text-gray-500">
                    Posta Kodu
                  </p>
                  <p className="text-sm text-gray-900">{tenant.postalCode}</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Additional Info Card */}
      <Card>
        <CardHeader>
          <CardTitle>Ek Bilgiler</CardTitle>
          <CardDescription>Kiracının ek bilgileri</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {tenant.taxNumber && (
              <div>
                <p className="text-sm font-medium text-gray-500">
                  Vergi Numarası
                </p>
                <p className="text-sm text-gray-900">{tenant.taxNumber}</p>
              </div>
            )}

            {tenant.companyRegistrationNumber && (
              <div>
                <p className="text-sm font-medium text-gray-500">
                  Şirket Kayıt Numarası
                </p>
                <p className="text-sm text-gray-900">
                  {tenant.companyRegistrationNumber}
                </p>
              </div>
            )}

            {tenant.maxUsers && (
              <div>
                <p className="text-sm font-medium text-gray-500">
                  Maksimum Kullanıcı
                </p>
                <p className="text-sm text-gray-900">{tenant.maxUsers}</p>
              </div>
            )}

            {tenant.maxStorageGB && (
              <div>
                <p className="text-sm font-medium text-gray-500">
                  Maksimum Depolama (GB)
                </p>
                <p className="text-sm text-gray-900">{tenant.maxStorageGB}</p>
              </div>
            )}

            {tenant.currentStorageGB !== undefined && (
              <div>
                <p className="text-sm font-medium text-gray-500">
                  Kullanılan Depolama (GB)
                </p>
                <p className="text-sm text-gray-900">
                  {tenant.currentStorageGB}
                </p>
              </div>
            )}

            {tenant.subscriptionStartDate && (
              <div className="flex items-start gap-3">
                <Calendar className="h-5 w-5 text-gray-400 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-gray-500">
                    Abonelik Başlangıç
                  </p>
                  <p className="text-sm text-gray-900">
                    {format(
                      new Date(tenant.subscriptionStartDate),
                      'dd MMMM yyyy',
                      {
                        locale: tr,
                      }
                    )}
                  </p>
                </div>
              </div>
            )}

            {tenant.subscriptionEndDate && (
              <div className="flex items-start gap-3">
                <Calendar className="h-5 w-5 text-gray-400 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-gray-500">
                    Abonelik Bitiş
                  </p>
                  <p className="text-sm text-gray-900">
                    {format(
                      new Date(tenant.subscriptionEndDate),
                      'dd MMMM yyyy',
                      {
                        locale: tr,
                      }
                    )}
                  </p>
                </div>
              </div>
            )}

            <div className="flex items-start gap-3">
              <Calendar className="h-5 w-5 text-gray-400 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-gray-500">
                  Oluşturulma Tarihi
                </p>
                <p className="text-sm text-gray-900">
                  {format(new Date(tenant.createdAt), 'dd MMMM yyyy, HH:mm', {
                    locale: tr,
                  })}
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <Calendar className="h-5 w-5 text-gray-400 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-gray-500">
                  Güncellenme Tarihi
                </p>
                <p className="text-sm text-gray-900">
                  {format(new Date(tenant.updatedAt), 'dd MMMM yyyy, HH:mm', {
                    locale: tr,
                  })}
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Settings Card */}
      {tenant.settings && (
        <Card>
          <CardHeader>
            <CardTitle>Ayarlar</CardTitle>
            <CardDescription>Kiracı ayarları</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {tenant.settings.defaultCurrency && (
                <div>
                  <p className="text-sm font-medium text-gray-500">
                    Varsayılan Para Birimi
                  </p>
                  <p className="text-sm text-gray-900">
                    {tenant.settings.defaultCurrency}
                  </p>
                </div>
              )}

              {tenant.settings.timezone && (
                <div>
                  <p className="text-sm font-medium text-gray-500">
                    Saat Dilimi
                  </p>
                  <p className="text-sm text-gray-900">
                    {tenant.settings.timezone}
                  </p>
                </div>
              )}

              {tenant.settings.dateFormat && (
                <div>
                  <p className="text-sm font-medium text-gray-500">
                    Tarih Formatı
                  </p>
                  <p className="text-sm text-gray-900">
                    {tenant.settings.dateFormat}
                  </p>
                </div>
              )}

              {tenant.settings.numberFormat && (
                <div>
                  <p className="text-sm font-medium text-gray-500">
                    Sayı Formatı
                  </p>
                  <p className="text-sm text-gray-900">
                    {tenant.settings.numberFormat}
                  </p>
                </div>
              )}

              {tenant.settings.fiscalYearStart && (
                <div>
                  <p className="text-sm font-medium text-gray-500">
                    Mali Yıl Başlangıcı
                  </p>
                  <p className="text-sm text-gray-900">
                    {tenant.settings.fiscalYearStart}
                  </p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
