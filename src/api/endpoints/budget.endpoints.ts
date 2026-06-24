import apiClient from '../client';
import {
  BudgetEnvelope,
  BudgetReservation,
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

  // Budget Reservations
  reserveBudget: (data: ReserveBudgetDto) =>
    apiClient.post<BudgetReservation>('/budget/reserve', data),

  approveReservation: (id: string) =>
    apiClient.post<BudgetReservation>(`/budget/reservations/${id}/approve`),

  rejectReservation: (id: string, reason: string) =>
    apiClient.post<BudgetReservation>(`/budget/reservations/${id}/reject`, {
      reason,
    }),

  getReservationsByEnvelope: (envelopeId: string) =>
    apiClient.get<BudgetReservation[]>(
      `/budget/envelopes/${envelopeId}/reservations`
    ),

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
      status: 'GREEN' | 'YELLOW' | 'RED';
    }>('/budget/status', {
      params: { channel, categoryId, periodMonth },
    }),
};
