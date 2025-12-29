import apiClient from '../client';
import { Tenant, CreateTenantDto, UpdateTenantDto } from '@/types/tenant.types';

export const tenantEndpoints = {
  getAll: () => apiClient.get<Tenant[]>('/tenants'),

  getById: (id: string) => apiClient.get<Tenant>(`/tenants/${id}`),

  create: (data: CreateTenantDto) => apiClient.post<Tenant>('/tenants', data),

  update: (id: string, data: UpdateTenantDto) =>
    apiClient.patch<Tenant>(`/tenants/${id}`, data),

  delete: (id: string) => apiClient.delete(`/tenants/${id}`),

  activate: (id: string) =>
    apiClient.post<Tenant>(`/tenants/${id}/activate`),

  suspend: (id: string) =>
    apiClient.post<Tenant>(`/tenants/${id}/suspend`),

  getStats: (id: string) => apiClient.get(`/tenants/${id}/stats`),
};

