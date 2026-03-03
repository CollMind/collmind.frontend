import { describe, it, expect, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter } from 'react-router-dom';
import { Provider } from 'react-redux';
import React from 'react';
import { store } from '@/store';
import {
  useChannels,
  useCategories,
  useCpls,
  useForecastingUnits,
  useGenericUnits,
  useSkus,
  useTactics,
  useMechanics,
  useBrands,
  useRegions,
} from '@/hooks/useMasterData';
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

const mockChannel = {
  id: '1',
  code: 'CH001',
  name: 'Test Channel',
  status: 'ACTIVE',
};

const mockCategory = {
  id: '1',
  code: 'CAT001',
  name: 'Test Category',
  status: 'ACTIVE',
};

describe('useChannels', () => {
  beforeEach(() => {
    queryClient.clear();
  });

  it('should fetch channels successfully', async () => {
    server.use(
      http.get('http://localhost:3000/master-data/channels', () => {
        return HttpResponse.json([mockChannel]);
      })
    );

    const { result } = renderHook(() => useChannels(), { wrapper });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.data).toEqual([mockChannel]);
  });

  it('should fetch active channels only', async () => {
    server.use(
      http.get('http://localhost:3000/master-data/channels', ({ request }) => {
        const url = new URL(request.url);
        const activeOnly = url.searchParams.get('activeOnly');
        return HttpResponse.json([mockChannel]);
      })
    );

    const { result } = renderHook(() => useChannels(true), { wrapper });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });
  });
});

describe('useCategories', () => {
  beforeEach(() => {
    queryClient.clear();
  });

  it('should fetch categories successfully', async () => {
    server.use(
      http.get('http://localhost:3000/master-data/categories', () => {
        return HttpResponse.json([mockCategory]);
      })
    );

    const { result } = renderHook(() => useCategories(), { wrapper });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.data).toEqual([mockCategory]);
  });
});

describe('useCpls', () => {
  beforeEach(() => {
    queryClient.clear();
  });

  it('should fetch CPLs successfully', async () => {
    server.use(
      http.get('http://localhost:3000/master-data/cpls', () => {
        return HttpResponse.json([
          { id: '1', code: 'CPL001', name: 'Test CPL' },
        ]);
      })
    );

    const { result } = renderHook(() => useCpls(), { wrapper });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.data).toBeDefined();
  });

  it('should fetch CPLs with channel filter', async () => {
    server.use(
      http.get('http://localhost:3000/master-data/cpls', ({ request }) => {
        const url = new URL(request.url);
        const channelId = url.searchParams.get('channelId');
        return HttpResponse.json([
          { id: '1', code: 'CPL001', name: 'Test CPL', channelId },
        ]);
      })
    );

    const { result } = renderHook(() => useCpls(false, 'channel-1'), { wrapper });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });
  });
});

describe('useForecastingUnits', () => {
  beforeEach(() => {
    queryClient.clear();
  });

  it('should fetch forecasting units successfully', async () => {
    server.use(
      http.get('http://localhost:3000/master-data/forecasting-units', () => {
        return HttpResponse.json([
          { id: '1', code: 'FU001', name: 'Test FU' },
        ]);
      })
    );

    const { result } = renderHook(() => useForecastingUnits(), { wrapper });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.data).toBeDefined();
  });
});

describe('useGenericUnits', () => {
  beforeEach(() => {
    queryClient.clear();
  });

  it('should fetch generic units successfully', async () => {
    server.use(
      http.get('http://localhost:3000/master-data/generic-units', () => {
        return HttpResponse.json([
          { id: '1', code: 'GU001', name: 'Test GU' },
        ]);
      })
    );

    const { result } = renderHook(() => useGenericUnits(), { wrapper });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.data).toBeDefined();
  });
});

describe('useSkus', () => {
  beforeEach(() => {
    queryClient.clear();
  });

  it('should fetch SKUs successfully', async () => {
    server.use(
      http.get('http://localhost:3000/master-data/skus', () => {
        return HttpResponse.json([
          { id: '1', code: 'SKU001', name: 'Test SKU' },
        ]);
      })
    );

    const { result } = renderHook(() => useSkus(), { wrapper });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.data).toBeDefined();
  });
});

describe('useTactics', () => {
  beforeEach(() => {
    queryClient.clear();
  });

  it('should fetch tactics successfully', async () => {
    server.use(
      http.get('http://localhost:3000/master-data/tactics', () => {
        return HttpResponse.json([
          { id: '1', code: 'TAC001', name: 'Test Tactic' },
        ]);
      })
    );

    const { result } = renderHook(() => useTactics(), { wrapper });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.data).toBeDefined();
  });
});

describe('useMechanics', () => {
  beforeEach(() => {
    queryClient.clear();
  });

  it('should fetch mechanics successfully', async () => {
    server.use(
      http.get('http://localhost:3000/master-data/mechanics', () => {
        return HttpResponse.json([
          { id: '1', code: 'MEC001', name: 'Test Mechanic' },
        ]);
      })
    );

    const { result } = renderHook(() => useMechanics(), { wrapper });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.data).toBeDefined();
  });
});

describe('useBrands', () => {
  beforeEach(() => {
    queryClient.clear();
  });

  it('should fetch brands successfully', async () => {
    server.use(
      http.get('http://localhost:3000/master-data/brands', () => {
        return HttpResponse.json([
          { id: '1', code: 'BRAND001', name: 'Test Brand' },
        ]);
      })
    );

    const { result } = renderHook(() => useBrands(), { wrapper });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.data).toBeDefined();
  });
});

describe('useRegions', () => {
  beforeEach(() => {
    queryClient.clear();
  });

  it('should fetch regions successfully', async () => {
    server.use(
      http.get('http://localhost:3000/master-data/regions', () => {
        return HttpResponse.json([
          { id: '1', code: 'REG001', name: 'Test Region' },
        ]);
      })
    );

    const { result } = renderHook(() => useRegions(), { wrapper });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.data).toBeDefined();
  });
});
