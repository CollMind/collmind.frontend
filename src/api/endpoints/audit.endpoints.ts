import apiClient from '../client';

export interface AuditLog {
  id: string;
  tenantId: string;
  adminId: string;
  adminEmail: string;
  actionType: string;
  entityType: string;
  entityId?: string;
  ipAddress?: string;
  result: 'SUCCESS' | 'FAILURE';
  beforeValues?: Record<string, any>;
  afterValues?: Record<string, any>;
  justification?: string;
  isHighRisk: boolean;
  alertSent: boolean;
  createdAt: string;
}

export const auditEndpoints = {
  getAll: (limit = 100) =>
    apiClient.get<AuditLog[]>('/admin/audit-log', { params: { limit } }),

  getByAdmin: (adminId: string, limit = 100) =>
    apiClient.get<AuditLog[]>(`/admin/audit-log`, {
      params: { adminId, limit },
    }),

  getHighRisk: (limit = 50) =>
    apiClient.get<AuditLog[]>('/admin/audit-log/high-risk', {
      params: { limit },
    }),
};
