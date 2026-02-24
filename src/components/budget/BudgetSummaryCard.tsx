import React from 'react';
import { BudgetEnvelope } from '@/types/budget.types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Loader2 } from 'lucide-react';

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
  // Rezerve edilmiş tutar yüklenirken hesaplamaları yapma
  const effectiveReservedAmount = isLoadingReserved ? undefined : (reservedAmount ?? 0);
  const totalUsed = effectiveReservedAmount !== undefined
    ? envelope.consumedAmount + effectiveReservedAmount
    : undefined;
  const usagePercent =
    totalUsed !== undefined && envelope.allocatedAmount > 0
      ? (totalUsed / envelope.allocatedAmount) * 100
      : undefined;

  const isNearLimit = usagePercent !== undefined && usagePercent >= 80;
  const isOverLimit = usagePercent !== undefined && usagePercent >= 100;

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
            {isLoadingReserved ? (
              <Loader2 className="h-4 w-4 animate-spin text-gray-400" />
            ) : usagePercent !== undefined ? (
              <span
                className={`font-medium ${
                  isOverLimit ? 'text-red-600' : isNearLimit ? 'text-yellow-600' : ''
                }`}
              >
                {usagePercent.toFixed(1)}%
              </span>
            ) : (
              <span className="text-gray-400">-</span>
            )}
          </div>
          {usagePercent !== undefined ? (
            <Progress
              value={usagePercent}
              className={isOverLimit ? 'bg-red-200' : isNearLimit ? 'bg-yellow-200' : ''}
            />
          ) : (
            <div className="h-2 bg-gray-200 rounded-full animate-pulse" />
          )}
        </div>

        {/* Amount Cards */}
        <div className="grid grid-cols-2 gap-4">
          <div className="p-4 bg-blue-50 rounded-lg">
            <p className="text-sm text-gray-600 mb-1">Tahsis Edilen</p>
            <p className="text-2xl font-bold text-blue-700">
              {envelope.allocatedAmount.toLocaleString('tr-TR')} {envelope.currency}
            </p>
          </div>

          <div className="p-4 bg-green-50 rounded-lg">
            <p className="text-sm text-gray-600 mb-1">Kullanılabilir</p>
            <p
              className={`text-2xl font-bold ${
                envelope.availableAmount < 0 ? 'text-red-600' : 'text-green-700'
              }`}
            >
              {envelope.availableAmount.toLocaleString('tr-TR')} {envelope.currency}
            </p>
          </div>

          <div className="p-4 bg-yellow-50 rounded-lg">
            <p className="text-sm text-gray-600 mb-1">Rezerve Edilmiş</p>
            {isLoadingReserved ? (
              <div className="flex items-center gap-2">
                <Loader2 className="h-5 w-5 animate-spin text-yellow-600" />
                <span className="text-sm text-gray-500">Yükleniyor...</span>
              </div>
            ) : (
              <p className="text-2xl font-bold text-yellow-700">
                {effectiveReservedAmount.toLocaleString('tr-TR')} {envelope.currency}
              </p>
            )}
          </div>

          <div className="p-4 bg-orange-50 rounded-lg">
            <p className="text-sm text-gray-600 mb-1">Tüketilen</p>
            <p className="text-2xl font-bold text-orange-700">
              {envelope.consumedAmount.toLocaleString('tr-TR')} {envelope.currency}
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
