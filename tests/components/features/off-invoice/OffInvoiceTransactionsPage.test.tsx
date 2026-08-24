import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { BrowserRouter } from 'react-router-dom';
import { render } from '@testing-library/react';
import authReducer from '@/store/slices/auth.slice';
import { OffInvoiceTransactionsPage } from '@/components/features/off-invoice/OffInvoiceTransactionsPage';
import { useMe } from '@/services/users.service';
import {
  offInvoiceEndpoints,
  TransactionSummary,
} from '@/api/endpoints/off-invoice.endpoints';
import { onInvoiceEndpoints } from '@/api/endpoints/on-invoice.endpoints';
import { UserRole, UserStatus, User } from '@/types/user.types';

// T-277 / Z35: `POST /agreement-transactions` ("Manuel Giriş") backend'de
// `{ADMIN,FINANCE}`e daraltıldı (`/off-invoice/upload` ile EŞİTLENDİ, PLANNER
// düştü). Bu suite frontend YARISINI pinliyor: buton önceden rol kontrolü
// SIFIRDI (grep -c 'useAuth|user?.role|requiredRole' → 0, task ölçümü) —
// PLANNER ve READONLY sayfaya girebiliyor (`/off-invoice/transactions`
// requiredRole ADMIN/FINANCE/PLANNER/READONLY) ve butonu görüyordu.
//
// §2.7 #6 (ayırt edici test): her assertion görmesi GEREKEN bir rolle
// görmemesi GEREKEN bir rolü ayrı ayrı sınar — yalnız pozitif vaka "doğru
// kapılı" ile "kimseye kapalı"yı ayıramaz.

vi.mock('@/services/users.service', async () => {
  const actual = await vi.importActual<
    typeof import('@/services/users.service')
  >('@/services/users.service');
  return {
    ...actual,
    useMe: vi.fn(),
  };
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

// Modal kendi useEffect'siz `useQuery`'siyle (agreements — `enabled` yok)
// ağır bir bileşen; bu test yalnız butonun GÖRÜNÜRLÜĞÜNÜ ölçüyor, modal'ın
// içeriğini değil — routeGuards.test.tsx'in "ağır sayfa bileşenleri stub'lanır"
// deseniyle aynı gerekçe.
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

function renderPage(role: UserRole | undefined) {
  mockedUseMe.mockReturnValue({
    data: role ? ({ ...baseUser, role } as User) : undefined,
    isLoading: false,
    error: null,
  } as ReturnType<typeof useMe>);

  const store = configureStore({
    reducer: { auth: authReducer },
    preloadedState: {
      auth: {
        isAuthenticated: true,
        user: role ? ({ ...baseUser, role } as User) : null,
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

describe('OffInvoiceTransactionsPage — T-277/Z35 "Manuel Giriş" rol kapısı', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockedGetTransactions.mockResolvedValue([]);
    mockedGetOffCount.mockResolvedValue(0);
    mockedGetOnCount.mockResolvedValue(0);
    mockedGetEntries.mockResolvedValue([]);
    const emptySummary: TransactionSummary = {
      today: { count: 0, amount: 0 },
      pending: { count: 0, amount: 0 },
      total: { count: 0, amount: 0, records: 0 },
      offInvoiceShare: {
        off: { count: 0, amount: 0, percentage: 0 },
        on: { count: 0, amount: 0, percentage: 0 },
      },
    };
    mockedGetSummary.mockResolvedValue(emptySummary);
  });

  it('FINANCE görüyor (backend: agreement-transaction.controller.ts:51-52, `@Roles(ADMIN,FINANCE)`)', async () => {
    renderPage(UserRole.FINANCE);
    await waitFor(() =>
      expect(
        screen.getByRole('button', { name: 'Manuel Giriş' })
      ).toBeInTheDocument()
    );
  });

  it('ADMIN görüyor (hasRole admin-bypass)', async () => {
    renderPage(UserRole.ADMIN);
    await waitFor(() =>
      expect(
        screen.getByRole('button', { name: 'Manuel Giriş' })
      ).toBeInTheDocument()
    );
  });

  it('PLANNER görmüyor (bugüne kadarki kusur: 403 sürprizi yerine buton artık hiç görünmüyor)', async () => {
    renderPage(UserRole.PLANNER);
    // Sayfanın kendisi PLANNER'a açık — listeleme yükünü bekle, sonra butonun
    // yokluğunu doğrula (yalnız "henüz render olmadı" ile karışmasın diye).
    await waitFor(() =>
      expect(screen.getByText('Fatura İşlemleri')).toBeInTheDocument()
    );
    expect(
      screen.queryByRole('button', { name: 'Manuel Giriş' })
    ).not.toBeInTheDocument();
  });

  it('READONLY görmüyor (route açık ama buton artık ÖLÜ DEĞİL — hiç render olmuyor)', async () => {
    renderPage(UserRole.READONLY);
    await waitFor(() =>
      expect(screen.getByText('Fatura İşlemleri')).toBeInTheDocument()
    );
    expect(
      screen.queryByRole('button', { name: 'Manuel Giriş' })
    ).not.toBeInTheDocument();
  });

  it('rol tanımsızken görmüyor', async () => {
    renderPage(undefined);
    await waitFor(() =>
      expect(screen.getByText('Fatura İşlemleri')).toBeInTheDocument()
    );
    expect(
      screen.queryByRole('button', { name: 'Manuel Giriş' })
    ).not.toBeInTheDocument();
  });

  it('"Off-Invoice Yükle" ve "On-Invoice Yükle" düğmeleri role bakılmaksızın her zaman render oluyor (bu turun kapsamı DIŞINDA — pozitif kontrol: daraltma yalnız Manuel Giriş\'i düşürüyor)', async () => {
    renderPage(UserRole.PLANNER);
    await waitFor(() =>
      expect(
        screen.getByRole('button', { name: 'Off-Invoice Yükle' })
      ).toBeInTheDocument()
    );
    expect(
      screen.getByRole('button', { name: 'On-Invoice Yükle' })
    ).toBeInTheDocument();
  });
});
