import { describe, it, expect, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter } from 'react-router-dom';
import { Provider } from 'react-redux';
import React from 'react';
import { store } from '@/store';
import {
  useAgreements,
  useAgreement,
  useCreateAgreement,
  useUpdateAgreement,
  useDeleteAgreement,
  useSubmitAgreement,
  useApproveAgreement,
  useRejectAgreement,
  useCancelAgreement,
  useAgreementPermissions,
} from '@/services/agreements.service';
import { http, HttpResponse } from 'msw';
import { server } from '../setup';
import { Agreement, AgreementStatus, AgreementType } from '@/types/agreement.types';

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

// T-116: `code`/`name` were not `Agreement` fields (`agreementCode`/
// `agreementName` are) and the object was missing every other required
// field — invisible while `tests/` sat outside tsconfig's `include`.
// `useAgreementPermissions` (below) takes a full `Agreement`, so this fixture
// must be one, not a partial shape MSW happens to echo back unchecked.
const mockAgreement: Agreement = {
  id: '1',
  version: 1,
  agreementNumber: 'AGR001',
  agreementCode: 'AGR001',
  agreementName: 'Test Agreement',
  agreementType: AgreementType.STA,
  status: AgreementStatus.DRAFT,
  cplId: 'cpl-1',
  channelId: 'channel-1',
  fuId: 'fu-1',
  tacticId: 'tactic-1',
  mechanicId: 'mechanic-1',
  capTotalAmount: 1000,
  startDate: '2026-01-01',
  endDate: '2026-01-31',
  justification: 'Test justification',
  tenantId: 'tenant-1',
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

describe('useAgreements', () => {
  beforeEach(() => {
    queryClient.clear();
  });

  it('should fetch agreements successfully', async () => {
    server.use(
      http.get('http://localhost:3000/agreements', () => {
        return HttpResponse.json([mockAgreement]);
      })
    );

    const { result } = renderHook(() => useAgreements(), { wrapper });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.data).toEqual([mockAgreement]);
  });

  it('should fetch agreements with filters', async () => {
    server.use(
      http.get('http://localhost:3000/agreements', ({ request }) => {
        const url = new URL(request.url);
        const status = url.searchParams.get('status');
        return HttpResponse.json([
          { ...mockAgreement, status: status as AgreementStatus },
        ]);
      })
    );

    const { result } = renderHook(
      () => useAgreements({ status: AgreementStatus.DRAFT }),
      { wrapper }
    );

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.data).toBeDefined();
  });
});

describe('useAgreement', () => {
  beforeEach(() => {
    queryClient.clear();
  });

  it('should fetch agreement by id', async () => {
    server.use(
      http.get('http://localhost:3000/agreements/:id', ({ params }) => {
        return HttpResponse.json({
          ...mockAgreement,
          id: params.id as string,
        });
      })
    );

    const { result } = renderHook(() => useAgreement('1'), { wrapper });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.data?.id).toBe('1');
  });

  it('should not fetch when id is empty', () => {
    const { result } = renderHook(() => useAgreement(''), { wrapper });

    expect(result.current.isFetching).toBe(false);
  });
});

describe('useCreateAgreement', () => {
  beforeEach(() => {
    queryClient.clear();
  });

  it('should create agreement successfully', async () => {
    server.use(
      http.post('http://localhost:3000/agreements', async ({ request }) => {
        const body = await request.json() as any;
        return HttpResponse.json(
          {
            ...mockAgreement,
            ...body,
          },
          { status: 201 }
        );
      })
    );

    const { result } = renderHook(() => useCreateAgreement(), { wrapper });

    await result.current.mutateAsync({
      agreementName: 'New Agreement',
      agreementType: AgreementType.STA,
      cplId: 'cpl-1',
      channelId: 'channel-1',
      fuId: 'fu-1',
      tacticId: 'tactic-1',
      mechanicId: 'mechanic-1',
      capTotalAmount: 1000,
      startDate: '2026-01-01',
      endDate: '2026-01-31',
      justification: 'Test justification',
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });
  });

  it('should handle create error', async () => {
    server.use(
      http.post('http://localhost:3000/agreements', () => {
        return HttpResponse.json(
          { message: 'Agreement creation failed' },
          { status: 400 }
        );
      })
    );

    const { result } = renderHook(() => useCreateAgreement(), { wrapper });

    await expect(
      result.current.mutateAsync({
        agreementName: 'New Agreement',
        agreementType: AgreementType.STA,
        cplId: 'cpl-1',
        channelId: 'channel-1',
        fuId: 'fu-1',
        tacticId: 'tactic-1',
        mechanicId: 'mechanic-1',
        capTotalAmount: 1000,
        startDate: '2026-01-01',
        endDate: '2026-01-31',
        justification: 'Test justification',
      })
    ).rejects.toThrow();

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });
  });
});

