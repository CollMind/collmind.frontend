import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { customerEndpoints } from '@/api/endpoints/customers.endpoints';
import {
  CreateCustomerDto,
  UpdateCustomerDto,
  CustomerFilterDto,
  ImportResult,
  CustomerStats,
} from '@/types/customer.types';
import { useToast } from '@/hooks/useToast';

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
          const dataObj = data as any;
          if (Array.isArray(dataObj.data)) {
            return dataObj.data;
          }
          if (Array.isArray(dataObj.customers)) {
            return dataObj.customers;
          }
          if (Array.isArray(dataObj.items)) {
            return dataObj.items;
          }
          if (Array.isArray(dataObj.results)) {
            return dataObj.results;
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

export function useSearchCustomers(query: string) {
  return useQuery({
    queryKey: customerKeys.search(query),
    queryFn: () => customerEndpoints.search(query).then((res) => res.data),
    enabled: query.length > 0,
  });
}

export function useCustomerStats(id: string) {
  return useQuery({
    queryKey: [...customerKeys.detail(id), 'stats'],
    queryFn: () => customerEndpoints.getStats(id).then((res) => res.data),
    enabled: !!id,
  });
}

export function useCustomerImport() {
  const queryClient = useQueryClient();
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [showResults, setShowResults] = useState(false);
  const toast = useToast();

  const mutation = useMutation({
    mutationFn: (file: File) =>
      customerEndpoints.import(file).then((res) => res.data as ImportResult),
    onSuccess: (data: ImportResult) => {
      // Invalidate customer list to refresh after import
      queryClient.invalidateQueries({ queryKey: customerKeys.lists() });

      setImportResult(data);
      setShowResults(true);

      const { total, created, skipped, errors } = data;

      if (created === total) {
        toast.success(`Tüm ${total} müşteri başarıyla içe aktarıldı.`);
      } else if (created > 0) {
        toast.warning(
          `${created} müşteri içe aktarıldı, ${skipped} müşteri atlandı. Detaylar için sonuçları kontrol edin.`
        );
      } else {
        toast.error(
          'Hiçbir müşteri içe aktarılamadı. Lütfen sonuçları kontrol edin.'
        );
      }

      // Log errors for debugging
      if (errors.length > 0) {
        console.error('Import hataları:', errors);
      }
    },
    onError: (error: any) => {
      const errorMessage =
        error.response?.data?.message ||
        error.message ||
        'Dosya yüklenirken bir hata oluştu';
      toast.error(errorMessage);
    },
  });

  return {
    ...mutation,
    importResult,
    showResults,
    setShowResults,
  };
}
