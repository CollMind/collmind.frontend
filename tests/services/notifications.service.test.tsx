import { describe, it, expect, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter } from 'react-router-dom';
import { Provider } from 'react-redux';
import React from 'react';
import { store } from '@/store';
import {
  useNotifications,
  useUnreadNotifications,
  useMarkNotificationAsRead,
} from '@/services/notifications.service';
import { http, HttpResponse } from 'msw';
import { server } from '../setup';
import {
  Notification,
  NotificationType,
  NotificationChannel,
  NotificationPriority,
  NotificationStatus,
} from '@/types/notification.types';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: false },
    mutations: { retry: false },
  },
});

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <Provider store={store}>
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>{children}</BrowserRouter>
    </QueryClientProvider>
  </Provider>
);

// T-117: eskiden anotasyonsuz object literal — `title`/`message`/`read` üretim
// tipinde yok (gerçek alanlar `subject`/`body`/`readAt`).
const mockNotification: Notification = {
  id: '1',
  tenantId: 'tenant-1',
  type: NotificationType.APPROVAL_GRANTED,
  recipientId: 'user-1',
  recipientEmail: 'user@example.com',
  channel: NotificationChannel.IN_APP,
  priority: NotificationPriority.MEDIUM,
  status: NotificationStatus.SENT,
  subject: 'Anlaşma Onaylandı',
  body: 'Test anlaşması onaylandı',
  readAt: undefined,
  createdAt: new Date(),
  updatedAt: new Date(),
};

describe('useNotifications', () => {
  beforeEach(() => {
    queryClient.clear();
  });

  it('should fetch notifications successfully', async () => {
    server.use(
      http.get('http://localhost:3000/notifications', ({ request }) => {
        const url = new URL(request.url);
        const limit = url.searchParams.get('limit');
        return HttpResponse.json([mockNotification]);
      })
    );

    const { result } = renderHook(() => useNotifications(), { wrapper });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    // `Notification.createdAt`/`updatedAt` are typed `Date`, but the wire
    // format is JSON — msw serializes them to ISO strings same as the real
    // backend, and this service never parses them back (notifications.service.ts
    // returns `res.data` unmodified). Round-trip the fixture the same way so
    // the assertion reflects what the hook actually receives, not the
    // fixture's compile-time shape.
    expect(result.current.data).toEqual(
      JSON.parse(JSON.stringify([mockNotification]))
    );
  });

  it('should fetch notifications with limit', async () => {
    server.use(
      http.get('http://localhost:3000/notifications', ({ request }) => {
        const url = new URL(request.url);
        const limit = url.searchParams.get('limit');
        return HttpResponse.json([mockNotification]);
      })
    );

    const { result } = renderHook(() => useNotifications(10), { wrapper });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.data).toBeDefined();
  });
});

describe('useUnreadNotifications', () => {
  beforeEach(() => {
    queryClient.clear();
  });

  it('should fetch unread notifications', async () => {
    server.use(
      http.get('http://localhost:3000/notifications/unread', () => {
        return HttpResponse.json([
          { ...mockNotification, readAt: undefined },
        ]);
      })
    );

    const { result } = renderHook(() => useUnreadNotifications(), { wrapper });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.data).toBeDefined();
  });
});

describe('useMarkNotificationAsRead', () => {
  beforeEach(() => {
    queryClient.clear();
  });

  it('should mark notification as read successfully', async () => {
    server.use(
      // Endpoint sends POST (@Post(':id/read') in notification.controller.ts),
      // not PATCH. A mismatched mock method means MSW never matches the
      // real request, throws "no matching handler" asynchronously, and the
      // resulting axios error escapes as an unhandled rejection the worker
      // can't serialize back to the reporter (see T-040).
      http.post('http://localhost:3000/notifications/:id/read', ({ params }) => {
        return HttpResponse.json({
          ...mockNotification,
          id: params.id as string,
          readAt: new Date(),
        });
      })
    );

    const { result } = renderHook(() => useMarkNotificationAsRead(), { wrapper });

    await result.current.mutateAsync('1');

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });
  });

  it('should handle mark as read error', async () => {
    server.use(
      // Same method fix as above — see comment on the previous handler.
      http.post('http://localhost:3000/notifications/:id/read', () => {
        return HttpResponse.json(
          { message: 'Notification not found' },
          { status: 404 }
        );
      })
    );

    const { result } = renderHook(() => useMarkNotificationAsRead(), { wrapper });

    await expect(result.current.mutateAsync('999')).rejects.toThrow();

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });
  });
});
