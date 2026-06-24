import apiClient from '../client';
import {
  Agreement,
  CreateAgreementDto,
  UpdateAgreementDto,
  AgreementFilterDto,
  ApproveAgreementDto,
  RejectAgreementDto,
  CancelAgreementDto,
} from '@/types/agreement.types';

export const agreementEndpoints = {
  // Anlaşma Listesi
  getAll: (filters?: AgreementFilterDto) =>
    apiClient.get<Agreement[]>('/agreements', { params: filters }),

  // Anlaşma Detayı
  getById: (id: string) => apiClient.get<Agreement>(`/agreements/${id}`),

  // Anlaşma Oluşturma
  create: (data: CreateAgreementDto) =>
    apiClient.post<Agreement>('/agreements', data),

  // Anlaşma Güncelleme (Sadece DRAFT)
  update: (id: string, data: UpdateAgreementDto) =>
    apiClient.patch<Agreement>(`/agreements/${id}`, data),

  // Anlaşma Silme (Sadece DRAFT)
  delete: (id: string) => apiClient.delete(`/agreements/${id}`),

  // Durum Geçişleri
  submit: (id: string) => apiClient.post<Agreement>(`/agreements/${id}/submit`),

  approve: (id: string, data?: ApproveAgreementDto) =>
    apiClient.post<Agreement>(`/agreements/${id}/approve`, data),

  reject: (id: string, data: RejectAgreementDto) =>
    apiClient.post<Agreement>(`/agreements/${id}/reject`, data),

  cancel: (id: string, data: CancelAgreementDto) =>
    apiClient.post<Agreement>(`/agreements/${id}/cancel`, data),

  getAvailableTactics: (channelId: string, categoryId?: string) =>
    apiClient.get<
      Array<{
        id: string;
        name: string;
        code: string;
        spendType: 'ON_INVOICE' | 'OFF_INVOICE' | 'BOTH';
        mechanics: Array<{
          id: string;
          name: string;
          code: string;
          mechanicType: 'PERCENT' | 'AMOUNT' | 'AMOUNT_PER_UNIT';
          minValue?: number;
          maxValue?: number;
        }>;
      }>
    >('/agreements/tactics/available', {
      params: { channelId, categoryId },
    }),

  // Pending Approval Agreements
  getPendingApprovals: () =>
    apiClient.get<Agreement[]>('/agreements/pending-approvals'),
};
