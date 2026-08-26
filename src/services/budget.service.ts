import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { budgetEndpoints } from '@/api/endpoints/budget.endpoints';
import {
  BudgetEnvelope,
  BudgetTransaction,
  ReservedAmountResponse,
  CreateBudgetEnvelopeDto,
} from '@/types/budget.types';
import { useToast } from '@/hooks/useToast';

export const budgetKeys = {
  all: ['budget'] as const,
  envelopes: () => [...budgetKeys.all, 'envelopes'] as const,
  envelope: (id: string) => [...budgetKeys.envelopes(), id] as const,
  reservedAmount: (id: string) =>
    [...budgetKeys.envelope(id), 'reserved'] as const,
  transactions: (id: string) =>
    [...budgetKeys.envelope(id), 'transactions'] as const,
};

export const useBudgetEnvelopes = () => {
  return useQuery({
    queryKey: budgetKeys.envelopes(),
    queryFn: () => budgetEndpoints.getAllEnvelopes().then((res) => res.data),
  });
};

export const useBudgetEnvelope = (id: string) => {
  return useQuery({
    queryKey: budgetKeys.envelope(id),
    queryFn: () => budgetEndpoints.getEnvelopeById(id).then((res) => res.data),
    enabled: !!id,
  });
};

export const useCreateBudgetEnvelope = () => {
  const queryClient = useQueryClient();
  const toast = useToast();

  return useMutation({
    mutationFn: (data: CreateBudgetEnvelopeDto) =>
      budgetEndpoints.createEnvelope(data).then((res) => res.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: budgetKeys.envelopes() });
      toast.success('Budget envelope başarıyla oluşturuldu');
    },
    onError: (error: any) => {
      toast.error(
        error.response?.data?.message || 'Budget envelope oluşturulamadı'
      );
    },
  });
};

// `useReserveBudget` KALDIRILDI (T-289, `Z38`, `B3` kaza-dalgası `K6(c)`,
// 2026-08-26) — backend `POST /budget/reserve` ile birlikte (T-277 deseni).

/**
 * Rezerve edilmiş tutarı getiren hook
 */
export const useBudgetReservedAmount = (envelopeId: string) => {
  return useQuery({
    queryKey: budgetKeys.reservedAmount(envelopeId),
    queryFn: () =>
      budgetEndpoints.getReservedAmount(envelopeId).then((res) => res.data),
    enabled: !!envelopeId,
  });
};

/**
 * Bütçe zarfı işlem geçmişini getiren hook
 */
export const useBudgetTransactions = (envelopeId: string) => {
  return useQuery({
    queryKey: budgetKeys.transactions(envelopeId),
    queryFn: () =>
      budgetEndpoints.getTransactions(envelopeId).then((res) => res.data),
    enabled: !!envelopeId,
  });
};
