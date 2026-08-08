import { toNumberOrZero } from '@/utils/numberUtils';
import React from 'react';
import { useBudgetEnvelopes } from '@/services/budget.service';
import { BudgetEnvelope } from '@/types/budget.types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import { Button } from '@/components/ui/button';
import { Plus, Download } from 'lucide-react';

interface BudgetDashboardProps {
  onCreateEnvelope?: () => void;
}

export function BudgetDashboard({ onCreateEnvelope }: BudgetDashboardProps) {
  const { data: envelopes, isLoading } = useBudgetEnvelopes();

  if (isLoading) {
    return <LoadingSpinner />;
  }

  const envelopesArray = Array.isArray(envelopes) ? envelopes : [];

  // T-106: one parser, shared with every other reader. This was a local copy
  // of `replace(/,/g,'') + parseFloat` — the pair that truncates "1.234.567,89"
  // to 1.234 instead of failing. `toNumberOrZero` names the zero it falls back to.
  const safeNumber = toNumberOrZero;

  // Özet hesaplamaları - Backend'den gelen decimal değerleri güvenli şekilde number'a dönüştür
  const totalAllocated = envelopesArray.reduce(
    (sum, env) => sum + safeNumber(env.allocatedAmount),
    0
  );
  const totalReserved = envelopesArray.reduce(
    (sum, env) => sum + safeNumber(env.reservedAmount),
    0
  );
  const totalConsumed = envelopesArray.reduce(
    (sum, env) => sum + safeNumber(env.consumedAmount),
    0
  );
  const totalOnInvConsumed = envelopesArray.reduce(
    (sum, env) => sum + safeNumber(env.onInvoiceConsumed),
    0
  );
  const totalOffInvConsumed = envelopesArray.reduce(
    (sum, env) => sum + safeNumber(env.offInvoiceConsumed),
    0
  );
  const totalAvailable = totalAllocated - totalReserved - totalConsumed;

  const onInvPercentage =
    totalConsumed > 0 ? (totalOnInvConsumed / totalConsumed) * 100 : 0;
  const offInvPercentage =
    totalConsumed > 0 ? (totalOffInvConsumed / totalConsumed) * 100 : 0;

  const formatCurrency = (amount: number, currency: string = 'TRY') => {
    return new Intl.NumberFormat('tr-TR', {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const formatCode = (envelope: BudgetEnvelope) => {
    if (envelope.channel && envelope.category) {
      return `${envelope.channel} (${envelope.category})`;
    }
    return envelope.code || envelope.name;
  };

  return (
    <div className="space-y-6">
      {/* Özet Kartları */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-600">
              TOPLAM TAHSİS
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">
              {formatCurrency(totalAllocated)}
            </p>
          </CardContent>
        </Card>

        <Card className="bg-yellow-50 border-yellow-200">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-700">
              RESERVED (BLOKE)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-yellow-700">
              {formatCurrency(totalReserved)}
            </p>
            <p className="text-xs text-gray-600 mt-1">Onaylı Planlar</p>
          </CardContent>
        </Card>

        <Card className="bg-blue-50 border-blue-200">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-700">
              TOPLAM CONSUMED
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-blue-700">
              {formatCurrency(totalConsumed)}
            </p>
            <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
              <div
                className="bg-blue-600 h-2 rounded-full"
                style={{
                  width: `${totalAllocated > 0 ? (totalConsumed / totalAllocated) * 100 : 0}%`,
                }}
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-600">
              ON-INV CONSUMED
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">
              {formatCurrency(totalOnInvConsumed)}
            </p>
            <p className="text-xs text-gray-600 mt-1">
              %{onInvPercentage.toFixed(0)} Pay
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-600">
              OFF-INV CONSUMED
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">
              {formatCurrency(totalOffInvConsumed)}
            </p>
            <p className="text-xs text-gray-600 mt-1">
              %{offInvPercentage.toFixed(0)} Pay
            </p>
          </CardContent>
        </Card>

        <Card className="bg-green-50 border-green-200">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-700">
              TOPLAM AVAILABLE
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-green-700">
              {formatCurrency(totalAvailable)}
            </p>
            <p className="text-xs text-gray-600 mt-1">
              Allocated - Reserved - Consumed
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Tablo */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle>Bütçe Zarfları</CardTitle>
            <Button variant="outline" size="sm" className="gap-2">
              <Download className="h-4 w-4" />
              Excel
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {envelopesArray.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              Henüz bütçe zarfı bulunmamaktadır.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left p-3 text-sm font-semibold text-gray-700">
                      KANAL / KATEGORİ
                    </th>
                    <th className="text-left p-3 text-sm font-semibold text-gray-700">
                      DÖNEM
                    </th>
                    <th className="text-right p-3 text-sm font-semibold text-gray-700">
                      TAHSİS
                    </th>
                    <th className="text-right p-3 text-sm font-semibold text-gray-700">
                      ON-INV CONS.
                    </th>
                    <th className="text-right p-3 text-sm font-semibold text-gray-700">
                      OFF-INV CONS.
                    </th>
                    <th className="text-right p-3 text-sm font-semibold text-gray-700">
                      RESERVED
                    </th>
                    <th className="text-right p-3 text-sm font-semibold text-gray-700">
                      TOTAL AVAILABLE
                    </th>
                    <th className="text-center p-3 text-sm font-semibold text-gray-700">
                      AKSİYON
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {envelopesArray.map((envelope) => (
                    <tr key={envelope.id} className="border-b hover:bg-gray-50">
                      <td className="p-3 font-medium">
                        {formatCode(envelope)}
                      </td>
                      <td className="p-3">{envelope.period}</td>
                      <td className="p-3 text-right">
                        {formatCurrency(
                          safeNumber(envelope.allocatedAmount),
                          envelope.currency
                        )}
                      </td>
                      <td className="p-3 text-right">
                        {formatCurrency(
                          safeNumber(envelope.onInvoiceConsumed),
                          envelope.currency
                        )}
                      </td>
                      <td className="p-3 text-right">
                        {formatCurrency(
                          safeNumber(envelope.offInvoiceConsumed),
                          envelope.currency
                        )}
                      </td>
                      <td className="p-3 text-right">
                        {formatCurrency(
                          safeNumber(envelope.reservedAmount),
                          envelope.currency
                        )}
                      </td>
                      <td className="p-3 text-right text-green-600 font-medium">
                        {formatCurrency(
                          safeNumber(envelope.availableAmount),
                          envelope.currency
                        )}
                      </td>
                      <td className="p-3 text-center">
                        <div className="flex justify-center gap-2">
                          <Button variant="ghost" size="sm">
                            Detay
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
