import apiClient from '../client';
import {
  Customer,
  CreateCustomerDto,
  UpdateCustomerDto,
  CustomerFilterDto,
  ImportResult,
  CustomerStats,
} from '@/types/customer.types';

export const customerEndpoints = {
  getAll: (filters?: CustomerFilterDto) =>
    apiClient.get<Customer[]>('/customers', { params: filters }),

  getById: (id: string) => apiClient.get<Customer>(`/customers/${id}`),

  getByCode: (code: string) =>
    apiClient.get<Customer>(`/customers/code/${code}`),

  search: (query: string) =>
    apiClient.get<Customer[]>('/customers/search', { params: { q: query } }),

  getByChannel: (channel: string) =>
    apiClient.get<Customer[]>(`/customers/channel/${channel}`),

  getByCity: (city: string) =>
    apiClient.get<Customer[]>(`/customers/city/${city}`),

  getVip: () => apiClient.get<Customer[]>('/customers/vip'),

  create: (data: CreateCustomerDto) =>
    apiClient.post<Customer>('/customers', data),

  createBulk: (customers: CreateCustomerDto[]) =>
    apiClient.post<Customer[]>('/customers/bulk', { customers }),

  update: (id: string, data: UpdateCustomerDto) =>
    apiClient.patch<Customer>(`/customers/${id}`, data),

  delete: (id: string) => apiClient.delete(`/customers/${id}`),

  activate: (id: string) =>
    apiClient.post<Customer>(`/customers/${id}/activate`),

  deactivate: (id: string) =>
    apiClient.post<Customer>(`/customers/${id}/deactivate`),

  getStats: (id: string) => apiClient.get<CustomerStats>(`/customers/${id}/stats`),

  import: (file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    return apiClient.post<ImportResult>('/customers/import', formData);
  },
};

