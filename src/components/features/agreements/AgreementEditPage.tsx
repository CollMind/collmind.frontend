import { useParams, useNavigate } from 'react-router-dom';
import {
  useAgreement,
  useUpdateAgreement,
} from '@/services/agreements.service';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import { AgreementForm } from '@/components/agreements';
import { UpdateAgreementDto } from '@/types/agreement.types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useVersionConflict } from '@/hooks/useVersionConflict';
import { VersionConflictDialog } from '@/components/common/VersionConflictDialog';

export function AgreementEditPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const { data: agreement, isLoading, error } = useAgreement(id || '');

  const updateMutation = useUpdateAgreement();
  // T-034f: shared 409 STALE_VERSION/MISSING_VERSION UX for update.
  const versionConflict = useVersionConflict([
    ['agreements', 'detail', id],
    ['agreements', 'list'],
  ]);

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

  if (agreement.status !== 'DRAFT') {
    return (
      <div className="text-red-600 p-4">
        Sadece DRAFT durumundaki anlaşmalar düzenlenebilir.
      </div>
    );
  }

  const handleUpdate = async (data: UpdateAgreementDto) => {
    try {
      await updateMutation.mutateAsync({
        id: agreement.id,
        data: { ...data, version: agreement.version },
      });
      navigate(`/agreements/${agreement.id}`);
    } catch (error) {
      // Generic toast already shown by useUpdateAgreement's onError; a
      // version conflict additionally gets the reload dialog here (T-034f
      // — never auto-retry, see useVersionConflict.ts).
      versionConflict.handleError(error);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button
          variant="outline"
          size="icon"
          onClick={() => navigate(`/agreements/${agreement.id}`)}
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-3xl font-bold">Anlaşma Düzenle</h1>
          <p className="text-gray-500 mt-1">{agreement.agreementNumber}</p>
        </div>
      </div>

      {/* Form */}
      <Card>
        <CardHeader>
          <CardTitle>Anlaşma Bilgileri</CardTitle>
        </CardHeader>
        <CardContent>
          <AgreementForm
            onSubmit={handleUpdate as any}
            onCancel={() => navigate(`/agreements/${agreement.id}`)}
            initialData={agreement}
            isLoading={updateMutation.isPending}
          />
        </CardContent>
      </Card>

      {/* Version Conflict Dialog (T-034f) */}
      <VersionConflictDialog
        conflict={versionConflict.conflict}
        onReload={versionConflict.reload}
        onDismiss={versionConflict.dismiss}
      />
    </div>
  );
}
