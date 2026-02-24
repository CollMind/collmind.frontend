import { useQuery } from '@tanstack/react-query';
import { ledgerEndpoints } from '@/api/endpoints/ledger.endpoints';
import {
  LedgerEntry,
  LedgerFilterDto,
  ConsumedAmountResponse,
} from '@/types/ledger.types';
import { useToast } from '@/hooks/useToast';

export const ledgerKeys = {
  all: ['ledger'] as const,
  lists: () => [...ledgerKeys.all, 'list'] as const,
  list: (filters?: LedgerFilterDto) => [...ledgerKeys.lists(), filters] as const,
  details: () => [...ledgerKeys.all, 'detail'] as const,
  detail: (id: string) => [...ledgerKeys.details(), id] as const,
  byAgreement: (agreementId: string) => [...ledgerKeys.all, 'agreement', agreementId] as const,
  consumedByAgreement: (agreementId: string) => [...ledgerKeys.all, 'consumed', 'agreement', agreementId] as const,
  byEnvelope: (envelopeId: string) => [...ledgerKeys.all, 'envelope', envelopeId] as const,
  consumedByEnvelope: (envelopeId: string) => [...ledgerKeys.all, 'consumed', 'envelope', envelopeId] as const,
};

/**
 * Defter kayıtları listesi hook'u
 */
export function useLedgerEntries(filters?: LedgerFilterDto) {
  const toast = useToast();

  return useQuery({
    queryKey: ledgerKeys.list(filters),
    queryFn: () => ledgerEndpoints.getAll(filters).then((res) => res.data),
    onError: (error: any) => {
      toast.error(
        error.response?.data?.message || 'Defter kayıtları yüklenemedi'
      );
    },
  });
}

/**
 * Defter kaydı detayı hook'u
 */
export function useLedgerEntry(id: string) {
  const toast = useToast();

  return useQuery({
    queryKey: ledgerKeys.detail(id),
    queryFn: () => ledgerEndpoints.getById(id).then((res) => res.data),
    enabled: !!id,
    onError: (error: any) => {
      toast.error(
        error.response?.data?.message || 'Defter kaydı yüklenemedi'
      );
    },
  });
}

/**
 * Anlaşmaya ait defter kayıtları hook'u
 */
export function useLedgerByAgreement(agreementId: string) {
  const toast = useToast();

  return useQuery({
    queryKey: ledgerKeys.byAgreement(agreementId),
    queryFn: () => ledgerEndpoints.getByAgreement(agreementId).then((res) => res.data),
    enabled: !!agreementId,
    onError: (error: any) => {
      toast.error(
        error.response?.data?.message || 'Anlaşma defter kayıtları yüklenemedi'
      );
    },
  });
}

/**
 * Anlaşma için tüketilen tutar hook'u
 */
export function useConsumedByAgreement(agreementId: string) {
  const toast = useToast();

  return useQuery({
    queryKey: ledgerKeys.consumedByAgreement(agreementId),
    queryFn: () => ledgerEndpoints.getConsumedByAgreement(agreementId).then((res) => res.data),
    enabled: !!agreementId,
    onError: (error: any) => {
      toast.error(
        error.response?.data?.message || 'Tüketilen tutar yüklenemedi'
      );
    },
  });
}

/**
 * Bütçe zarfına ait defter kayıtları hook'u
 */
export function useLedgerByEnvelope(envelopeId: string) {
  const toast = useToast();

  return useQuery({
    queryKey: ledgerKeys.byEnvelope(envelopeId),
    queryFn: () => ledgerEndpoints.getByEnvelope(envelopeId).then((res) => res.data),
    enabled: !!envelopeId,
    onError: (error: any) => {
      toast.error(
        error.response?.data?.message || 'Bütçe zarfı defter kayıtları yüklenemedi'
      );
    },
  });
}

/**
 * Bütçe zarfı için tüketilen tutar hook'u
 */
export function useConsumedByEnvelope(envelopeId: string) {
  const toast = useToast();

  return useQuery({
    queryKey: ledgerKeys.consumedByEnvelope(envelopeId),
    queryFn: () => ledgerEndpoints.getConsumedByEnvelope(envelopeId).then((res) => res.data),
    enabled: !!envelopeId,
    onError: (error: any) => {
      toast.error(
        error.response?.data?.message || 'Tüketilen tutar yüklenemedi'
      );
    },
  });
}
