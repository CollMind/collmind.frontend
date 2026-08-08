import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Plan, planEndpoints } from '@/api/endpoints/plans.endpoints';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import {
  X,
  Check,
  AlertTriangle,
  User,
  Calendar,
  Store,
  Layers,
} from 'lucide-react';
import { userEndpoints } from '@/api/endpoints/users.endpoints';
import { toNumber, toNumberOrZero } from '@/utils/numberUtils';

interface PlanApprovalDetailModalProps {
  plan: Plan;
  onClose: () => void;
  onApprove: () => void;
  onReject: (reason: string) => void;
  isApproving: boolean;
  isRejecting: boolean;
}

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('tr-TR', {
    style: 'currency',
    currency: 'TRY',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
};

const formatNumber = (value: number, decimals: number = 0) => {
  return new Intl.NumberFormat('tr-TR', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value);
};

const formatPercentage = (value: number, decimals: number = 1) => {
  return `${formatNumber(value, decimals)}%`;
};

const formatDate = (dateString?: string) => {
  if (!dateString) return 'N/A';
  const date = new Date(dateString);
  return date.toLocaleDateString('tr-TR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
};

export function PlanApprovalDetailModal({
  plan,
  onClose,
  onApprove,
  onReject,
  isApproving,
  isRejecting,
}: PlanApprovalDetailModalProps) {
  const [comments, setComments] = useState('');

  // Fetch full plan details with relations if not already loaded
  const { data: fullPlan } = useQuery({
    queryKey: ['plan', plan.id],
    queryFn: () => planEndpoints.getById(plan.id).then((res) => res.data),
    enabled: !plan.planFus || plan.planFus.length === 0,
    initialData: plan,
  });

  const planData = fullPlan || plan;

  const { data: creatorUser } = useQuery({
    queryKey: ['user', planData.createdBy],
    queryFn: () =>
      userEndpoints.getById(planData.createdBy!).then((res) => res.data),
    enabled: !!planData.createdBy,
  });

  // Calculate volumes
  const baseVolume =
    planData.planFus?.reduce(
      (sum, fu) =>
        sum +
        (fu.planSkus?.reduce((s, sku) => s + (sku.baseVolume || 0), 0) || 0),
      0
    ) || 0;
  const plannedVolume = toNumberOrZero(planData.totalPlannedVolume);
  const incremental = plannedVolume - baseVolume;
  const incrementalPercent =
    baseVolume > 0 ? (incremental / baseVolume) * 100 : 0;
  const incrementalGp = planData.totalGp - baseVolume * 0; // Simplified - should calculate base GP properly
  const roi = planData.overallRoi || 0;
  const isLowRoi = roi < 20;

  const handleApprove = () => {
    onApprove();
  };

  const handleReject = () => {
    if (!comments.trim()) {
      alert('Red gerekçesi zorunludur');
      return;
    }
    onReject(comments);
  };

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-7xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold">
            Plan Onay İncelemesi
          </DialogTitle>
          <div className="flex items-center gap-2 mt-2">
            <span className="text-sm text-gray-600">{planData.planCode}</span>
            <span className="text-sm font-semibold text-gray-900">
              {planData.planName}
            </span>
          </div>
        </DialogHeader>

        <div className="grid grid-cols-3 gap-6 mt-4">
          {/* Left Panel - Plan Overview */}
          <div className="col-span-1 space-y-4">
            {/* Plan Details */}
            <Card className="border-gray-200">
              <CardContent className="p-4 space-y-3">
                <div className="flex items-center gap-2 text-sm">
                  <User className="h-4 w-4 text-gray-400" />
                  <span className="text-gray-600">Oluşturan:</span>
                  <span className="font-medium">
                    {creatorUser?.fullName || planData.createdBy || 'N/A'}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <Calendar className="h-4 w-4 text-gray-400" />
                  <span className="text-gray-600">Dönem:</span>
                  <span className="font-medium">
                    {formatDate(planData.startDate)} -{' '}
                    {formatDate(planData.endDate)}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <Store className="h-4 w-4 text-gray-400" />
                  <span className="text-gray-600">Kanal / CPL:</span>
                  <span className="font-medium">
                    {planData.channel?.name || 'N/A'} •{' '}
                    {planData.cpl?.name || 'N/A'}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <Layers className="h-4 w-4 text-gray-400" />
                  <span className="text-gray-600">Kategori:</span>
                  <span className="font-medium">
                    {planData.category?.name || 'N/A'}
                  </span>
                </div>
              </CardContent>
            </Card>

            {/* KPI Summary */}
            <Card className="border-gray-200">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold">
                  KPI Özeti
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">BASE VOL:</span>
                  <span className="font-medium">
                    {formatNumber(baseVolume, 0)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">PLANNED:</span>
                  <span className="font-medium">
                    {formatNumber(plannedVolume, 0)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">INCR.:</span>
                  <span className="font-medium">
                    +{formatNumber(incremental, 0)} (
                    {formatPercentage(incrementalPercent)})
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">TOTAL SPEND:</span>
                  <span className="font-medium">
                    {formatCurrency(toNumberOrZero(planData.totalSpend))}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">INCR. GP:</span>
                  <span className="font-medium">
                    {formatCurrency(incrementalGp)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">GP ROI:</span>
                  <span
                    className={`font-medium ${isLowRoi ? 'text-red-600' : ''}`}
                  >
                    {formatPercentage(roi)}
                  </span>
                </div>
                {isLowRoi && (
                  <div className="mt-3 p-2 bg-yellow-50 border border-yellow-200 rounded flex items-start gap-2">
                    <AlertTriangle className="h-4 w-4 text-yellow-600 mt-0.5" />
                    <span className="text-xs text-yellow-800">
                      GP ROI {formatPercentage(roi)} - Hedefin altında.
                    </span>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Right Panel - FU Details and Planning Grid */}
          <div className="col-span-2 space-y-4">
            {/* FU Based Details */}
            <div>
              <h3 className="text-sm font-semibold text-gray-700 mb-3">
                FU Bazlı Detay
              </h3>
              <div className="grid grid-cols-3 gap-3">
                {planData.planFus?.map((planFu) => {
                  const fuBaseVolume =
                    planFu.planSkus?.reduce(
                      (sum, sku) => sum + (sku.baseVolume || 0),
                      0
                    ) || 0;
                  const fuPlannedVolume = toNumberOrZero(
                    planFu.totalPlannedVolume
                  );
                  const fuIncremental = fuPlannedVolume - fuBaseVolume;
                  const fuUplift =
                    fuBaseVolume > 0 ? (fuIncremental / fuBaseVolume) * 100 : 0;
                  const fuRoi = planFu.gpRoi || 0;
                  const isFuLowRoi = fuRoi < 20;

                  return (
                    <Card key={planFu.id} className="border-gray-200">
                      <CardContent className="p-3">
                        <div className="text-xs font-semibold text-gray-900 mb-2">
                          {planFu.fu?.name || 'N/A'}
                        </div>
                        <div className="space-y-1 text-xs">
                          <div className="flex justify-between">
                            <span className="text-gray-600">PLANNED VOL</span>
                            <span className="font-medium">
                              {formatNumber(fuPlannedVolume, 0)} (+
                              {formatPercentage(fuUplift)})
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-600">TACTIC SPEND</span>
                            <span className="font-medium">
                              {formatCurrency(
                                toNumberOrZero(planFu.totalSpend)
                              )}
                            </span>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="text-gray-600">ROI</span>
                            <Badge
                              variant={isFuLowRoi ? 'destructive' : 'default'}
                              className={
                                isFuLowRoi
                                  ? 'bg-yellow-100 text-yellow-800'
                                  : ''
                              }
                            >
                              {formatPercentage(fuRoi)}
                            </Badge>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </div>

            {/* Planning Grid Preview */}
            <div>
              <h3 className="text-sm font-semibold text-gray-700 mb-3">
                PLANLAMA TABLOSU (ÖNİZLEME)
              </h3>
              <div className="border border-gray-200 rounded-lg overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50 border-b border-gray-200">
                      <tr>
                        <th className="px-4 py-2 text-left text-xs font-semibold text-gray-600 uppercase">
                          FU / SKU
                        </th>
                        <th className="px-4 py-2 text-right text-xs font-semibold text-gray-600 uppercase">
                          BASE VOL
                        </th>
                        <th className="px-4 py-2 text-right text-xs font-semibold text-gray-600 uppercase">
                          PLANNED VOL
                        </th>
                        <th className="px-4 py-2 text-right text-xs font-semibold text-gray-600 uppercase">
                          UPLİFT %
                        </th>
                        <th className="px-4 py-2 text-right text-xs font-semibold text-gray-600 uppercase">
                          FİYAT
                        </th>
                        <th className="px-4 py-2 text-right text-xs font-semibold text-gray-600 uppercase">
                          GP ROI
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {planData.planFus?.map((planFu) => {
                        const fuBaseVolume =
                          planFu.planSkus?.reduce(
                            (sum, sku) => sum + (sku.baseVolume || 0),
                            0
                          ) || 0;
                        const fuPlannedVolume = toNumberOrZero(
                          planFu.totalPlannedVolume
                        );
                        const fuIncremental = fuPlannedVolume - fuBaseVolume;
                        const fuUplift =
                          fuBaseVolume > 0
                            ? (fuIncremental / fuBaseVolume) * 100
                            : 0;
                        const fuRoi = planFu.gpRoi || 0;

                        return (
                          <>
                            {/* FU Row */}
                            <tr key={`fu-${planFu.id}`} className="bg-gray-50">
                              <td className="px-4 py-2 font-semibold text-gray-900">
                                {planFu.fu?.name || 'N/A'}
                              </td>
                              <td className="px-4 py-2 text-right">
                                {formatNumber(fuBaseVolume, 0)}
                              </td>
                              <td className="px-4 py-2 text-right font-semibold">
                                {formatNumber(fuPlannedVolume, 0)}
                              </td>
                              <td className="px-4 py-2 text-right">
                                {formatPercentage(fuUplift)}
                              </td>
                              <td className="px-4 py-2 text-right">-</td>
                              <td
                                className={`px-4 py-2 text-right ${fuRoi < 20 ? 'text-red-600' : ''}`}
                              >
                                {formatPercentage(fuRoi)}
                              </td>
                            </tr>
                            {/* SKU Rows */}
                            {planFu.planSkus?.map((planSku) => {
                              const skuBaseVolume = planSku.baseVolume || 0;
                              const skuPlannedVolume =
                                planSku.plannedVolume || 0;
                              const skuIncremental =
                                skuPlannedVolume - skuBaseVolume;
                              const skuUplift =
                                skuBaseVolume > 0
                                  ? (skuIncremental / skuBaseVolume) * 100
                                  : 0;
                              const skuPrice = planSku.sku?.unitPrice || 0;

                              return (
                                <tr
                                  key={`sku-${planSku.id}`}
                                  className="bg-white"
                                >
                                  <td className="px-4 py-2 pl-8 text-gray-700">
                                    {planSku.sku?.name || 'N/A'}
                                  </td>
                                  <td className="px-4 py-2 text-right">
                                    {formatNumber(skuBaseVolume, 0)}
                                  </td>
                                  <td className="px-4 py-2 text-right">
                                    {formatNumber(skuPlannedVolume, 0)}
                                  </td>
                                  <td className="px-4 py-2 text-right">
                                    {formatPercentage(skuUplift)}
                                  </td>
                                  <td className="px-4 py-2 text-right">
                                    {formatCurrency(skuPrice)}
                                  </td>
                                  <td className="px-4 py-2 text-right">-</td>
                                </tr>
                              );
                            })}
                          </>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Approval Note and Actions */}
        <div className="mt-6 space-y-4 border-t border-gray-200 pt-4">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 flex items-start gap-2">
            <AlertTriangle className="h-5 w-5 text-blue-600 mt-0.5" />
            <span className="text-sm text-blue-800">
              Onaylandığında{' '}
              {formatCurrency(toNumberOrZero(planData.totalSpend))} bütçe commit
              edilecektir. Bütçe durumu onay adımında kontrol edilecektir.
            </span>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Red gerekçesi (reddetme durumunda)
            </label>
            <Textarea
              value={comments}
              onChange={(e) => setComments(e.target.value)}
              placeholder="Red gerekçenizi yazın..."
              className="min-h-[80px]"
            />
          </div>

          <div className="flex gap-2 justify-end">
            <Button
              variant="destructive"
              onClick={handleReject}
              disabled={isRejecting || isApproving}
            >
              <X className="mr-2 h-4 w-4" />
              Reddet
            </Button>
            <Button
              onClick={handleApprove}
              disabled={isApproving || isRejecting}
              className="bg-green-600 hover:bg-green-700"
            >
              <Check className="mr-2 h-4 w-4" />
              Bütçe Kontrolü ve Onay
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
