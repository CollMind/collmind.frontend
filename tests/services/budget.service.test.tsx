import { describe, it, expect, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter } from 'react-router-dom';
import { Provider } from 'react-redux';
import React from 'react';
import { store } from '@/store';
import {
  useBudgetEnvelopes,
  useBudgetEnvelope,
  useCreateBudgetEnvelope,
  useReserveBudget,
  useApproveReservation,
  useRejectReservation,
  useBudgetReservations,
  useBudgetReservedAmount,
  useBudgetTransactions,
} from '@/services/budget.service';
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

const mockEnvelope = {
  id: '1',
  code: 'ENV001',
  name: 'Test Envelope',
  allocatedAmount: 100000,
  consumedAmount: 50000,
  reservedAmount: 20000,
  availableAmount: 30000,
  period: '2024-Q1',
  tenantId: 'tenant-1',
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

describe('useBudgetEnvelopes', () => {
  beforeEach(() => {
    queryClient.clear();
  });

  it('should fetch budget envelopes successfully', async () => {
    server.use(
      http.get('http://localhost:3000/budget/envelopes', () => {
        return HttpResponse.json([mockEnvelope]);
      })
    );

    const { result } = renderHook(() => useBudgetEnvelopes(), { wrapper });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.data).toEqual([mockEnvelope]);
  });
});

describe('useBudgetEnvelope', () => {
  beforeEach(() => {
    queryClient.clear();
  });

  it('should fetch budget envelope by id', async () => {
    server.use(
      http.get('http://localhost:3000/budget/envelopes/:id', ({ params }) => {
        return HttpResponse.json({
          ...mockEnvelope,
          id: params.id as string,
        });
      })
    );

    const { result } = renderHook(() => useBudgetEnvelope('1'), { wrapper });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.data?.id).toBe('1');
  });

  it('should not fetch when id is empty', () => {
    const { result } = renderHook(() => useBudgetEnvelope(''), { wrapper });

    expect(result.current.isFetching).toBe(false);
  });
});

describe('useCreateBudgetEnvelope', () => {
  beforeEach(() => {
    queryClient.clear();
  });

  it('should create budget envelope successfully', async () => {
    server.use(
      http.post('http://localhost:3000/budget/envelopes', async ({ request }) => {
        const body = await request.json() as any;
        return HttpResponse.json(
          {
            ...mockEnvelope,
            ...body,
          },
          { status: 201 }
        );
      })
    );

    const { result } = renderHook(() => useCreateBudgetEnvelope(), { wrapper });

    await result.current.mutateAsync({
      code: 'ENV001',
      name: 'New Envelope',
      allocatedAmount: 100000,
      period: '2024-Q1',
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });
  });

  it('should handle create error', async () => {
    server.use(
      http.post('http://localhost:3000/budget/envelopes', () => {
        return HttpResponse.json(
          { message: 'Envelope creation failed' },
          { status: 400 }
        );
      })
    );

    const { result } = renderHook(() => useCreateBudgetEnvelope(), { wrapper });

    await expect(
      result.current.mutateAsync({
        code: 'ENV001',
        name: 'New Envelope',
        allocatedAmount: 100000,
        period: '2024-Q1',
      })
    ).rejects.toThrow();

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });
  });
});

describe('useReserveBudget', () => {
  beforeEach(() => {
    queryClient.clear();
  });

  it('should reserve budget successfully', async () => {
    server.use(
      http.post('http://localhost:3000/budget/reserve', async ({ request }) => {
        const body = await request.json() as any;
        return HttpResponse.json({
          id: '1',
          envelopeId: body.envelopeId,
          amount: body.amount,
          status: 'PENDING',
        });
      })
    );

    const { result } = renderHook(() => useReserveBudget(), { wrapper });

    await result.current.mutateAsync({
      envelopeId: '1',
      amount: 10000,
      agreementId: 'agreement-1',
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });
  });
});

describe('useApproveReservation', () => {
  beforeEach(() => {
    queryClient.clear();
  });

  it('should approve reservation successfully', async () => {
    server.use(
      http.post('http://localhost:3000/budget/reservations/:id/approve', ({ params }) => {
        return HttpResponse.json({
          id: params.id as string,
          status: 'APPROVED',
        });
      })
    );

    const { result } = renderHook(() => useApproveReservation(), { wrapper });

    await result.current.mutateAsync('1');

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });
  });
});

describe('useRejectReservation', () => {
  beforeEach(() => {
    queryClient.clear();
  });

  it('should reject reservation successfully', async () => {
    server.use(
      http.post('http://localhost:3000/budget/reservations/:id/reject', ({ params }) => {
        return HttpResponse.json({
          id: params.id as string,
          status: 'REJECTED',
        });
      })
    );

    const { result } = renderHook(() => useRejectReservation(), { wrapper });

    await result.current.mutateAsync({
      id: '1',
      reason: 'Test rejection',
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });
  });
});

describe('useBudgetReservations', () => {
  beforeEach(() => {
    queryClient.clear();
  });

  it('should fetch reservations for envelope', async () => {
    server.use(
      http.get('http://localhost:3000/budget/envelopes/:id/reservations', () => {
        return HttpResponse.json([
          {
            id: '1',
            envelopeId: '1',
            amount: 10000,
            status: 'PENDING',
          },
        ]);
      })
    );

    const { result } = renderHook(() => useBudgetReservations('1'), { wrapper });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.data).toBeDefined();
  });

  it('should not fetch when envelopeId is empty', () => {
    const { result } = renderHook(() => useBudgetReservations(''), { wrapper });

    expect(result.current.isFetching).toBe(false);
  });
});

describe('useBudgetReservedAmount', () => {
  beforeEach(() => {
    queryClient.clear();
  });

  it('should fetch reserved amount', async () => {
    server.use(
      // T-040: mock yolu `/reserved-amount` idi; gerçek endpoint `/reserved`
      // (backend `budget.controller.ts:90` @Get('envelopes/:id/reserved'),
      // frontend `budget.endpoints.ts:23`). Handler hiç eşleşmiyor, istek
      // düşüyor ve `isSuccess` false kalıyordu. Üretim kodu doğru, mock yanlıştı.
      http.get('http://localhost:3000/budget/envelopes/:id/reserved', () => {
        return HttpResponse.json({
          reservedAmount: 20000,
        });
      })
    );

    const { result } = renderHook(() => useBudgetReservedAmount('1'), { wrapper });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.data?.reservedAmount).toBe(20000);
  });
});

describe('useBudgetTransactions', () => {
  beforeEach(() => {
    queryClient.clear();
  });

  it('should fetch budget transactions', async () => {
    server.use(
      http.get('http://localhost:3000/budget/envelopes/:id/transactions', () => {
        return HttpResponse.json([
          {
            id: '1',
            envelopeId: '1',
            type: 'RESERVATION',
            amount: 10000,
            createdAt: new Date().toISOString(),
          },
        ]);
      })
    );

    const { result } = renderHook(() => useBudgetTransactions('1'), { wrapper });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.data).toBeDefined();
  });
});
