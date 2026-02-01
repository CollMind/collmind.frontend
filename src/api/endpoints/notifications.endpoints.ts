import apiClient from '../client';
import { Notification } from '@/types/notification.types';

export const notificationEndpoints = {
  getAll: (limit?: number) => {
    const params = limit ? { limit } : {};
    return apiClient.get<Notification[]>('/notifications', { params });
  },

  getUnread: () =>
    apiClient.get<Notification[]>('/notifications/unread'),

  markAsRead: (id: string) =>
    apiClient.post<Notification>(`/notifications/${id}/read`),
};


