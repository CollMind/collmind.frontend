import { describe, it, expect, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter } from 'react-router-dom';
import { Provider } from 'react-redux';
import React from 'react';
import { store } from '@/store';
import {
  useLedgerEntries,
  useLedgerEntry,
  useLedgerByAgreement,
  useConsumedByAgreement,
  useLedgerByEnvelope,
  useConsumedByEnvelope,
} from '@/services/ledger.service';
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

const mockLedgerEntry = {
  id: '1',
  envelopeId: 'envelope-1',
  agreementId: 'agreement-1',
  type: 'RESERVATION',
  amount: 10000,
  description: 'Test entry',
  createdAt: new Date().toISOString(),
};

describe('useLedgerEntries', () => {
  beforeEach(() => {
    queryClient.clear();
  });

  it('should fetch ledger entries successfully', async () => {
    server.use(
      http.get('http://localhost:3000/ledger', () => {
        return HttpResponse.json([mockLedgerEntry]);
      })
    );

    const { result } = renderHook(() => useLedgerEntries(), { wrapper });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.data).toEqual([mockLedgerEntry]);
  });

  it('should fetch ledger entries with filters', async () => {
    server.use(
      http.get('http://localhost:3000/ledger', ({ request }) => {
        const url = new URL(request.url);
        const envelopeId = url.searchParams.get('envelopeId');
        return HttpResponse.json([
          { ...mockLedgerEntry, envelopeId: envelopeId || 'envelope-1' },
        ]);
      })
    );

    const { result } = renderHook(
      () => useLedgerEntries({ envelopeId: 'envelope-1' }),
      { wrapper }
    );

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.data).toBeDefined();
  });
});

describe('useLedgerEntry', () => {
  beforeEach(() => {
    queryClient.clear();
  });

  it('should fetch ledger entry by id', async () => {
    server.use(
      http.get('http://localhost:3000/ledger/:id', ({ params }) => {
        return HttpResponse.json({
          ...mockLedgerEntry,
          id: params.id as string,
        });
      })
    );

    const { result } = renderHook(() => useLedgerEntry('1'), { wrapper });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.data?.id).toBe('1');
  });

  it('should not fetch when id is empty', () => {
    const { result } = renderHook(() => useLedgerEntry(''), { wrapper });

    expect(result.current.isFetching).toBe(false);
  });
});

describe('useLedgerByAgreement', () => {
  beforeEach(() => {
    queryClient.clear();
  });

  it('should fetch ledger entries by agreement', async () => {
    server.use(
      http.get('http://localhost:3000/ledger/agreement/:id', ({ params }) => {
        return HttpResponse.json([
          { ...mockLedgerEntry, agreementId: params.id as string },
        ]);
      })
    );

    const { result } = renderHook(
      () => useLedgerByAgreement('agreement-1'),
      { wrapper }
    );

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.data).toBeDefined();
  });

  it('should not fetch when agreementId is empty', () => {
    const { result } = renderHook(() => useLedgerByAgreement(''), { wrapper });

    expect(result.current.isFetching).toBe(false);
  });
});

describe('useConsumedByAgreement', () => {
  beforeEach(() => {
    queryClient.clear();
  });

  it('should fetch consumed amount by agreement', async () => {
    server.use(
      http.get('http://localhost:3000/ledger/agreement/:id/consumed', () => {
        return HttpResponse.json({
          consumedAmount: 50000,
        });
      })
    );

    const { result } = renderHook(
      () => useConsumedByAgreement('agreement-1'),
      { wrapper }
    );

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.data?.consumedAmount).toBe(50000);
  });
});

describe('useLedgerByEnvelope', () => {
  beforeEach(() => {
    queryClient.clear();
  });

  it('should fetch ledger entries by envelope', async () => {
    server.use(
      http.get('http://localhost:3000/ledger/envelope/:id', ({ params }) => {
        return HttpResponse.json([
          { ...mockLedgerEntry, envelopeId: params.id as string },
        ]);
      })
    );

    const { result } = renderHook(
      () => useLedgerByEnvelope('envelope-1'),
      { wrapper }
    );

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.data).toBeDefined();
  });
});

describe('useConsumedByEnvelope', () => {
  beforeEach(() => {
    queryClient.clear();
  });

  it('should fetch consumed amount by envelope', async () => {
    server.use(
      http.get('http://localhost:3000/ledger/envelope/:id/consumed', () => {
        return HttpResponse.json({
          consumedAmount: 75000,
        });
      })
    );

    const { result } = renderHook(
      () => useConsumedByEnvelope('envelope-1'),
      { wrapper }
    );

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.data?.consumedAmount).toBe(75000);
  });
});
