import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { notificationEndpoints } from '@/api/endpoints/notifications.endpoints';
import { Notification } from '@/types/notification.types';

export const notificationKeys = {
  all: ['notifications'] as const,
  lists: (limit?: number) => [...notificationKeys.all, 'list', limit] as const,
  unread: () => [...notificationKeys.all, 'unread'] as const,
};

export const useNotifications = (limit = 30) => {
  return useQuery({
    queryKey: notificationKeys.lists(limit),
    queryFn: () => notificationEndpoints.getAll(limit).then((res) => res.data),
  });
};

export const useUnreadNotifications = () => {
  return useQuery({
    queryKey: notificationKeys.unread(),
    queryFn: () => notificationEndpoints.getUnread().then((res) => res.data),
    refetchInterval: 30000, // Poll every 30 seconds
  });
};

export const useMarkNotificationAsRead = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) =>
      notificationEndpoints.markAsRead(id).then((res) => res.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: notificationKeys.all });
    },
  });
};
