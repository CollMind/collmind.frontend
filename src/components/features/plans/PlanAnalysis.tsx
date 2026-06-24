import { useQuery } from '@tanstack/react-query';
import { planEndpoints } from '@/api/endpoints/plans.endpoints';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  TrendingUp,
  Zap,
  Shield,
  Clock,
  Package,
  ArrowDown,
  ArrowRight,
} from 'lucide-react';

interface PlanAnalysisProps {
  planId: string;
}

export function PlanAnalysis({ planId }: PlanAnalysisProps) {
  const { data: analysis, isLoading } = useQuery({
    queryKey: ['plan-analysis', planId],
    queryFn: () => planEndpoints.getAnalysis(planId).then((res) => res.data),
    enabled: !!planId,
  });

  if (isLoading) {
    return <div className="text-gray-500 p-4">Yükleniyor...</div>;
  }

  if (!analysis) {
    return <div className="text-red-600 p-4">Analiz verileri yüklenemedi.</div>;
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

  // GP ROI Performance Status
  const getRoiStatusBadge = () => {
    if (analysis.gpRoiPerformance.status === 'BELOW_TARGET') {
      return (
        <Badge
          variant="destructive"
          className="bg-red-100 text-red-800 border-red-200"
        >
          <ArrowDown className="h-3 w-3 mr-1" />
          Hedef Altı
        </Badge>
      );
    } else if (analysis.gpRoiPerformance.status === 'ON_TARGET') {
      return (
        <Badge className="bg-yellow-100 text-yellow-800 border-yellow-200">
          Hedefte
        </Badge>
      );
    } else {
      return (
        <Badge className="bg-green-100 text-green-800 border-green-200">
          Hedef Üstü
        </Badge>
      );
    }
  };

  // ON/OFF Split percentage
  const onInvoicePercentage =
    analysis.onOffSplit.total > 0
      ? (analysis.onOffSplit.onInvoice / analysis.onOffSplit.total) * 100
      : 0;
  const offInvoicePercentage =
    analysis.onOffSplit.total > 0
      ? (analysis.onOffSplit.offInvoice / analysis.onOffSplit.total) * 100
      : 0;

  return (
    <div className="space-y-6">
      {/* Top Row - 3 Cards */}
      <div className="grid grid-cols-3 gap-4">
        {/* GP ROI PERFORMANSI */}
        <Card className="border-gray-200">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-semibold text-gray-700">
                GP ROI PERFORMANSI
              </CardTitle>
              <TrendingUp className="h-5 w-5 text-blue-600" />
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <div className="text-3xl font-bold text-gray-900">
                {analysis.gpRoiPerformance.currentRoi !== null
                  ? formatPercentage(analysis.gpRoiPerformance.currentRoi, 1)
                  : '%0.0'}
              </div>
              <div className="mt-2">{getRoiStatusBadge()}</div>
            </div>
            <div className="space-y-1 text-xs">
              <div className="flex justify-between text-gray-600">
                <span>TARGET ROI</span>
                <span className="font-medium">
                  {formatPercentage(analysis.gpRoiPerformance.targetRoi, 1)}
                </span>
              </div>
              <div className="flex justify-between text-gray-600">
                <span>INCREMENTAL GP</span>
                <span className="font-medium">
                  {formatCurrency(analysis.gpRoiPerformance.incrementalGp)}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* FİNANSAL ÖZET */}
        <Card className="border-gray-200">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-semibold text-gray-700">
                FİNANSAL ÖZET
              </CardTitle>
              <Zap className="h-5 w-5 text-blue-600" />
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <div className="text-xs text-gray-500 mb-1">Toplam Harcama</div>
              <div className="text-3xl font-bold text-gray-900">
                {formatCurrency(analysis.financialSummary.totalSpend)}
              </div>
            </div>
            <div className="space-y-1 text-xs">
              <div className="flex justify-between text-gray-600">
                <span>PLANNED GP</span>
                <span className="font-medium">
                  {formatCurrency(analysis.financialSummary.plannedGp)}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* ON/OFF SPLIT */}
        <Card className="border-gray-200">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-semibold text-gray-700">
                ON/OFF SPLIT
              </CardTitle>
              <Zap className="h-5 w-5 text-blue-600" />
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="text-gray-600">On-Invoice</span>
                <span className="font-medium">
                  {formatPercentage(onInvoicePercentage, 1)}
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-blue-600 h-2 rounded-full"
                  style={{ width: `${onInvoicePercentage}%` }}
                />
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-gray-600">Off-Invoice</span>
                <span className="font-medium">
                  {formatPercentage(offInvoicePercentage, 1)}
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-purple-600 h-2 rounded-full"
                  style={{ width: `${offInvoicePercentage}%` }}
                />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Middle Row - 2 Cards */}
      <div className="grid grid-cols-2 gap-4">
        {/* FU Bazlı ROI Karşılaştırma */}
        <Card className="border-gray-200">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <Shield className="h-4 w-4 text-gray-500" />
              <CardTitle className="text-sm font-semibold text-gray-700">
                FU Bazlı ROI Karşılaştırma
              </CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {analysis.fuRoiComparison.length > 0 ? (
                analysis.fuRoiComparison.map((fu: any) => (
                  <div
                    key={fu.fuId}
                    className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0"
                  >
                    <span className="text-sm text-gray-700">{fu.fuName}</span>
                    <span className="text-sm font-medium text-gray-900">
                      {fu.roi !== null ? formatPercentage(fu.roi, 1) : 'N/A'}
                    </span>
                  </div>
                ))
              ) : (
                <div className="text-sm text-gray-500">Henüz FU eklenmemiş</div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Harcama Kırılımı */}
        <Card className="border-gray-200">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-gray-500" />
              <CardTitle className="text-sm font-semibold text-gray-700">
                Harcama Kırılımı
              </CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {analysis.spendBreakdown.length > 0 ? (
                analysis.spendBreakdown.map((item: any, index: number) => (
                  <div
                    key={index}
                    className="flex items-center justify-between py-2"
                  >
                    <div className="flex items-center gap-2">
                      <div
                        className="w-3 h-3 rounded-full"
                        style={{
                          backgroundColor: index === 0 ? '#3B82F6' : '#8B5CF6',
                        }}
                      />
                      <span className="text-sm text-gray-700">
                        {item.tacticName}
                      </span>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-medium text-gray-900">
                        {formatCurrency(item.spend)}
                      </div>
                      <div className="text-xs text-gray-500">
                        {formatPercentage(item.percentage, 1)}
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-sm text-gray-500">
                  Henüz harcama yapılmamış
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Bottom Row - Volume Analizi */}
      <Card className="border-gray-200">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <Package className="h-4 w-4 text-gray-500" />
            <CardTitle className="text-sm font-semibold text-gray-700">
              Volume Analizi
            </CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-6">
            {/* Left: Base Volume and Planned Volume */}
            <div className="space-y-4">
              <div>
                <div className="text-xs text-gray-500 mb-1">BASE VOLUME</div>
                <div className="text-2xl font-bold text-gray-900">
                  {formatNumber(analysis.volumeAnalysis.baseVolume, 0)}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <ArrowRight className="h-4 w-4 text-gray-400" />
              </div>
              <div>
                <div className="text-xs text-gray-500 mb-1">PLANNED VOLUME</div>
                <div className="text-2xl font-bold text-gray-900">
                  {formatNumber(analysis.volumeAnalysis.plannedVolume, 0)}
                </div>
                <div className="text-xs text-gray-500 mt-1">FU</div>
              </div>
            </div>

            {/* Middle: Uplift Performance */}
            <div className="space-y-2">
              <div>
                <div className="text-xs text-gray-500 mb-1">
                  UPLIFT PERFORMANSI
                </div>
                <div className="text-3xl font-bold text-orange-600">
                  {formatPercentage(
                    analysis.volumeAnalysis.upliftPercentage,
                    1
                  )}
                </div>
              </div>
              <div className="text-sm text-orange-600 font-medium">
                +{formatNumber(analysis.volumeAnalysis.incrementalVolume, 0)}{' '}
                ADET
              </div>
            </div>

            {/* Right: FU Details Table */}
            <div className="border-l border-gray-200 pl-6">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-2 text-xs font-semibold text-gray-600 uppercase">
                      BASE
                    </th>
                    <th className="text-left py-2 text-xs font-semibold text-gray-600 uppercase">
                      PLANNED
                    </th>
                    <th className="text-left py-2 text-xs font-semibold text-gray-600 uppercase">
                      UPLIFT
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {analysis.volumeAnalysis.fuDetails.map((fu: any) => (
                    <tr key={fu.fuId} className="border-b border-gray-100">
                      <td className="py-2 text-gray-700">
                        {formatNumber(fu.baseVolume, 0)}
                      </td>
                      <td className="py-2 font-semibold text-gray-900">
                        {formatNumber(fu.plannedVolume, 0)}
                      </td>
                      <td className="py-2 text-gray-700">
                        {formatPercentage(fu.uplift, 0)}
                      </td>
                    </tr>
                  ))}
                  {analysis.volumeAnalysis.fuDetails.length === 0 && (
                    <tr>
                      <td
                        colSpan={3}
                        className="py-4 text-center text-gray-500 text-xs"
                      >
                        Henüz FU eklenmemiş
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
