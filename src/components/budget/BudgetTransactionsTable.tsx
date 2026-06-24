import React from 'react';
import {
  BudgetTransaction,
  BudgetTransactionType,
  BudgetTransactionStatus,
  BudgetTransactionSourceType,
} from '@/types/budget.types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { EnumBadge } from '@/components/common/EnumBadge';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';

interface BudgetTransactionsTableProps {
  transactions: BudgetTransaction[] | undefined;
  isLoading?: boolean;
  error?: Error | null;
}

const getTransactionTypeLabel = (type: BudgetTransactionType): string => {
  const labels: Record<BudgetTransactionType, string> = {
    RESERVE: 'Rezerve',
    CONSUME: 'Tüket',
    RELEASE: 'Serbest Bırak',
    ADJUST: 'Ayarla',
  };
  return labels[type] || type;
};

const getTransactionStatusLabel = (status: BudgetTransactionStatus): string => {
  const labels: Record<BudgetTransactionStatus, string> = {
    POSTED: 'İşlendi',
    PENDING: 'Beklemede',
    CANCELLED: 'İptal Edildi',
  };
  return labels[status] || status;
};

const getSourceTypeLabel = (
  sourceType: BudgetTransactionSourceType
): string => {
  const labels: Record<BudgetTransactionSourceType, string> = {
    AGREEMENT: 'Anlaşma',
    MANUAL: 'Manuel',
    SYSTEM: 'Sistem',
  };
  return labels[sourceType] || sourceType;
};

const formatDate = (dateString: string): string => {
  const date = new Date(dateString);
  return date.toLocaleString('tr-TR', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
};

export function BudgetTransactionsTable({
  transactions,
  isLoading,
  error,
}: BudgetTransactionsTableProps) {
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>İşlem Geçmişi</CardTitle>
        </CardHeader>
        <CardContent>
          <LoadingSpinner />
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>İşlem Geçmişi</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-red-600">
            İşlem geçmişi yüklenirken hata oluştu: {error.message}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!transactions || transactions.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>İşlem Geçmişi</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-gray-500">
            Henüz işlem geçmişi bulunmamaktadır.
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>İşlem Geçmişi</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b">
                <th className="text-left p-3 text-sm font-semibold text-gray-700">
                  Tarih
                </th>
                <th className="text-left p-3 text-sm font-semibold text-gray-700">
                  Tip
                </th>
                <th className="text-left p-3 text-sm font-semibold text-gray-700">
                  Durum
                </th>
                <th className="text-left p-3 text-sm font-semibold text-gray-700">
                  Kaynak
                </th>
                <th className="text-right p-3 text-sm font-semibold text-gray-700">
                  Tutar
                </th>
                <th className="text-left p-3 text-sm font-semibold text-gray-700">
                  Açıklama
                </th>
              </tr>
            </thead>
            <tbody>
              {transactions.map((transaction) => (
                <tr key={transaction.id} className="border-b hover:bg-gray-50">
                  <td className="p-3 text-sm">
                    {formatDate(transaction.createdAt)}
                  </td>
                  <td className="p-3">
                    <EnumBadge value={transaction.txType} />
                  </td>
                  <td className="p-3">
                    <EnumBadge value={transaction.txStatus} />
                  </td>
                  <td className="p-3 text-sm">
                    <div>
                      <div className="font-medium">
                        {getSourceTypeLabel(transaction.sourceType)}
                      </div>
                      <div className="text-xs text-gray-500">
                        {transaction.sourceId}
                      </div>
                    </div>
                  </td>
                  <td className="p-3 text-right text-sm font-medium">
                    {(() => {
                      // RELEASE her zaman pozitif (bütçeyi serbest bırakır)
                      if (
                        transaction.txType === BudgetTransactionType.RELEASE
                      ) {
                        return (
                          <span className="text-green-600">
                            +{transaction.amount.toLocaleString('tr-TR')}{' '}
                            {transaction.currency}
                          </span>
                        );
                      }
                      // ADJUST amount'un işaretine göre pozitif veya negatif olabilir
                      if (transaction.txType === BudgetTransactionType.ADJUST) {
                        const isPositive = transaction.amount >= 0;
                        return (
                          <span
                            className={
                              isPositive ? 'text-green-600' : 'text-red-600'
                            }
                          >
                            {isPositive ? '+' : ''}
                            {transaction.amount.toLocaleString('tr-TR')}{' '}
                            {transaction.currency}
                          </span>
                        );
                      }
                      // RESERVE ve CONSUME her zaman negatif (bütçeyi azaltır)
                      return (
                        <span className="text-red-600">
                          -{transaction.amount.toLocaleString('tr-TR')}{' '}
                          {transaction.currency}
                        </span>
                      );
                    })()}
                  </td>
                  <td className="p-3 text-sm text-gray-600">
                    {transaction.description || '-'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}
