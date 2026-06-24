import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { planEndpoints, UpdatePlanDto } from '@/api/endpoints/plans.endpoints';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import { ConfirmDialog } from '@/components/common/ConfirmDialog';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  ArrowLeft,
  Edit2,
  Send,
  Trash2,
  Building2,
  Layers,
  Shirt,
  Calendar,
  BarChart3,
  User,
  Clock,
  AlertTriangle,
} from 'lucide-react';
import { useToast } from '@/hooks/useToast';
import { PlanningGridEnhanced as PlanningGrid } from './PlanningGridEnhanced';
import { GrandTotals } from './GrandTotals';
import { PlanAnalysis } from './PlanAnalysis';
import { EditPlanDialog } from './EditPlanDialog';
import { userEndpoints } from '@/api/endpoints/users.endpoints';

const formatDate = (dateString?: string) => {
  if (!dateString) return 'N/A';
  const date = new Date(dateString);
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  return `${day}.${month}.${year} ${hours}:${minutes}`;
};

const formatPeriod = (startDate?: string, endDate?: string) => {
  if (!startDate || !endDate) return 'N/A';
  const start = new Date(startDate);
  const end = new Date(endDate);
  return `${start.toLocaleDateString('tr-TR', { day: '2-digit', month: '2-digit' })}-${end.toLocaleDateString('tr-TR', { day: '2-digit', month: '2-digit', year: 'numeric' })}`;
};

