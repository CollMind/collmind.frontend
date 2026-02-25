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
    queryFn: async () => {
      try {
        const res = await ledgerEndpoints.getAll(filters);
        return res.data;
      } catch (error: any) {
        toast.error(
          error.response?.data?.message || 'Defter kayıtları yüklenemedi'
        );
        throw error;
      }
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
    queryFn: async () => {
      try {
        const res = await ledgerEndpoints.getById(id);
        return res.data;
      } catch (error: any) {
        toast.error(
          error.response?.data?.message || 'Defter kaydı yüklenemedi'
        );
        throw error;
      }
    },
    enabled: !!id,
  });
}

/**
 * Anlaşmaya ait defter kayıtları hook'u
 */
export function useLedgerByAgreement(agreementId: string) {
  const toast = useToast();

  return useQuery({
    queryKey: ledgerKeys.byAgreement(agreementId),
    queryFn: async () => {
      try {
        const res = await ledgerEndpoints.getByAgreement(agreementId);
        return res.data;
      } catch (error: any) {
        toast.error(
          error.response?.data?.message || 'Anlaşma defter kayıtları yüklenemedi'
        );
        throw error;
      }
    },
    enabled: !!agreementId,
  });
}

/**
 * Anlaşma için tüketilen tutar hook'u
 */
export function useConsumedByAgreement(agreementId: string) {
  const toast = useToast();

  return useQuery({
    queryKey: ledgerKeys.consumedByAgreement(agreementId),
    queryFn: async () => {
      try {
        const res = await ledgerEndpoints.getConsumedByAgreement(agreementId);
        return res.data;
      } catch (error: any) {
        toast.error(
          error.response?.data?.message || 'Tüketilen tutar yüklenemedi'
        );
        throw error;
      }
    },
    enabled: !!agreementId,
  });
}

/**
 * Bütçe zarfına ait defter kayıtları hook'u
 */
export function useLedgerByEnvelope(envelopeId: string) {
  const toast = useToast();

  return useQuery({
    queryKey: ledgerKeys.byEnvelope(envelopeId),
    queryFn: async () => {
      try {
        const res = await ledgerEndpoints.getByEnvelope(envelopeId);
        return res.data;
      } catch (error: any) {
        toast.error(
          error.response?.data?.message || 'Bütçe zarfı defter kayıtları yüklenemedi'
        );
        throw error;
      }
    },
    enabled: !!envelopeId,
  });
}

/**
 * Bütçe zarfı için tüketilen tutar hook'u
 */
export function useConsumedByEnvelope(envelopeId: string) {
  const toast = useToast();

  return useQuery({
    queryKey: ledgerKeys.consumedByEnvelope(envelopeId),
    queryFn: async () => {
      try {
        const res = await ledgerEndpoints.getConsumedByEnvelope(envelopeId);
        return res.data;
      } catch (error: any) {
        toast.error(
          error.response?.data?.message || 'Tüketilen tutar yüklenemedi'
        );
        throw error;
      }
    },
    enabled: !!envelopeId,
  });
}
