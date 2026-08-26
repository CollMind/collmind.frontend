import apiClient from '../client';
import {
  BudgetEnvelope,
  BudgetTransaction,
  ReservedAmountResponse,
  CreateBudgetEnvelopeDto,
} from '@/types/budget.types';

export const budgetEndpoints = {
  // Budget Envelopes
  createEnvelope: (data: CreateBudgetEnvelopeDto) =>
    apiClient.post<BudgetEnvelope>('/budget/envelopes', data),

  getAllEnvelopes: () => apiClient.get<BudgetEnvelope[]>('/budget/envelopes'),

  getEnvelopeById: (id: string) =>
    apiClient.get<BudgetEnvelope>(`/budget/envelopes/${id}`),

  // Budget Reserved Amount
  getReservedAmount: (id: string) =>
    apiClient.get<ReservedAmountResponse>(`/budget/envelopes/${id}/reserved`),

  // Budget Transactions
  getTransactions: (id: string) =>
    apiClient.get<BudgetTransaction[]>(`/budget/envelopes/${id}/transactions`),

  // `reserveBudget` (`POST /budget/reserve`) KALDIRILDI (T-289, `Z38`,
  // `B3` kaza-dalgası `K6(c)`, 2026-08-26) — backend ucu ölü/kırıktı
  // (her çağrıda 500, `PessimisticLockTransactionRequiredError`) ve
  // kanonik rezervasyon yolu `reserveForAgreement`/`reserveTypedForPlan`
  // (anlaşma/plan onayından) zaten canlı.

  getBudgetStatus: (
    channel: string,
    categoryId?: string,
    periodMonth?: string
  ) =>
    apiClient.get<{
      totalAllocation: number;
      available: number;
      reserved: number;
      consumed: number;
      planned: number;
      status: 'GREEN' | 'AMBER' | 'RED';
    }>('/budget/status', {
      params: { channel, categoryId, periodMonth },
    }),
};
