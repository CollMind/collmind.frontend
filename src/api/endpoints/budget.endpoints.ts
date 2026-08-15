import apiClient from '../client';
import {
  BudgetEnvelope,
  BudgetTransaction,
  ReservedAmountResponse,
  CreateBudgetEnvelopeDto,
  ReserveBudgetDto,
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

  // Budget Reservation (Event-Sourced: backend `reserveBudget` yazar
  // ve `BudgetTransaction` döner — bkz. T-225, backend
  // `modules/shared/budget/budget.service.ts:197..`)
  reserveBudget: (data: ReserveBudgetDto) =>
    apiClient.post<BudgetTransaction>('/budget/reserve', data),

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
