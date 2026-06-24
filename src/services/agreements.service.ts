import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { agreementEndpoints } from '@/api/endpoints/agreements.endpoints';
import {
  Agreement,
  CreateAgreementDto,
  UpdateAgreementDto,
  AgreementFilterDto,
  ApproveAgreementDto,
  RejectAgreementDto,
  CancelAgreementDto,
  AgreementStatus,
} from '@/types/agreement.types';
import { useToast } from '@/hooks/useToast';
import { useMe } from './users.service';
import { UserRole } from '@/types/user.types';

export const agreementKeys = {
  all: ['agreements'] as const,
  lists: () => [...agreementKeys.all, 'list'] as const,
  list: (filters?: AgreementFilterDto) =>
    [...agreementKeys.lists(), filters] as const,
  details: () => [...agreementKeys.all, 'detail'] as const,
  detail: (id: string) => [...agreementKeys.details(), id] as const,
};

/**
 * Anlaşma listesini getiren hook
 */
export function useAgreements(filters?: AgreementFilterDto) {
  return useQuery({
    queryKey: agreementKeys.list(filters),
    queryFn: () => agreementEndpoints.getAll(filters).then((res) => res.data),
  });
}

/**
 * Belirli bir anlaşmayı getiren hook
 */
export function useAgreement(id: string) {
  return useQuery({
    queryKey: agreementKeys.detail(id),
    queryFn: () => agreementEndpoints.getById(id).then((res) => res.data),
    enabled: !!id,
  });
}

/**
 * Yeni anlaşma oluşturma hook'u
 */
export function useCreateAgreement() {
  const queryClient = useQueryClient();
  const toast = useToast();

  return useMutation({
    mutationFn: (data: CreateAgreementDto) =>
      agreementEndpoints.create(data).then((res) => res.data),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: agreementKeys.lists() });
      toast.success('Anlaşma başarıyla oluşturuldu');
      return data;
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Anlaşma oluşturulamadı');
    },
  });
}

/**
 * Anlaşma güncelleme hook'u (Sadece DRAFT)
 */
export function useUpdateAgreement() {
  const queryClient = useQueryClient();
  const toast = useToast();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateAgreementDto }) =>
      agreementEndpoints.update(id, data).then((res) => res.data),
    onSuccess: (data) => {
      queryClient.invalidateQueries({
        queryKey: agreementKeys.detail(data.id),
      });
      queryClient.invalidateQueries({ queryKey: agreementKeys.lists() });
      toast.success('Anlaşma başarıyla güncellendi');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Anlaşma güncellenemedi');
    },
  });
}

/**
 * Anlaşma silme hook'u (Sadece DRAFT)
 */
export function useDeleteAgreement() {
  const queryClient = useQueryClient();
  const toast = useToast();

  return useMutation({
    mutationFn: (id: string) => agreementEndpoints.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: agreementKeys.lists() });
      toast.success('Anlaşma başarıyla silindi');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Anlaşma silinemedi');
    },
  });
}

/**
 * Anlaşmayı onay için gönderme hook'u (DRAFT → PENDING)
 */
export function useSubmitAgreement() {
  const queryClient = useQueryClient();
  const toast = useToast();

  return useMutation({
    mutationFn: (id: string) =>
      agreementEndpoints.submit(id).then((res) => res.data),
    onSuccess: (data) => {
      queryClient.invalidateQueries({
        queryKey: agreementKeys.detail(data.id),
      });
      queryClient.invalidateQueries({ queryKey: agreementKeys.lists() });
      toast.success('Anlaşma onay için gönderildi');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Anlaşma gönderilemedi');
    },
  });
}

/**
 * Anlaşmayı onaylama hook'u (PENDING → APPROVED)
 */
export function useApproveAgreement() {
  const queryClient = useQueryClient();
  const toast = useToast();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data?: ApproveAgreementDto }) =>
      agreementEndpoints.approve(id, data).then((res) => res.data),
    onSuccess: (data) => {
      queryClient.invalidateQueries({
        queryKey: agreementKeys.detail(data.id),
      });
      queryClient.invalidateQueries({ queryKey: agreementKeys.lists() });
      queryClient.invalidateQueries({ queryKey: ['budget'] }); // Bütçe rezervasyonu yapıldı
      toast.success('Anlaşma başarıyla onaylandı');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Anlaşma onaylanamadı');
    },
  });
}

/**
 * Anlaşmayı reddetme hook'u (PENDING → REJECTED)
 */
export function useRejectAgreement() {
  const queryClient = useQueryClient();
  const toast = useToast();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: RejectAgreementDto }) =>
      agreementEndpoints.reject(id, data).then((res) => res.data),
    onSuccess: (data) => {
      queryClient.invalidateQueries({
        queryKey: agreementKeys.detail(data.id),
      });
      queryClient.invalidateQueries({ queryKey: agreementKeys.lists() });
      toast.success('Anlaşma reddedildi');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Anlaşma reddedilemedi');
    },
  });
}

/**
 * Anlaşmayı iptal etme hook'u (APPROVED/ACTIVE → CANCELLED)
 */
export function useCancelAgreement() {
  const queryClient = useQueryClient();
  const toast = useToast();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: CancelAgreementDto }) =>
      agreementEndpoints.cancel(id, data).then((res) => res.data),
    onSuccess: (data) => {
      queryClient.invalidateQueries({
        queryKey: agreementKeys.detail(data.id),
      });
      queryClient.invalidateQueries({ queryKey: agreementKeys.lists() });
      queryClient.invalidateQueries({ queryKey: ['budget'] }); // Bütçe serbest bırakıldı
      toast.success('Anlaşma iptal edildi');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Anlaşma iptal edilemedi');
    },
  });
}

/**
 * Anlaşma için yetki kontrolü hook'u
 */
export function useAgreementPermissions(agreement: Agreement | undefined) {
  const { data: user } = useMe();

  if (!agreement || !user) {
    return {
      canEdit: false,
      canSubmit: false,
      canApprove: false,
      canReject: false,
      canCancel: false,
      canDelete: false,
    };
  }

  const userRole = user.role as UserRole;

  // READONLY users have no write permissions
  if (userRole === UserRole.READONLY) {
    return {
      canEdit: false,
      canSubmit: false,
      canApprove: false,
      canReject: false,
      canCancel: false,
      canDelete: false,
    };
  }
  const isOwner = agreement.tenantId === user.tenantId; // Basit kontrol, gerçekte createdBy kontrol edilmeli

  const canEdit =
    agreement.status === AgreementStatus.DRAFT &&
    (userRole === 'ADMIN' || userRole === 'PLANNER');

  const canSubmit =
    agreement.status === AgreementStatus.DRAFT &&
    (userRole === 'ADMIN' || userRole === 'PLANNER');

  const canApprove =
    agreement.status === AgreementStatus.PENDING &&
    (userRole === UserRole.ADMIN ||
      userRole === UserRole.MANAGER ||
      userRole === UserRole.FINANCE);

  const canReject =
    agreement.status === AgreementStatus.PENDING &&
    (userRole === UserRole.ADMIN ||
      userRole === UserRole.MANAGER ||
      userRole === UserRole.FINANCE);

  const canCancel =
    (agreement.status === AgreementStatus.APPROVED ||
      agreement.status === AgreementStatus.ACTIVE) &&
    (userRole === 'ADMIN' || userRole === 'PLANNER');

  const canDelete =
    agreement.status === AgreementStatus.DRAFT &&
    (userRole === 'ADMIN' || userRole === 'PLANNER');

  return {
    canEdit,
    canSubmit,
    canApprove,
    canReject,
    canCancel,
    canDelete,
  };
}
