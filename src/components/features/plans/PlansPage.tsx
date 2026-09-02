import { toNumberOrZero } from '@/utils/numberUtils';
import { useState, useMemo } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import type { AxiosError } from 'axios';
import {
  planEndpoints,
  Plan,
  PlanFilterDto,
  CreatePlanDto,
} from '@/api/endpoints/plans.endpoints';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import { ConfirmDialog } from '@/components/common/ConfirmDialog';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useMe } from '@/services/users.service';
import { isReadOnly } from '@/utils/roleUtils';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { CreatePlanForm } from './CreatePlanForm';
import { PlanList } from './PlanList';
import { Plus, FileText, Copy, AlertTriangle } from 'lucide-react';
import { useToast } from '@/hooks/useToast';
import { useVersionConflict } from '@/hooks/useVersionConflict';
import { VersionConflictDialog } from '@/components/common/VersionConflictDialog';

const formatCurrency = (amount: number, currency: string = 'TRY') => {
  return new Intl.NumberFormat('tr-TR', {
    style: 'currency',
    currency: currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
};

// API'den dönen hata gövdesinin şekli — backend'in error filter'ı
// `{ message }` ya da `{ error }` verebilir, bkz. handleCreate/handleCopyConfirm/
// handleDeleteConfirm'deki geri dönüştürme sırası (davranış değişmedi, yalnız tip).
interface ApiErrorResponse {
  message?: string;
  error?: string;
}

export function PlansPage() {
  const { data: user } = useMe();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [copyTarget, setCopyTarget] = useState<Plan | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Plan | null>(null);
  const [isCopying, setIsCopying] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const toast = useToast();
  // T-034f: shared 409 STALE_VERSION/MISSING_VERSION UX (delete/addFu here).
  const versionConflict = useVersionConflict([['plans']]);

  // Query parametrelerinden filtreleri al
  const filters = useMemo<PlanFilterDto>(() => {
    return {
      status: searchParams.get('status') as PlanFilterDto['status'],
      cplId: searchParams.get('cplId') || undefined,
      channelId: searchParams.get('channelId') || undefined,
      categoryId: searchParams.get('categoryId') || undefined,
    };
  }, [searchParams]);

  const queryClient = useQueryClient();

  const {
    data: plans,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ['plans', filters],
    queryFn: () => planEndpoints.getAll(filters).then((res) => res.data),
  });

  const plansArray = useMemo(
    () => (Array.isArray(plans) ? plans : []),
    [plans]
  );

  // Summary hesaplamaları
  const summary = useMemo(() => {
    const totalPlans = plansArray.length;
    const draftCount = plansArray.filter((p) => p.status === 'DRAFT').length;
    const pendingCount = plansArray.filter(
      (p) => p.status === 'PENDING_APPROVAL'
    ).length;
    const approvedCount = plansArray.filter(
      (p) => p.status === 'APPROVED'
    ).length;

    // Backend'den gelen decimal değerleri number'a dönüştür
    // TypeORM decimal değerleri string olarak döndürebilir
    const totalSpend = plansArray.reduce((sum, p) => {
      let spend = 0;
      if (p.totalSpend != null) {
        // T-106: one parser. This used to strip commas and parseFloat — the
        // shape that read "1.234.567,89" as 1.234 by stopping at the second dot.
        spend = toNumberOrZero(p.totalSpend);
      }
      return sum + spend;
    }, 0);

    const totalVolume = plansArray.reduce((sum, p) => {
      let volume = 0;
      if (p.totalPlannedVolume != null) {
        // String veya number olabilir, her iki durumu da handle et
        volume = toNumberOrZero(p.totalPlannedVolume);
      }
      return sum + volume;
    }, 0);

    return {
      totalPlans,
      draftCount,
      pendingCount,
      approvedCount,
      totalSpend,
      totalVolume,
    };
  }, [plansArray]);

  if (isLoading) return <LoadingSpinner />;
  if (error) {
    console.error('Error loading plans:', error);
    return (
      <div className="text-red-600 p-4">
        Error loading plans:{' '}
        {error instanceof Error ? error.message : 'Unknown error'}
      </div>
    );
  }

  const handleCreate = async (
    data: CreatePlanDto & { selectedFuIds?: string[] }
  ) => {
    try {
      const { selectedFuIds, ...planData } = data;
      const result = await planEndpoints.create(planData);
      setIsCreateDialogOpen(false);

      const planId = result.data?.id;

      // Add selected FUs if any
      // T-034f: addFu requires planVersion; bumps +1 per call (backend CAS),
      // tracked locally same as PlanningGridEnhanced's addFuMutation — see
      // that file's comment for why (response is PlanFu, not Plan).
      if (planId && selectedFuIds && selectedFuIds.length > 0) {
        let planVersion = result.data?.version;
        for (const fuId of selectedFuIds) {
          try {
            await planEndpoints.addFu(planId, { fuId, planVersion });
            if (planVersion !== undefined) planVersion += 1;
          } catch (err) {
            if (versionConflict.handleError(err)) {
              // Stale/missing version on a plan we just created — bail out
              // of the batch rather than keep hammering a bad version.
              break;
            }
            console.error('Error adding FU:', err);
          }
        }
      }

      toast.success('Plan başarıyla oluşturuldu');

      // Invalidate plans list
      queryClient.invalidateQueries({ queryKey: ['plans'] });

      if (planId) {
        queryClient.invalidateQueries({ queryKey: ['plan', planId] });
        navigate(`/plans/${planId}`);
      }
    } catch (error) {
      const err = error as AxiosError<ApiErrorResponse>;
      let errorMessage = 'Plan oluşturulurken hata oluştu';

      if (err?.response?.data?.message) {
        errorMessage = err.response.data.message;
      } else if (err?.response?.data?.error) {
        errorMessage = err.response.data.error;
      } else if (err?.message) {
        errorMessage = err.message;
      }

      toast.error(errorMessage);
      console.error('Plan creation error:', error);
    }
  };

  // Düzenle: Plan detay sayfasına yönlendir (DRAFT ise orada düzenlenebilir)
  const handleEdit = (plan: Plan) => {
    navigate(`/plans/${plan.id}`);
  };

  // Kopyalama: Onay modalı aç
  const handleCopyRequest = (plan: Plan) => {
    setCopyTarget(plan);
  };

  const handleCopyConfirm = async () => {
    if (!copyTarget) return;
    setIsCopying(true);
    try {
      const copyData: CreatePlanDto = {
        planName: `${copyTarget.planName} (Kopya)`,
        description: copyTarget.description,
        cplId: copyTarget.cplId,
        channelId: copyTarget.channelId,
        regionId: copyTarget.regionId,
        categoryId: copyTarget.categoryId,
        startDate: copyTarget.startDate,
        endDate: copyTarget.endDate,
        comments: copyTarget.comments,
      };
      const result = await planEndpoints.create(copyData);
      toast.success('Plan başarıyla kopyalandı');
      setCopyTarget(null);
      queryClient.invalidateQueries({ queryKey: ['plans'] });
      if (result.data?.id) {
        navigate(`/plans/${result.data.id}`);
      }
    } catch (error) {
      const err = error as AxiosError<ApiErrorResponse>;
      toast.error(
        err?.response?.data?.message || 'Plan kopyalanırken hata oluştu'
      );
    } finally {
      setIsCopying(false);
    }
  };

  // Silme: Onay modalı aç
  const handleDeleteRequest = (plan: Plan) => {
    setDeleteTarget(plan);
  };

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;
    setIsDeleting(true);
    try {
      await planEndpoints.delete(deleteTarget.id, {
        version: deleteTarget.version,
      });
      toast.success('Plan başarıyla silindi');
      setDeleteTarget(null);
      refetch();
    } catch (error) {
      if (versionConflict.handleError(error)) return;
      const err = error as AxiosError<ApiErrorResponse>;
      toast.error(
        err?.response?.data?.message || 'Plan silinirken hata oluştu'
      );
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Planlar</h1>
          <p className="text-gray-600 mt-1">Promosyon planlarınızı yönetin</p>
        </div>
        <div className="flex gap-2">
          {!isReadOnly(user?.role) && (
            <Button onClick={() => setIsCreateDialogOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Yeni Plan
            </Button>
          )}
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">
              Toplam Plan
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summary.totalPlans}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">
              Onay Bekleyen
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">
              {summary.pendingCount}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">
              Toplam Harcama
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(summary.totalSpend)}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">
              Toplam Hacim
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {new Intl.NumberFormat('tr-TR').format(summary.totalVolume)}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Plan List */}
      <PlanList
        plans={plansArray}
        onPlanClick={(plan) => navigate(`/plans/${plan.id}`)}
        onEdit={handleEdit}
        onCopy={handleCopyRequest}
        onDelete={handleDeleteRequest}
      />

      {/* Create Plan Dialog */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <div className="flex items-center gap-3 mb-2">
              <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center">
                <FileText className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <DialogTitle className="text-xl">Yeni Plan Oluştur</DialogTitle>
                <DialogDescription className="text-xs text-gray-500 mt-1">
                  PLANLAMA MODÜLÜ
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>
          <CreatePlanForm
            onSubmit={handleCreate}
            onCancel={() => setIsCreateDialogOpen(false)}
          />
        </DialogContent>
      </Dialog>

      {/* Copy Confirmation Dialog */}
      <ConfirmDialog
        isOpen={!!copyTarget}
        onClose={() => setCopyTarget(null)}
        onConfirm={handleCopyConfirm}
        title="Planı Kopyala"
        description={
          copyTarget
            ? `"${copyTarget.planCode}: ${copyTarget.planName}" planını kopyalamak istediğinize emin misiniz? Yeni plan TASLAK durumunda oluşturulacaktır.`
            : ''
        }
        confirmText="Kopyala"
        cancelText="Vazgeç"
        variant="default"
        isLoading={isCopying}
        icon={<Copy className="h-5 w-5 text-blue-600" />}
      />

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDeleteConfirm}
        title="Planı Sil"
        description={
          deleteTarget
            ? `"${deleteTarget.planCode}: ${deleteTarget.planName}" planını silmek istediğinize emin misiniz? Bu işlem geri alınamaz.`
            : ''
        }
        confirmText="Sil"
        cancelText="Vazgeç"
        variant="destructive"
        isLoading={isDeleting}
        icon={<AlertTriangle className="h-5 w-5 text-red-600" />}
      />

      {/* Version Conflict Dialog (T-034f) */}
      <VersionConflictDialog
        conflict={versionConflict.conflict}
        onReload={versionConflict.reload}
        onDismiss={versionConflict.dismiss}
      />
    </div>
  );
}