describe('useUpdateAgreement', () => {
  beforeEach(() => {
    queryClient.clear();
  });

  it('should update agreement successfully', async () => {
    server.use(
      http.patch('http://localhost:3000/agreements/:id', async ({ params, request }) => {
        const body = await request.json() as any;
        return HttpResponse.json({
          ...mockAgreement,
          id: params.id as string,
          ...body,
        });
      })
    );

    const { result } = renderHook(() => useUpdateAgreement(), { wrapper });

    await result.current.mutateAsync({
      id: '1',
      data: { agreementName: 'Updated Agreement', version: 3 },
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });
  });

  it('rejects (and does not silently swallow) a 409 STALE_VERSION conflict', async () => {
    server.use(
      http.patch('http://localhost:3000/agreements/:id', () => {
        return HttpResponse.json(
          {
            statusCode: 409,
            code: 'STALE_VERSION',
            message: 'This record was modified by another user.',
            entity: 'AGREEMENT',
            entityId: '1',
            expectedVersion: 2,
            currentVersion: 3,
          },
          { status: 409 }
        );
      })
    );

    const { result } = renderHook(() => useUpdateAgreement(), { wrapper });

    await expect(
      result.current.mutateAsync({
        id: '1',
        data: { agreementName: 'Updated Agreement', version: 2 },
      })
    ).rejects.toBeTruthy();

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });
  });
});

describe('useDeleteAgreement', () => {
  beforeEach(() => {
    queryClient.clear();
  });

  it('should delete agreement successfully', async () => {
    server.use(
      http.delete('http://localhost:3000/agreements/:id', () => {
        return new HttpResponse(null, { status: 204 });
      })
    );

    const { result } = renderHook(() => useDeleteAgreement(), { wrapper });

    // T-034f: delete requires `version` (optimistic locking, strict mode).
    await result.current.mutateAsync({ id: '1', version: 1 });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });
  });
});

describe('useSubmitAgreement', () => {
  beforeEach(() => {
    queryClient.clear();
  });

  it('should submit agreement successfully', async () => {
    server.use(
      http.post('http://localhost:3000/agreements/:id/submit', ({ params }) => {
        return HttpResponse.json({
          ...mockAgreement,
          id: params.id as string,
          status: AgreementStatus.PENDING,
        });
      })
    );

    const { result } = renderHook(() => useSubmitAgreement(), { wrapper });

    await result.current.mutateAsync('1');

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });
  });
});

describe('useApproveAgreement', () => {
  beforeEach(() => {
    queryClient.clear();
  });

  it('should approve agreement successfully', async () => {
    server.use(
      http.post('http://localhost:3000/agreements/:id/approve', ({ params }) => {
        return HttpResponse.json({
          ...mockAgreement,
          id: params.id as string,
          status: AgreementStatus.APPROVED,
        });
      })
    );

    const { result } = renderHook(() => useApproveAgreement(), { wrapper });

    await result.current.mutateAsync({ id: '1' });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });
  });
});

describe('useRejectAgreement', () => {
  beforeEach(() => {
    queryClient.clear();
  });

  it('should reject agreement successfully', async () => {
    server.use(
      http.post('http://localhost:3000/agreements/:id/reject', ({ params }) => {
        return HttpResponse.json({
          ...mockAgreement,
          id: params.id as string,
          status: AgreementStatus.REJECTED,
        });
      })
    );

    const { result } = renderHook(() => useRejectAgreement(), { wrapper });

    await result.current.mutateAsync({
      id: '1',
      data: { reason: 'Test rejection' },
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });
  });
});

describe('useCancelAgreement', () => {
  beforeEach(() => {
    queryClient.clear();
  });

  it('should cancel agreement successfully', async () => {
    server.use(
      http.post('http://localhost:3000/agreements/:id/cancel', ({ params }) => {
        return HttpResponse.json({
          ...mockAgreement,
          id: params.id as string,
          status: AgreementStatus.CANCELLED,
        });
      })
    );

    const { result } = renderHook(() => useCancelAgreement(), { wrapper });

    await result.current.mutateAsync({
      id: '1',
      data: { reason: 'Test cancellation' },
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });
  });
});

describe('useAgreementPermissions', () => {
  beforeEach(() => {
    queryClient.clear();
    server.use(
      http.get('http://localhost:3000/users/me', () => {
        return HttpResponse.json({
          id: '1',
          email: 'test@example.com',
          role: 'ADMIN',
          tenantId: 'tenant-1',
        });
      })
    );
  });

  it('should return correct permissions for ADMIN user with DRAFT agreement', async () => {
    const agreement = {
      ...mockAgreement,
      status: AgreementStatus.DRAFT,
    };

    const { result } = renderHook(
      () => useAgreementPermissions(agreement),
      { wrapper }
    );

    await waitFor(() => {
      expect(result.current.canEdit).toBe(true);
      expect(result.current.canSubmit).toBe(true);
      expect(result.current.canDelete).toBe(true);
    });
  });

  it('should return correct permissions for ADMIN user with PENDING agreement', async () => {
    const agreement = {
      ...mockAgreement,
      status: AgreementStatus.PENDING,
    };

    const { result } = renderHook(
      () => useAgreementPermissions(agreement),
      { wrapper }
    );

    await waitFor(() => {
      expect(result.current.canApprove).toBe(true);
      expect(result.current.canReject).toBe(true);
    });
  });

  it('should return false permissions when agreement is undefined', () => {
    const { result } = renderHook(
      () => useAgreementPermissions(undefined),
      { wrapper }
    );

    expect(result.current.canEdit).toBe(false);
    expect(result.current.canSubmit).toBe(false);
  });
});
