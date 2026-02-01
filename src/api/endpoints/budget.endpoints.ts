import apiClient from '../client';
import {
  BudgetEnvelope,
  BudgetReservation,
  CreateBudgetEnvelopeDto,
  ReserveBudgetDto,
} from '@/types/budget.types';

export const budgetEndpoints = {
  // Budget Envelopes
  createEnvelope: (data: CreateBudgetEnvelopeDto) =>
    apiClient.post<BudgetEnvelope>('/budget/envelopes', data),

  getAllEnvelopes: () =>
    apiClient.get<BudgetEnvelope[]>('/budget/envelopes'),

  getEnvelopeById: (id: string) =>
    apiClient.get<BudgetEnvelope>(`/budget/envelopes/${id}`),

  // Budget Reservations
  reserveBudget: (data: ReserveBudgetDto) =>
    apiClient.post<BudgetReservation>('/budget/reserve', data),

  approveReservation: (id: string) =>
    apiClient.post<BudgetReservation>(`/budget/reservations/${id}/approve`),

  rejectReservation: (id: string, reason: string) =>
    apiClient.post<BudgetReservation>(`/budget/reservations/${id}/reject`, { reason }),

  getReservationsByEnvelope: (envelopeId: string) =>
    apiClient.get<BudgetReservation[]>(`/budget/envelopes/${envelopeId}/reservations`),
};


