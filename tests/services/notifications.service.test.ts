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

const mockNotification = {
  id: '1',
  type: 'AGREEMENT_APPROVED',
  title: 'Anlaşma Onaylandı',
  message: 'Test anlaşması onaylandı',
  read: false,
  createdAt: new Date().toISOString(),
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

    expect(result.current.data).toEqual([mockNotification]);
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
          { ...mockNotification, read: false },
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
      http.patch('http://localhost:3000/notifications/:id/read', ({ params }) => {
        return HttpResponse.json({
          ...mockNotification,
          id: params.id as string,
          read: true,
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
      http.patch('http://localhost:3000/notifications/:id/read', () => {
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
