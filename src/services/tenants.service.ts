import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { tenantEndpoints } from '@/api/endpoints/tenants.endpoints';
import { CreateTenantDto, UpdateTenantDto } from '@/types/tenant.types';

export const tenantKeys = {
  all: ['tenants'] as const,
  lists: () => [...tenantKeys.all, 'list'] as const,
  list: (filters?: any) => [...tenantKeys.lists(), filters] as const,
  details: () => [...tenantKeys.all, 'detail'] as const,
  detail: (id: string) => [...tenantKeys.details(), id] as const,
};

export function useTenants() {
  return useQuery({
    queryKey: tenantKeys.lists(),
    queryFn: async () => {
      try {
        const response = await tenantEndpoints.getAll();
        console.log('Tenants API Response:', response);
        const data = response.data;
        console.log('Tenants Data:', data, 'Is Array:', Array.isArray(data));
        return Array.isArray(data) ? data : [];
      } catch (error) {
        console.error('Error fetching tenants:', error);
        throw error;
      }
    },
  });
}

export function useTenant(id: string) {
  return useQuery({
    queryKey: tenantKeys.detail(id),
    queryFn: () => tenantEndpoints.getById(id).then((res) => res.data),
    enabled: !!id,
  });
}

export function useCreateTenant() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateTenantDto) =>
      tenantEndpoints.create(data).then((res) => res.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: tenantKeys.lists() });
    },
  });
}

export function useUpdateTenant() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateTenantDto }) =>
      tenantEndpoints.update(id, data).then((res) => res.data),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: tenantKeys.detail(data.id) });
      queryClient.invalidateQueries({ queryKey: tenantKeys.lists() });
    },
  });
}

export function useDeleteTenant() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => tenantEndpoints.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: tenantKeys.lists() });
    },
  });
}

export function useActivateTenant() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) =>
      tenantEndpoints.activate(id).then((res) => res.data),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: tenantKeys.detail(data.id) });
      queryClient.invalidateQueries({ queryKey: tenantKeys.lists() });
    },
  });
}

export function useSuspendTenant() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) =>
      tenantEndpoints.suspend(id).then((res) => res.data),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: tenantKeys.detail(data.id) });
      queryClient.invalidateQueries({ queryKey: tenantKeys.lists() });
    },
  });
}
