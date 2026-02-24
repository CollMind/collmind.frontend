import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAgreement, useAgreementPermissions, useAgreements } from '@/services/agreements.service';
import { useQueryClient } from '@tanstack/react-query';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AgreementStatusBadge } from './AgreementStatusBadge';
import { AgreementActions } from './AgreementActions';
import { ArrowLeft, Edit } from 'lucide-react';

const formatCurrency = (amount: number, currency: string = 'TRY') => {
  return new Intl.NumberFormat('tr-TR', {
    style: 'currency',
    currency: currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
};

const formatDate = (dateString: string): string => {
  const date = new Date(dateString);
  return date.toLocaleDateString('tr-TR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
};

export function AgreementDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const {
    data: agreement,
    isLoading,
    error,
  } = useAgreement(id || '');

  const permissions = useAgreementPermissions(agreement);

  const handleSuccess = () => {
    // Refresh agreement data
    queryClient.invalidateQueries({ queryKey: ['agreements', 'detail', id] });
    queryClient.invalidateQueries({ queryKey: ['agreements'] });
  };

  const handleDeleteSuccess = () => {
    // Navigate to agreements list after successful deletion
    navigate('/agreements');
  };

  if (isLoading) {
    return <LoadingSpinner />;
  }

  if (error || !agreement) {
    return (
      <div className="text-red-600 p-4">
        Anlaşma yüklenirken hata oluştu:{' '}
        {error instanceof Error ? error.message : 'Bilinmeyen hata'}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button
            variant="outline"
            size="icon"
            onClick={() => navigate('/agreements')}
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold">{agreement.agreementNumber}</h1>
            {agreement.agreementName && (
              <p className="text-gray-500 mt-1">{agreement.agreementName}</p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <AgreementStatusBadge status={agreement.status} />
          {permissions.canEdit && (
            <Button
              variant="outline"
              onClick={() => navigate(`/agreements/${agreement.id}/edit`)}
            >
              <Edit className="h-4 w-4 mr-2" />
              Düzenle
            </Button>
          )}
        </div>
      </div>

      {/* Actions */}
      <Card>
        <CardHeader>
          <CardTitle>İşlemler</CardTitle>
        </CardHeader>
        <CardContent>
          <AgreementActions
            agreement={agreement}
            onEdit={() => navigate(`/agreements/${agreement.id}/edit`)}
            onSuccess={handleSuccess}
            onDeleteSuccess={handleDeleteSuccess}
          />
        </CardContent>
      </Card>

      {/* Anlaşma Bilgileri */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Temel Bilgiler</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="text-sm text-gray-600">Anlaşma Numarası</p>
              <p className="font-medium">{agreement.agreementNumber}</p>
            </div>
            {agreement.agreementName && (
              <div>
                <p className="text-sm text-gray-600">Anlaşma İsmi</p>
                <p className="font-medium">{agreement.agreementName}</p>
              </div>
            )}
            <div>
              <p className="text-sm text-gray-600">Anlaşma Tipi</p>
              <p className="font-medium">{agreement.agreementType}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Durum</p>
              <AgreementStatusBadge status={agreement.status} />
            </div>
            <div>
              <p className="text-sm text-gray-600">Kanal</p>
              <p className="font-medium">
                {typeof agreement.channel === 'object' && agreement.channel?.name
                  ? agreement.channel.name
                  : agreement.channelName || agreement.channelId || '-'}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Müşteri ve Ürün</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="text-sm text-gray-600">Müşteri</p>
              <p className="font-medium">
                {typeof agreement.cpl === 'object' && agreement.cpl?.name
                  ? agreement.cpl.name
                  : agreement.customerName || agreement.cplName || agreement.cplId || '-'}
              </p>
            </div>
            {agreement.regionId && (
              <div>
                <p className="text-sm text-gray-600">Bölge</p>
                <p className="font-medium">{agreement.regionId}</p>
              </div>
            )}
            <div>
              <p className="text-sm text-gray-600">Forecasting Unit (FU)</p>
              <p className="font-medium">{agreement.fuId}</p>
            </div>
            {agreement.guId && (
              <div>
                <p className="text-sm text-gray-600">Generic Unit (GU)</p>
                <p className="font-medium">{agreement.guId}</p>
              </div>
            )}
            <div>
              <p className="text-sm text-gray-600">SKU Scope</p>
              <p className="font-medium">{agreement.skuScope || 'FU'}</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Taktik ve Mekanik</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="text-sm text-gray-600">Taktik</p>
              <p className="font-medium">
                {typeof agreement.tactic === 'object' && agreement.tactic?.name
                  ? agreement.tactic.name
                  : agreement.tacticName || agreement.tacticId || '-'}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Mekanik</p>
              <p className="font-medium">
                {typeof agreement.mechanic === 'object' && agreement.mechanic?.name
                  ? agreement.mechanic.name
                  : agreement.mechanicName || agreement.mechanicId || '-'}
              </p>
            </div>
            {agreement.mechanicValue !== undefined && (
              <div>
                <p className="text-sm text-gray-600">Mekanik Değeri</p>
                <p className="font-medium">
                  {agreement.mechanicValue}
                  {agreement.mechanicType === 'PERCENTAGE' ? '%' : ' ' + (agreement.currency || 'TRY')}
                </p>
              </div>
            )}
            {agreement.mechanicType && (
              <div>
                <p className="text-sm text-gray-600">Mekanik Tipi</p>
                <p className="font-medium">{agreement.mechanicType}</p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Bütçe ve Tarihler</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="text-sm text-gray-600">Bütçe Tavanı</p>
              <p className="font-medium text-lg">
                {formatCurrency(agreement.capTotalAmount, agreement.currency)}
              </p>
            </div>
            {agreement.spendType && (
              <div>
                <p className="text-sm text-gray-600">Spend Tipi</p>
                <p className="font-medium">{agreement.spendType}</p>
              </div>
            )}
            <div>
              <p className="text-sm text-gray-600">Başlangıç Tarihi</p>
              <p className="font-medium">{formatDate(agreement.startDate)}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Bitiş Tarihi</p>
              <p className="font-medium">{formatDate(agreement.endDate)}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Para Birimi</p>
              <p className="font-medium">{agreement.currency || 'TRY'}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Gerekçe */}
      <Card>
        <CardHeader>
          <CardTitle>İş Gerekçesi</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-gray-700 whitespace-pre-wrap">{agreement.justification}</p>
        </CardContent>
      </Card>

      {/* Metadata */}
      <div className="text-xs text-gray-500">
        <p>Oluşturulma: {new Date(agreement.createdAt).toLocaleString('tr-TR')}</p>
        <p>Son Güncelleme: {new Date(agreement.updatedAt).toLocaleString('tr-TR')}</p>
      </div>
    </div>
  );
}
