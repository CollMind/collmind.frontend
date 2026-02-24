import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  useBudgetEnvelope,
  useBudgetReservedAmount,
  useBudgetTransactions,
} from '@/services/budget.service';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import { Button } from '@/components/ui/button';
import { BudgetSummaryCard } from './BudgetSummaryCard';
import { BudgetTransactionsTable } from './BudgetTransactionsTable';
import { ArrowLeft } from 'lucide-react';

export function BudgetEnvelopeDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const {
    data: envelope,
    isLoading: isLoadingEnvelope,
    error: envelopeError,
  } = useBudgetEnvelope(id || '');

  const {
    data: reservedAmountData,
    isLoading: isLoadingReserved,
  } = useBudgetReservedAmount(id || '');

  const {
    data: transactions,
    isLoading: isLoadingTransactions,
    error: transactionsError,
  } = useBudgetTransactions(id || '');

  if (isLoadingEnvelope) {
    return <LoadingSpinner />;
  }

  if (envelopeError || !envelope) {
    return (
      <div className="text-red-600 p-4">
        Bütçe zarfı yüklenirken hata oluştu:{' '}
        {envelopeError instanceof Error ? envelopeError.message : 'Bilinmeyen hata'}
      </div>
    );
  }

  const reservedAmount = reservedAmountData?.reservedAmount ?? undefined;
  const isLoadingSummary = isLoadingReserved;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button
          variant="outline"
          size="icon"
          onClick={() => navigate('/budget')}
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-3xl font-bold">{envelope.name}</h1>
          <p className="text-gray-500">{envelope.code}</p>
        </div>
      </div>

      {/* Summary Card */}
      <BudgetSummaryCard
        envelope={envelope}
        reservedAmount={reservedAmount}
        isLoadingReserved={isLoadingSummary}
      />

      {/* Transactions Table */}
      <BudgetTransactionsTable
        transactions={transactions}
        isLoading={isLoadingTransactions}
        error={transactionsError as Error | null}
      />
    </div>
  );
}
