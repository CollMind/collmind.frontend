import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, waitFor, fireEvent } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { BrowserRouter } from 'react-router-dom';
import { render } from '@testing-library/react';
import authReducer from '@/store/slices/auth.slice';
import { OffInvoiceTransactionsPage } from '@/components/features/off-invoice/OffInvoiceTransactionsPage';
import { useMe } from '@/services/users.service';
import { offInvoiceEndpoints } from '@/api/endpoints/off-invoice.endpoints';
import {
  onInvoiceEndpoints,
  OnInvoiceEntry,
} from '@/api/endpoints/on-invoice.endpoints';
import { UserRole, UserStatus, User } from '@/types/user.types';

// T-287 K3 vaka 2, `Promise.all` kırılganlığı: `loadData`
// (OffInvoiceTransactionsPage.tsx:71) üç off-invoice çağrısıyla bir
// on-invoice çağrısını TEK `Promise.all`'a koyuyor. Off-invoice
// tarafındaki herhangi bir hata (403 dahil) `Promise.all`'ı reddeder ve
// on-invoice listesi — kendi başına başarılı olsa bile — hiç render
// olmuyor. Bu, `Promise.allSettled`'a geçilmesini gerektiren bir
// dayanıklılık kusuru (rol kararı DEĞİL — bkz. T-287 brief §K3 vaka 2).

vi.mock('@/services/users.service', async () => {
  const actual = await vi.importActual<
    typeof import('@/services/users.service')
  >('@/services/users.service');
  return { ...actual, useMe: vi.fn() };
});

vi.mock('@/api/endpoints/off-invoice.endpoints', () => ({
  offInvoiceEndpoints: {
    getCount: vi.fn(),
    getTransactions: vi.fn(),
    getSummary: vi.fn(),
  },
}));

vi.mock('@/api/endpoints/on-invoice.endpoints', () => ({
  onInvoiceEndpoints: {
    getCount: vi.fn(),
    getEntries: vi.fn(),
  },
}));

vi.mock('@/components/features/off-invoice/OffInvoiceManualEntryModal', () => ({
  OffInvoiceManualEntryModal: () => null,
}));

const mockedUseMe = vi.mocked(useMe);
const mockedGetTransactions = vi.mocked(offInvoiceEndpoints.getTransactions);
const mockedGetOffCount = vi.mocked(offInvoiceEndpoints.getCount);
const mockedGetSummary = vi.mocked(offInvoiceEndpoints.getSummary);
const mockedGetEntries = vi.mocked(onInvoiceEndpoints.getEntries);
const mockedGetOnCount = vi.mocked(onInvoiceEndpoints.getCount);

function createTestQueryClient() {
  return new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0, staleTime: 0 } },
  });
}

const baseUser: Omit<User, 'role'> = {
  id: '1',
  email: 'test@example.com',
  fullName: 'Test User',
  firstName: 'Test',
  lastName: 'User',
  status: UserStatus.ACTIVE,
  tenantId: 'tenant-1',
  createdAt: new Date(),
  updatedAt: new Date(),
};

function renderPage(role: UserRole) {
  mockedUseMe.mockReturnValue({
    data: { ...baseUser, role } as User,
    isLoading: false,
    error: null,
  } as ReturnType<typeof useMe>);

  const store = configureStore({
    reducer: { auth: authReducer },
    preloadedState: {
      auth: {
        isAuthenticated: true,
        user: { ...baseUser, role } as User,
        accessToken: 'access-token',
        refreshToken: 'refresh-token',
        isLoading: false,
        error: null,
      },
    },
  });

  return render(
    <Provider store={store}>
      <QueryClientProvider client={createTestQueryClient()}>
        <BrowserRouter>
          <OffInvoiceTransactionsPage />
        </BrowserRouter>
      </QueryClientProvider>
    </Provider>
  );
}

describe('OffInvoiceTransactionsPage — T-287 K3 vaka 2: Promise.all kırılganlığı', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockedGetOffCount.mockResolvedValue(3);
    mockedGetOnCount.mockResolvedValue(2);
    // Off-invoice tarafı reddediyor (403 simülasyonu); on-invoice başarılı.
    mockedGetTransactions.mockRejectedValue(
      Object.assign(new Error('Forbidden'), {
        isAxiosError: true,
        response: { status: 403 },
      })
    );
    mockedGetSummary.mockResolvedValue({
      today: { count: 0, amount: 0 },
      pending: { count: 0, amount: 0 },
      total: { count: 0, amount: 0, records: 0 },
      offInvoiceShare: {
        off: { count: 0, amount: 0, percentage: 0 },
        on: { count: 0, amount: 0, percentage: 0 },
      },
    });
    mockedGetEntries.mockResolvedValue([
      {
        id: 'oi-1',
        invoiceNo: 'ON-INV-1',
        invoiceDate: '2024-01-15',
        customerCode: 'CUST-1',
        skuCode: 'SKU-1',
        discount: 100,
        batchId: 'batch-1',
        status: 'POSTED',
        createdAt: '2024-01-15T10:00:00.000Z',
      } as unknown as OnInvoiceEntry,
    ]);
  });

  it('off-invoice çağrısı reddetse bile on-invoice satırı GÖRÜNÜR (Promise.allSettled — kısmi başarı)', async () => {
    renderPage(UserRole.FINANCE);

    await waitFor(() =>
      expect(screen.getByText('Fatura İşlemleri')).toBeInTheDocument()
    );

    // Varsayılan sekme 'off'tur (on-invoice satırları o sekmede filtrelenir,
    // fetch başarısıyla ilgisiz) — On-Invoice sekmesine geç.
    fireEvent.click(screen.getByText(/^On-Invoice \d+$/));

    // Düzeltme: off-invoice çağrısı reddetse bile on-invoice satırı
    // (bağımsız kaynak) kendi başına render edilir.
    await waitFor(() =>
      expect(screen.getByText('ON-INV-1')).toBeInTheDocument()
    );
  });
});
