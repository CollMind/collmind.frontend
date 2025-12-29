import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { customerEndpoints } from '@/api/endpoints/customers.endpoints';
import {
  CreateCustomerDto,
  UpdateCustomerDto,
  CustomerFilterDto,
} from '@/types/customer.types';

export const customerKeys = {
  all: ['customers'] as const,
  lists: () => [...customerKeys.all, 'list'] as const,
  list: (filters?: CustomerFilterDto) =>
    [...customerKeys.lists(), filters] as const,
  details: () => [...customerKeys.all, 'detail'] as const,
  detail: (id: string) => [...customerKeys.details(), id] as const,
  search: (query: string) => [...customerKeys.all, 'search', query] as const,
  byChannel: (channel: string) =>
    [...customerKeys.all, 'channel', channel] as const,
  byCity: (city: string) => [...customerKeys.all, 'city', city] as const,
  vip: () => [...customerKeys.all, 'vip'] as const,
};

export function useCustomers(filters?: CustomerFilterDto) {
  return useQuery({
    queryKey: customerKeys.list(filters),
    queryFn: async () => {
      try {
        const response = await customerEndpoints.getAll(filters);
        
        // Handle different response formats
        let data = response.data;
        
        // If data is already an array, return it
        if (Array.isArray(data)) {
          return data;
        }
        
        // If data is an object, check for common array properties
        if (data && typeof data === 'object') {
          if (Array.isArray(data.data)) {
            return data.data;
          }
          if (Array.isArray(data.customers)) {
            return data.customers;
          }
          if (Array.isArray(data.items)) {
            return data.items;
          }
          if (Array.isArray(data.results)) {
            return data.results;
          }
        }
        
        return [];
      } catch (error) {
        console.error('Error fetching customers:', error);
        throw error;
      }
    },
  });
}

export function useCustomer(id: string) {
  return useQuery({
    queryKey: customerKeys.detail(id),
    queryFn: () => customerEndpoints.getById(id).then((res) => res.data),
    enabled: !!id,
  });
}

export function useCreateCustomer() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateCustomerDto) =>
      customerEndpoints.create(data).then((res) => res.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: customerKeys.lists() });
    },
  });
}

export function useUpdateCustomer() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateCustomerDto }) =>
      customerEndpoints.update(id, data).then((res) => res.data),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: customerKeys.detail(data.id) });
      queryClient.invalidateQueries({ queryKey: customerKeys.lists() });
    },
  });
}

export function useDeleteCustomer() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => customerEndpoints.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: customerKeys.lists() });
    },
  });
}

export function useActivateCustomer() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) =>
      customerEndpoints.activate(id).then((res) => res.data),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: customerKeys.detail(data.id) });
      queryClient.invalidateQueries({ queryKey: customerKeys.lists() });
    },
  });
}

export function useDeactivateCustomer() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) =>
      customerEndpoints.deactivate(id).then((res) => res.data),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: customerKeys.detail(data.id) });
      queryClient.invalidateQueries({ queryKey: customerKeys.lists() });
    },
  });
}