export function PlanDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const toast = useToast();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<'grid' | 'analysis'>('grid');
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isSubmitDialogOpen, setIsSubmitDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

  const {
    data: plan,
    isLoading,
    error,
  } = useQuery({
    queryKey: ['plan', id],
    queryFn: () => planEndpoints.getById(id!).then((res) => res.data),
    enabled: !!id,
    refetchOnWindowFocus: true,
    refetchOnMount: true,
  });

  // Get creator user info
  const { data: creatorUser } = useQuery({
    queryKey: ['user', plan?.createdBy],
    queryFn: () =>
      userEndpoints.getById(plan!.createdBy!).then((res) => res.data),
    enabled: !!plan?.createdBy,
  });

  // Update plan mutation
  const updateMutation = useMutation({
    mutationFn: (data: UpdatePlanDto) => planEndpoints.update(id!, data),
    onSuccess: () => {
      toast.success('Plan başarıyla güncellendi');
      queryClient.invalidateQueries({ queryKey: ['plan', id] });
      queryClient.invalidateQueries({ queryKey: ['plans'] });
      setIsEditDialogOpen(false);
    },
    onError: (error: any) => {
      toast.error(
        error?.response?.data?.message || 'Plan güncellenirken hata oluştu'
      );
    },
  });

  const submitMutation = useMutation({
    mutationFn: () => planEndpoints.submit(id!),
    onSuccess: () => {
      toast.success('Plan onaya gönderildi');
      queryClient.invalidateQueries({ queryKey: ['plan', id] });
      queryClient.invalidateQueries({ queryKey: ['plans'] });
      setIsSubmitDialogOpen(false);
    },
    onError: (error: any) => {
      toast.error(
        error?.response?.data?.message || 'Plan onaya gönderilirken hata oluştu'
      );
    },
  });

  const deleteMutation = useMutation({
    mutationFn: () => planEndpoints.delete(id!),
    onSuccess: () => {
      toast.success('Plan başarıyla silindi');
      queryClient.invalidateQueries({ queryKey: ['plans'] });
      setIsDeleteDialogOpen(false);
      navigate('/plans');
    },
    onError: (error: any) => {
      toast.error(
        error?.response?.data?.message || 'Plan silinirken hata oluştu'
      );
    },
  });

  if (isLoading) return <LoadingSpinner />;
  if (error || !plan) {
    return (
      <div className="text-red-600 p-4">
        Plan bulunamadı veya yüklenirken hata oluştu.
      </div>
    );
  }

  const isDraft = plan.status === 'DRAFT';
  const canEdit = isDraft;

  const handleSavePlan = async (data: UpdatePlanDto) => {
    await updateMutation.mutateAsync(data);
  };

  return (
    <div className="space-y-6">
      {/* Back Button */}
      <Button
        variant="ghost"
        size="sm"
        onClick={() => navigate('/plans')}
        className="gap-2"
      >
        <ArrowLeft className="h-4 w-4" />
        Planlara Dön
      </Button>

      {/* Header */}
      <div>
        <div className="flex items-center gap-3 mb-2">
          <h1 className="text-2xl font-bold">
            {plan.planCode}: {plan.planName}
          </h1>
          <Badge
            variant={
              plan.status === 'APPROVED'
                ? 'default'
                : plan.status === 'PENDING_APPROVAL'
                  ? 'default'
                  : plan.status === 'REJECTED'
                    ? 'destructive'
                    : 'secondary'
            }
            className="bg-gray-100 text-gray-800"
          >
            {plan.status === 'DRAFT' && 'TASLAK'}
            {plan.status === 'PENDING_APPROVAL' && 'ONAY BEKLEYEN'}
            {plan.status === 'APPROVED' && 'ONAYLANDI'}
            {plan.status === 'REJECTED' && 'REDDEDİLDİ'}
          </Badge>
        </div>
        <div className="flex items-center gap-3 text-xs text-gray-600 mb-2">
          <div className="flex items-center gap-1">
            <User className="h-3.5 w-3.5 text-gray-400" />
            <span className="text-gray-500">Oluşturan:</span>
            <span className="font-medium">
              {creatorUser?.fullName || plan.createdBy || 'N/A'}
            </span>
          </div>
          <div className="flex items-center gap-1">
            <Calendar className="h-3.5 w-3.5 text-gray-400" />
            <span className="text-gray-500">Oluşturma:</span>
            <span className="font-medium">{formatDate(plan.createdAt)}</span>
          </div>
          <div className="flex items-center gap-1">
            <Clock className="h-3.5 w-3.5 text-gray-400" />
            <span className="text-gray-500">Son Güncelleme:</span>
            <span className="font-medium">{formatDate(plan.updatedAt)}</span>
          </div>
        </div>
        {canEdit && (
          <div className="flex items-center gap-2 px-3 py-1 bg-yellow-50 border border-yellow-200 rounded text-sm text-yellow-800">
            <span>⚠️</span>
            <span>
              DÜZENLEME MODU AKTİF - DEĞİŞİKLİKLER OTOMATİK KAYDEDİLİR
            </span>
          </div>
        )}
      </div>

      {/* Info Cards - Clickable when editable */}
      <div className="grid grid-cols-4 gap-4">
        <Card
          className={`border-gray-200 ${canEdit ? 'cursor-pointer hover:border-blue-300 hover:shadow-sm transition-all' : ''}`}
          onClick={canEdit ? () => setIsEditDialogOpen(true) : undefined}
        >
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded bg-gray-100 flex items-center justify-center">
                <Building2 className="h-5 w-5 text-gray-600" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-xs text-gray-500 uppercase">CPL</div>
                <div className="font-semibold text-sm truncate">
                  {plan.cpl?.name || 'N/A'}
                </div>
                <div className="text-xs text-gray-500">Müşteri Grubu</div>
              </div>
              {canEdit && (
                <Edit2 className="h-3.5 w-3.5 text-gray-400 flex-shrink-0" />
              )}
            </div>
          </CardContent>
        </Card>
        <Card
          className={`border-gray-200 ${canEdit ? 'cursor-pointer hover:border-blue-300 hover:shadow-sm transition-all' : ''}`}
          onClick={canEdit ? () => setIsEditDialogOpen(true) : undefined}
        >
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded bg-gray-100 flex items-center justify-center">
                <Layers className="h-5 w-5 text-gray-600" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-xs text-gray-500 uppercase">KANAL</div>
                <div className="font-semibold text-sm truncate">
                  {plan.channel?.name || 'N/A'}
                </div>
                <div className="text-xs text-gray-500">Satış Kanalı</div>
              </div>
              {canEdit && (
                <Edit2 className="h-3.5 w-3.5 text-gray-400 flex-shrink-0" />
              )}
            </div>
          </CardContent>
        </Card>
        <Card
          className={`border-gray-200 ${canEdit ? 'cursor-pointer hover:border-blue-300 hover:shadow-sm transition-all' : ''}`}
          onClick={canEdit ? () => setIsEditDialogOpen(true) : undefined}
        >
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded bg-purple-100 flex items-center justify-center">
                <Shirt className="h-5 w-5 text-purple-600" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-xs text-gray-500 uppercase">KATEGORİ</div>
                <div className="font-semibold text-sm truncate">
                  {plan.category?.name || 'N/A'}
                </div>
                <div className="text-xs text-gray-500">Ürün Grubu</div>
              </div>
              {canEdit && (
                <Edit2 className="h-3.5 w-3.5 text-gray-400 flex-shrink-0" />
              )}
            </div>
          </CardContent>
        </Card>
        <Card
          className={`border-gray-200 ${canEdit ? 'cursor-pointer hover:border-blue-300 hover:shadow-sm transition-all' : ''}`}
          onClick={canEdit ? () => setIsEditDialogOpen(true) : undefined}
        >
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded bg-red-100 flex items-center justify-center">
                <Calendar className="h-5 w-5 text-red-600" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-xs text-gray-500 uppercase">DÖNEM</div>
                <div className="font-semibold text-sm truncate">
                  {formatPeriod(plan.startDate, plan.endDate)}
                </div>
                <div className="text-xs text-gray-500">Plan Dönemi</div>
              </div>
              {canEdit && (
                <Edit2 className="h-3.5 w-3.5 text-gray-400 flex-shrink-0" />
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Action Buttons */}
      {canEdit && (
        <div className="flex gap-2">
          <Button
            onClick={() => setIsEditDialogOpen(true)}
            className="bg-blue-600 hover:bg-blue-700"
          >
            <Edit2 className="mr-2 h-4 w-4" />
            Plan Bilgilerini Düzenle
          </Button>
          <Button
            onClick={() => setIsSubmitDialogOpen(true)}
            disabled={submitMutation.isPending}
            variant="outline"
          >
            <Send className="mr-2 h-4 w-4" />
            Onaya Gönder
          </Button>
          <Button
            variant="outline"
            onClick={() => setIsDeleteDialogOpen(true)}
            disabled={deleteMutation.isPending}
            className="text-red-600 hover:text-red-700 hover:bg-red-50"
          >
            <Trash2 className="mr-2 h-4 w-4" />
            Sil
          </Button>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-2 border-b">
        <Button
          variant={activeTab === 'grid' ? 'default' : 'ghost'}
          onClick={() => setActiveTab('grid')}
          className="rounded-b-none"
        >
          <Layers className="mr-2 h-4 w-4" />
          Planning Grid
        </Button>
        <Button
          variant={activeTab === 'analysis' ? 'default' : 'ghost'}
          onClick={() => setActiveTab('analysis')}
          className="rounded-b-none"
        >
          <BarChart3 className="mr-2 h-4 w-4" />
          Analiz & Rapor
        </Button>
      </div>

      {/* Grand Totals */}
      {activeTab === 'grid' && <GrandTotals plan={plan} />}

      {/* Planning Grid or Analysis */}
      {activeTab === 'grid' ? (
        <PlanningGrid plan={plan} canEdit={canEdit} />
      ) : (
        <PlanAnalysis planId={plan.id} />
      )}

      {/* Edit Plan Dialog */}
      {canEdit && (
        <EditPlanDialog
          plan={plan}
          isOpen={isEditDialogOpen}
          onClose={() => setIsEditDialogOpen(false)}
          onSave={handleSavePlan}
          isSaving={updateMutation.isPending}
        />
      )}

      {/* Submit for Approval Confirmation Dialog */}
      <ConfirmDialog
        isOpen={isSubmitDialogOpen}
        onClose={() => setIsSubmitDialogOpen(false)}
        onConfirm={() => submitMutation.mutate()}
        title="Planı Onaya Gönder"
        description={`"${plan.planCode}: ${plan.planName}" planını onaya göndermek istediğinize emin misiniz? Onaya gönderildikten sonra plan üzerinde düzenleme yapılamaz.`}
        confirmText="Onaya Gönder"
        cancelText="Vazgeç"
        variant="warning"
        isLoading={submitMutation.isPending}
        icon={<Send className="h-5 w-5 text-amber-600" />}
        showNote={true}
        noteLabel="Onaylayan İçin Not (Opsiyonel)"
        notePlaceholder="Onaylayıcıya iletmek istediğiniz notları yazın..."
      />

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        isOpen={isDeleteDialogOpen}
        onClose={() => setIsDeleteDialogOpen(false)}
        onConfirm={() => deleteMutation.mutate()}
        title="Planı Sil"
        description={`"${plan.planCode}: ${plan.planName}" planını silmek istediğinize emin misiniz? Bu işlem geri alınamaz.`}
        confirmText="Sil"
        cancelText="Vazgeç"
        variant="destructive"
        isLoading={deleteMutation.isPending}
        icon={<AlertTriangle className="h-5 w-5 text-red-600" />}
      />
    </div>
  );
}
