import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { planEndpoints, Plan } from '@/api/endpoints/plans.endpoints';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Clock,
  CheckCircle2,
  TrendingUp,
  AlertTriangle,
  Search,
  Eye,
  X,
  Check,
  Store,
  Calendar,
  User,
} from 'lucide-react';
import { useToast } from '@/hooks/useToast';
import { PlanApprovalDetailModal } from './PlanApprovalDetailModal';
import { BudgetApprovalModal } from './BudgetApprovalModal';
import { ConfirmDialog } from '@/components/common/ConfirmDialog';
import { userEndpoints } from '@/api/endpoints/users.endpoints';
import { toNumber } from '@/utils/numberUtils';

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('tr-TR', {
    style: 'currency',
    currency: 'TRY',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
};

const formatPercentage = (value: number, decimals: number = 1) => {
  return `${value.toFixed(decimals)}%`;
};

const formatDate = (dateString?: string) => {
  if (!dateString) return 'N/A';
  const date = new Date(dateString);
  return date.toLocaleDateString('tr-TR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
};

export function PlanApprovalsPage() {
  const toast = useToast();
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPlan, setSelectedPlan] = useState<Plan | null>(null);
  const [budgetApprovalPlan, setBudgetApprovalPlan] = useState<Plan | null>(
    null
  );
  const [rejectPlan, setRejectPlan] = useState<Plan | null>(null);

  const { data: plans, isLoading } = useQuery({
    queryKey: ['pending-approval-plans'],
    queryFn: () => planEndpoints.getPendingApprovals().then((res) => res.data),
  });

  const approveMutation = useMutation({
    mutationFn: ({
      planId,
      comments,
      autoCreateBudget,
      budgetAmount,
    }: {
      planId: string;
      comments?: string;
      autoCreateBudget?: boolean;
      budgetAmount?: number;
    }) =>
      planEndpoints.approve(planId, {
        comments,
        autoCreateBudget,
        budgetAmount,
      }),
    onSuccess: () => {
      toast.success('Plan başarıyla onaylandı');
      queryClient.invalidateQueries({ queryKey: ['pending-approval-plans'] });
      setSelectedPlan(null);
      setBudgetApprovalPlan(null);
    },
    onError: (error: any) => {
      toast.error(
        error?.response?.data?.message || 'Plan onaylanırken hata oluştu'
      );
    },
  });

  const rejectMutation = useMutation({
    mutationFn: ({ planId, reason }: { planId: string; reason: string }) =>
      planEndpoints.reject(planId, { reason }),
    onSuccess: () => {
      toast.success('Plan reddedildi');
      queryClient.invalidateQueries({ queryKey: ['pending-approval-plans'] });
      setSelectedPlan(null);
      setRejectPlan(null);
    },
    onError: (error: any) => {
      toast.error(
        error?.response?.data?.message || 'Plan reddedilirken hata oluştu'
      );
    },
  });

  // Get creator user info for each plan
  const plansWithCreators =
    plans?.map((plan) => {
      // We'll fetch creator info separately if needed
      return plan;
    }) || [];

  // Filter plans by search query
  const filteredPlans = plansWithCreators.filter((plan) => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      plan.planCode.toLowerCase().includes(query) ||
      plan.planName.toLowerCase().includes(query)
    );
  });

  // Calculate summary statistics
  const pendingCount = plans?.length || 0;
  const approvedTodayCount = 0; // TODO: Calculate from approved plans
  const avgRoi =
    plans && plans.length > 0
      ? plans.reduce((sum, p) => sum + (p.overallRoi || 0), 0) / plans.length
      : 0;
  const lowRoiCount =
    plans?.filter((p) => (p.overallRoi || 0) < 20).length || 0;

  if (isLoading) return <LoadingSpinner />;

  return (
    <div className="space-y-6">
      {/* Breadcrumbs */}
      <div className="text-sm text-gray-600">Planlama &gt; Plan Onayları</div>

      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Plan Onayları</h1>
        <p className="text-gray-600">
          Stratejik müşteri planlarını inceleyin ve onaylayın.
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-4 gap-4">
        <Card className="border-gray-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-xs text-gray-500 uppercase mb-1">
                  BEKLEYEN
                </div>
                <div className="text-2xl font-bold text-gray-900">
                  {pendingCount}
                </div>
              </div>
              <Clock className="h-8 w-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-gray-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-xs text-gray-500 uppercase mb-1">
                  BUGÜN ONAYLANAN
                </div>
                <div className="text-2xl font-bold text-gray-900">
                  {approvedTodayCount}
                </div>
              </div>
              <CheckCircle2 className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-gray-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <div className="text-xs text-gray-500 uppercase">
                    ORT. ROI
                  </div>
                  <Badge
                    variant="outline"
                    className="text-xs bg-orange-50 text-orange-700 border-orange-200"
                  >
                    ORT.
                  </Badge>
                </div>
                <div className="text-2xl font-bold text-gray-900">
                  {formatPercentage(avgRoi)}
                </div>
                <div className="text-xs text-gray-500">(BEKLEYEN)</div>
              </div>
              <TrendingUp className="h-8 w-8 text-purple-600" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-gray-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-xs text-gray-500 uppercase mb-1">
                  ROI &lt; %20
                </div>
                <div className="text-2xl font-bold text-gray-900">
                  {lowRoiCount}
                </div>
              </div>
              <AlertTriangle className="h-8 w-8 text-red-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search Bar */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
        <Input
          type="text"
          placeholder="Q Plan ID veya adı ile ara..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Plan List */}
      <div className="space-y-4">
        {filteredPlans.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center text-gray-500">
              {searchQuery
                ? 'Arama sonucu bulunamadı'
                : 'Onay bekleyen plan bulunmamaktadır'}
            </CardContent>
          </Card>
        ) : (
          filteredPlans.map((plan) => (
            <PlanApprovalCard
              key={plan.id}
              plan={plan}
              onReview={() => setSelectedPlan(plan)}
              onApprove={() => setBudgetApprovalPlan(plan)}
              onReject={() => setRejectPlan(plan)}
              isApproving={approveMutation.isPending}
              isRejecting={rejectMutation.isPending}
            />
          ))
        )}
      </div>

      {/* Detail Modal */}
      {selectedPlan && (
        <PlanApprovalDetailModal
          plan={selectedPlan}
          onClose={() => setSelectedPlan(null)}
          onApprove={() => {
            // Close detail modal and open budget approval modal
            const plan = selectedPlan;
            setSelectedPlan(null);
            setBudgetApprovalPlan(plan);
          }}
          onReject={(reason) => {
            rejectMutation.mutate({ planId: selectedPlan.id, reason });
          }}
          isApproving={approveMutation.isPending}
          isRejecting={rejectMutation.isPending}
        />
      )}

      {/* Budget Approval Modal */}
      {budgetApprovalPlan && (
        <BudgetApprovalModal
          isOpen={!!budgetApprovalPlan}
          planId={budgetApprovalPlan.id}
          planName={budgetApprovalPlan.planName}
          planCode={budgetApprovalPlan.planCode}
          onClose={() => setBudgetApprovalPlan(null)}
          onApprove={(data) => {
            approveMutation.mutate({
              planId: budgetApprovalPlan.id,
              comments: data.comments,
              autoCreateBudget: data.autoCreateBudget,
              budgetAmount: data.budgetAmount,
            });
          }}
          isApproving={approveMutation.isPending}
        />
      )}

      {/* Reject Confirmation Modal */}
      {rejectPlan && (
        <ConfirmDialog
          isOpen={!!rejectPlan}
          onClose={() => setRejectPlan(null)}
          onConfirm={(note) => {
            if (!note?.trim()) {
              toast.error('Red gerekçesi zorunludur');
              return;
            }
            rejectMutation.mutate({ planId: rejectPlan.id, reason: note! });
          }}
          title="Planı Reddet"
          description={`${rejectPlan.planCode} - ${rejectPlan.planName} planını reddetmek istediğinize emin misiniz?`}
          confirmText="Reddet"
          cancelText="İptal"
          variant="destructive"
          isLoading={rejectMutation.isPending}
          showNote
          noteLabel="Red Gerekçesi (zorunlu)"
          notePlaceholder="Red gerekçenizi yazın..."
          icon={<X className="h-5 w-5 text-red-600" />}
        />
      )}
    </div>
  );
}

