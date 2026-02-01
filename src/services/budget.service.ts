import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { budgetEndpoints } from '@/api/endpoints/budget.endpoints';
import {
  BudgetEnvelope,
  BudgetReservation,
  CreateBudgetEnvelopeDto,
  ReserveBudgetDto,
} from '@/types/budget.types';
import { useToast } from '@/hooks/useToast';

export const budgetKeys = {
  all: ['budget'] as const,
  envelopes: () => [...budgetKeys.all, 'envelopes'] as const,
  envelope: (id: string) => [...budgetKeys.envelopes(), id] as const,
  reservations: (envelopeId: string) =>
    [...budgetKeys.all, 'reservations', envelopeId] as const,
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
      toast.error(error.response?.data?.message || 'Budget envelope oluşturulamadı');
    },
  });
};

export const useReserveBudget = () => {
  const queryClient = useQueryClient();
  const toast = useToast();

  return useMutation({
    mutationFn: (data: ReserveBudgetDto) =>
      budgetEndpoints.reserveBudget(data).then((res) => res.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: budgetKeys.all });
      toast.success('Budget başarıyla rezerve edildi');
    },
    onError: (error: any) => {
      const errorMessage =
        error.response?.data?.message || 'Budget rezerve edilemedi';
      toast.error(errorMessage);
    },
  });
};

export const useApproveReservation = () => {
  const queryClient = useQueryClient();
  const toast = useToast();

  return useMutation({
    mutationFn: (id: string) =>
      budgetEndpoints.approveReservation(id).then((res) => res.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: budgetKeys.all });
      toast.success('Rezervasyon onaylandı');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Rezervasyon onaylanamadı');
    },
  });
};

export const useRejectReservation = () => {
  const queryClient = useQueryClient();
  const toast = useToast();

  return useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) =>
      budgetEndpoints.rejectReservation(id, reason).then((res) => res.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: budgetKeys.all });
      toast.success('Rezervasyon reddedildi');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Rezervasyon reddedilemedi');
    },
  });
};

export const useBudgetReservations = (envelopeId: string) => {
  return useQuery({
    queryKey: budgetKeys.reservations(envelopeId),
    queryFn: () =>
      budgetEndpoints.getReservationsByEnvelope(envelopeId).then((res) => res.data),
    enabled: !!envelopeId,
  });
};


