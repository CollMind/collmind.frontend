import { describe, it, expect, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter } from 'react-router-dom';
import { Provider } from 'react-redux';
import React from 'react';
import { store } from '@/store';
import {
  useTenants,
  useTenant,
  useCreateTenant,
  useUpdateTenant,
  useDeleteTenant,
  useActivateTenant,
  useSuspendTenant,
  useTenantStats,
} from '@/services/tenants.service';
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

const mockTenant = {
  id: '1',
  code: 'TENANT001',
  name: 'Test Tenant',
  status: 'ACTIVE',
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

describe('useTenants', () => {
  beforeEach(() => {
    queryClient.clear();
  });

  it('should fetch tenants successfully', async () => {
    server.use(
      http.get('http://localhost:3000/tenants', () => {
        return HttpResponse.json([mockTenant]);
      })
    );

    const { result } = renderHook(() => useTenants(), { wrapper });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(Array.isArray(result.current.data)).toBe(true);
  });
});

describe('useTenant', () => {
  beforeEach(() => {
    queryClient.clear();
  });

  it('should fetch tenant by id', async () => {
    server.use(
      http.get('http://localhost:3000/tenants/:id', ({ params }) => {
        return HttpResponse.json({
          ...mockTenant,
          id: params.id as string,
        });
      })
    );

    const { result } = renderHook(() => useTenant('1'), { wrapper });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.data?.id).toBe('1');
  });

  it('should not fetch when id is empty', () => {
    const { result } = renderHook(() => useTenant(''), { wrapper });

    expect(result.current.isFetching).toBe(false);
  });
});

describe('useCreateTenant', () => {
  beforeEach(() => {
    queryClient.clear();
  });

  it('should create tenant successfully', async () => {
    server.use(
      http.post('http://localhost:3000/tenants', async ({ request }) => {
        const body = await request.json() as any;
        return HttpResponse.json(
          {
            ...mockTenant,
            ...body,
          },
          { status: 201 }
        );
      })
    );

    const { result } = renderHook(() => useCreateTenant(), { wrapper });

    await result.current.mutateAsync({
      code: 'TENANT001',
      name: 'New Tenant',
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });
  });
});

describe('useUpdateTenant', () => {
  beforeEach(() => {
    queryClient.clear();
  });

  it('should update tenant successfully', async () => {
    server.use(
      http.patch('http://localhost:3000/tenants/:id', async ({ params, request }) => {
        const body = await request.json() as any;
        return HttpResponse.json({
          ...mockTenant,
          id: params.id as string,
          ...body,
        });
      })
    );

    const { result } = renderHook(() => useUpdateTenant(), { wrapper });

    await result.current.mutateAsync({
      id: '1',
      data: { name: 'Updated Tenant' },
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });
  });
});

describe('useDeleteTenant', () => {
  beforeEach(() => {
    queryClient.clear();
  });

  it('should delete tenant successfully', async () => {
    server.use(
      http.delete('http://localhost:3000/tenants/:id', () => {
        return new HttpResponse(null, { status: 204 });
      })
    );

    const { result } = renderHook(() => useDeleteTenant(), { wrapper });

    await result.current.mutateAsync('1');

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });
  });
});

describe('useActivateTenant', () => {
  beforeEach(() => {
    queryClient.clear();
  });

  it('should activate tenant successfully', async () => {
    server.use(
      http.post('http://localhost:3000/tenants/:id/activate', ({ params }) => {
        return HttpResponse.json({
          ...mockTenant,
          id: params.id as string,
          status: 'ACTIVE',
        });
      })
    );

    const { result } = renderHook(() => useActivateTenant(), { wrapper });

    await result.current.mutateAsync('1');

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });
  });
});

describe('useSuspendTenant', () => {
  beforeEach(() => {
    queryClient.clear();
  });

  it('should suspend tenant successfully', async () => {
    server.use(
      http.post('http://localhost:3000/tenants/:id/suspend', ({ params }) => {
        return HttpResponse.json({
          ...mockTenant,
          id: params.id as string,
          status: 'SUSPENDED',
        });
      })
    );

    const { result } = renderHook(() => useSuspendTenant(), { wrapper });

    await result.current.mutateAsync('1');

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });
  });
});

describe('useTenantStats', () => {
  beforeEach(() => {
    queryClient.clear();
  });

  it('should fetch tenant stats successfully', async () => {
    server.use(
      http.get('http://localhost:3000/tenants/:id/stats', () => {
        return HttpResponse.json({
          totalUsers: 10,
          totalCustomers: 50,
          totalAgreements: 20,
          totalPlans: 15,
        });
      })
    );

    const { result } = renderHook(() => useTenantStats('1'), { wrapper });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.data).toBeDefined();
  });

  it('should not fetch when id is empty', () => {
    const { result } = renderHook(() => useTenantStats(''), { wrapper });

    expect(result.current.isFetching).toBe(false);
  });
});