interface PlanApprovalCardProps {
  plan: Plan;
  onReview: () => void;
  onApprove: () => void;
  onReject: () => void;
  isApproving: boolean;
  isRejecting: boolean;
}

function PlanApprovalCard({
  plan,
  onReview,
  onApprove,
  onReject,
  isApproving,
  isRejecting,
}: PlanApprovalCardProps) {
  const { data: creatorUser } = useQuery({
    queryKey: ['user', plan.createdBy],
    queryFn: () =>
      userEndpoints.getById(plan.createdBy!).then((res) => res.data),
    enabled: !!plan.createdBy,
  });

  const baseVolume =
    plan.planFus?.reduce(
      (sum, fu) =>
        sum +
        (fu.planSkus?.reduce((s, sku) => s + (sku.baseVolume || 0), 0) || 0),
      0
    ) || 0;
  const plannedVolume = toNumber(plan.totalPlannedVolume);
  const incremental = plannedVolume - baseVolume;
  const upliftPercent = baseVolume > 0 ? (incremental / baseVolume) * 100 : 0;
  const fuCount = plan.planFus?.length || 0;
  const skuCount =
    plan.planFus?.reduce((sum, fu) => sum + (fu.planSkus?.length || 0), 0) || 0;
  const roi = plan.overallRoi || 0;
  const isLowRoi = roi < 20;

  return (
    <Card className="border-gray-200">
      <CardContent className="p-6">
        {/* Plan Header */}
        <div className="flex items-start justify-between mb-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-lg font-semibold text-gray-900">
                {plan.planCode}
              </span>
              <Badge className="bg-blue-100 text-blue-800 border-blue-200">
                YENİ
              </Badge>
            </div>
            <h3 className="text-xl font-bold text-gray-900">{plan.planName}</h3>
          </div>
        </div>

        {/* Metadata */}
        <div className="flex items-center gap-4 text-sm text-gray-600 mb-4">
          <div className="flex items-center gap-1">
            <User className="h-4 w-4" />
            <span>{creatorUser?.fullName || plan.createdBy || 'N/A'}</span>
          </div>
          <div className="flex items-center gap-1">
            <Calendar className="h-4 w-4" />
            <span>{formatDate(plan.createdAt)}</span>
          </div>
          <div className="flex items-center gap-1">
            <Store className="h-4 w-4" />
            <span>
              {plan.channel?.name || 'N/A'} • {plan.cpl?.name || 'N/A'} •{' '}
              {plan.category?.name || 'N/A'}
            </span>
          </div>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-4 gap-4 mb-4">
          <div>
            <div className="text-xs text-gray-500 mb-1">TOTAL SPEND</div>
            <div className="text-sm font-semibold text-gray-900">
              {formatCurrency(toNumber(plan.totalSpend))}
            </div>
          </div>
          <div>
            <div className="text-xs text-gray-500 mb-1">GP ROI</div>
            <div className="text-sm font-semibold text-gray-900">
              {formatPercentage(roi)}
            </div>
          </div>
          <div>
            <div className="text-xs text-gray-500 mb-1">UPLIFT %</div>
            <div className="text-sm font-semibold text-gray-900">
              {formatPercentage(upliftPercent)}
            </div>
          </div>
          <div>
            <div className="text-xs text-gray-500 mb-1">KAPSAM</div>
            <div className="text-sm font-semibold text-gray-900">
              {fuCount} FU / {skuCount} SKU
            </div>
          </div>
        </div>

        {/* Warning Banner */}
        {isLowRoi && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mb-4 flex items-start gap-2">
            <AlertTriangle className="h-5 w-5 text-yellow-600 mt-0.5" />
            <div className="text-sm text-yellow-800">
              ROI hedefin altında ({formatPercentage(roi)} &lt; %20).
              Taktiklerin gözden geçirilmesi önerilir.
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex gap-2">
          <Button variant="outline" onClick={onReview} className="flex-1">
            <Eye className="mr-2 h-4 w-4" />
            Detay İncele
          </Button>
          <Button
            variant="destructive"
            onClick={onReject}
            disabled={isRejecting || isApproving}
            className="flex-1"
          >
            <X className="mr-2 h-4 w-4" />
            Reddet
          </Button>
          <Button
            onClick={onApprove}
            disabled={isApproving || isRejecting}
            className="flex-1 bg-green-600 hover:bg-green-700"
          >
            <Check className="mr-2 h-4 w-4" />
            Onayla
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
