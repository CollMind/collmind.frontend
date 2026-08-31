import React from 'react';
import { BudgetEnvelope } from '@/types/budget.types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Loader2 } from 'lucide-react';
import {
  BUDGET_UTILIZATION_NOT_EVALUABLE_LABEL,
  describeBudgetUtilizationGap,
  evaluateBudgetUtilization,
} from '@/utils/budgetUtilization';

interface BudgetSummaryCardProps {
  envelope: BudgetEnvelope;
  reservedAmount?: number;
  isLoadingReserved?: boolean;
}

export function BudgetSummaryCard({
  envelope,
  reservedAmount,
  isLoadingReserved = false,
}: BudgetSummaryCardProps) {
  // ⛔ `reservedAmount ?? 0` KALDIRILDI (`§2.5`, 2026-08-31). `reservedAmount`
  // `GET /budget/envelopes/:id/reserved`'dan geliyor ve sorgu BAŞARISIZ
  // olduğunda `undefined` kalıyor — `isLoadingReserved` ise o durumda
  // `false`. Yani eski kod, okunamayan bir rezervasyonu "₺0 rezerve" sayıp
  // kullanım oranını EKSİK hesaplıyor ve sonucu gerçek bir sayı gibi
  // basıyordu. Artık okunamayan rezervasyon `NOT_EVALUABLE` üretir.
  //
  // ⛔ Ve eşik merdiveni (`>=80` / `>=100`) KALDIRILDI: `100` bir "kritik"
  // eşiği DEĞİLDİ — kanonik merdiven `>=80 AMBER · >=95 RED`
  // (backend `budget-threshold.service.ts#toStatus`). Tek karar noktası:
  // `utils/budgetUtilization.ts`.
  const utilization = isLoadingReserved
    ? null
    : evaluateBudgetUtilization(
        envelope.allocatedAmount,
        reservedAmount === undefined || reservedAmount === null
          ? null
          : envelope.consumedAmount + reservedAmount
      );
  const usageStatus =
    utilization !== null && utilization.kind === 'EVALUATED'
      ? utilization.status
      : null;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Bütçe Özeti</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Progress Bar */}
        <div>
          <div className="flex justify-between text-sm mb-2">
            <span className="text-gray-600">Kullanım Oranı</span>
            {utilization === null ? (
              <Loader2 className="h-4 w-4 animate-spin text-gray-400" />
            ) : utilization.kind === 'EVALUATED' ? (
              <span
                className={`font-medium ${
                  usageStatus === 'RED'
                    ? 'text-red-600'
                    : usageStatus === 'AMBER'
                      ? 'text-yellow-600'
                      : ''
                }`}
              >
                {utilization.percent.toFixed(1)}%
              </span>
            ) : (
              <span
                className="text-gray-400"
                title={describeBudgetUtilizationGap(utilization.reason)}
              >
                {BUDGET_UTILIZATION_NOT_EVALUABLE_LABEL}
              </span>
            )}
          </div>
          {utilization !== null && utilization.kind === 'EVALUATED' ? (
            <Progress
              value={utilization.percent}
              className={
                usageStatus === 'RED'
                  ? 'bg-red-200'
                  : usageStatus === 'AMBER'
                    ? 'bg-yellow-200'
                    : ''
              }
            />
          ) : (
            <div className="h-2 bg-gray-200 rounded-full" />
          )}
        </div>

        {/* Amount Cards */}
        <div className="grid grid-cols-2 gap-4">
          <div className="p-4 bg-blue-50 rounded-lg">
            <p className="text-sm text-gray-600 mb-1">Tahsis Edilen</p>
            <p className="text-2xl font-bold text-blue-700">
              {envelope.allocatedAmount.toLocaleString('tr-TR')}{' '}
              {envelope.currency}
            </p>
          </div>

          <div className="p-4 bg-green-50 rounded-lg">
            <p className="text-sm text-gray-600 mb-1">Kullanılabilir</p>
            <p
              className={`text-2xl font-bold ${
                envelope.availableAmount < 0 ? 'text-red-600' : 'text-green-700'
              }`}
            >
              {envelope.availableAmount.toLocaleString('tr-TR')}{' '}
              {envelope.currency}
            </p>
          </div>

          <div className="p-4 bg-yellow-50 rounded-lg">
            <p className="text-sm text-gray-600 mb-1">Rezerve Edilmiş</p>
            {isLoadingReserved ? (
              <div className="flex items-center gap-2">
                <Loader2 className="h-5 w-5 animate-spin text-yellow-600" />
                <span className="text-sm text-gray-500">Yükleniyor...</span>
              </div>
            ) : reservedAmount === undefined || reservedAmount === null ? (
              // ⛔ `|| 0` KALDIRILDI: rezervasyon OKUNAMADIYSA "₺0" DEĞİL,
              // "okunamadı" yazılır (`§2.5`).
              <p
                className="text-2xl font-bold text-gray-400"
                title="Rezerve edilen tutar okunamadı."
              >
                {BUDGET_UTILIZATION_NOT_EVALUABLE_LABEL}
              </p>
            ) : (
              <p className="text-2xl font-bold text-yellow-700">
                {reservedAmount.toLocaleString('tr-TR')} {envelope.currency}
              </p>
            )}
          </div>

          <div className="p-4 bg-orange-50 rounded-lg">
            <p className="text-sm text-gray-600 mb-1">Tüketilen</p>
            <p className="text-2xl font-bold text-orange-700">
              {envelope.consumedAmount.toLocaleString('tr-TR')}{' '}
              {envelope.currency}
            </p>
          </div>
        </div>

        {/* Additional Info */}
        <div className="pt-4 border-t space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-gray-600">Kod:</span>
            <span className="font-medium">{envelope.code}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">Dönem:</span>
            <span className="font-medium">
              {envelope.period} - {envelope.fiscalYear}
            </span>
          </div>
          {envelope.budgetOwnerName && (
            <div className="flex justify-between">
              <span className="text-gray-600">Sorumlu:</span>
              <span className="font-medium">{envelope.budgetOwnerName}</span>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
