import apiClient from '../client';
import {
  LedgerEntry,
  LedgerFilterDto,
  ConsumedAmountResponse,
} from '@/types/ledger.types';

export const ledgerEndpoints = {
  // Defter kayıtları listesi
  getAll: (filters?: LedgerFilterDto) =>
    apiClient.get<LedgerEntry[]>('/ledger', { params: filters }),

  // Defter kaydı detayı
  getById: (id: string) => apiClient.get<LedgerEntry>(`/ledger/${id}`),

  // Anlaşmaya ait defter kayıtları
  getByAgreement: (agreementId: string) =>
    apiClient.get<LedgerEntry[]>(`/ledger/agreement/${agreementId}`),

  // Anlaşma için tüketilen tutar
  getConsumedByAgreement: (agreementId: string) =>
    apiClient.get<ConsumedAmountResponse>(
      `/ledger/agreement/${agreementId}/consumed`
    ),

  // Bütçe zarfına ait defter kayıtları
  getByEnvelope: (envelopeId: string) =>
    apiClient.get<LedgerEntry[]>(`/ledger/envelope/${envelopeId}`),

  // Bütçe zarfı için tüketilen tutar
  getConsumedByEnvelope: (envelopeId: string) =>
    apiClient.get<ConsumedAmountResponse>(
      `/ledger/envelope/${envelopeId}/consumed`
    ),
};
