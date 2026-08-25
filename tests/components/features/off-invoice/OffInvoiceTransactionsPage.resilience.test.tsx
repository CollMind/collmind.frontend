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
// (OffInvoiceTransactionsPage.tsx'in `loadData` gövdesi) üç off-invoice çağrısıyla bir
// on-invoice çağrısını TEK `Promise.all`'a koyuyor. Off-invoice
// tarafındaki herhangi bir hata (403 dahil) `Promise.all`'ı reddeder ve
// on-invoice listesi — kendi başına başarılı olsa bile — hiç render
// olmuyor. Bu, `Promise.allSettled`'a geçilmesini gerektiren bir
// dayanıklılık kusuru (rol kararı DEĞİL — bkz. T-287 brief §K3 vaka 2).

// ⛔ B3 (code-reviewer): §2.5'in KULLANICIYA-GÖRÜNÜR yarısı pinsizdi.
// Mutasyonla ölçüldü: `toast.error` bloğu KALDIRILDIĞINDA suite yeşil kalıyordu
// — yani "kısmi içerik gösterilir" pinlenmişti ama "kullanıcı bir şeyin EKSİK
// olduğunu görür" pinlenmemişti. `CLAUDE.md §4.2`: bağlayıcı koşul guard'a bağlanır.
const toastErrorSpy = vi.fn();
vi.mock('@/hooks/useToast', () => ({
  useToast: () => ({
    error: toastErrorSpy,
    success: vi.fn(),
    info: vi.fn(),
    warning: vi.fn(),
  }),
}));

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

describe('SÖZLEŞME: kısmi başarı içeriği düşürmez — ve eksiklik KULLANICIYA görünür', () => {
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

  // ⛔ §2.5'in İKİNCİ yarısı — B3. Kısmi içerik göstermek YETMEZ; kullanıcı
  // bir şeyin eksik olduğunu GÖRMELİ. Aksi hâlde `allSettled` sessiz sıfırı
  // İNANDIRICI kılar ve `Promise.all`'dan DAHA KÖTÜ olur.
  it('reddedilen çağrı kullanıcıya GÖRÜNÜR bir hata üretir (sessiz sıfır DEĞİL)', async () => {
    // ⛔ FIXTURE AYRIMI: üstteki `beforeEach` SAYAÇLARI BAŞARILI döndürüyor
    // (`mockResolvedValue(3)`) — yani `loadCounts` hiç reddetmiyor ve o yol
    // HİÇ KOŞMUYORDU. `DISIPLIN`: "negatif bir davranışsal kanıt, tetikleyen
    // fixture olmadan kanıt değildir."
    mockedGetOffCount.mockRejectedValue(new Error('403'));

    renderPage(UserRole.FINANCE);

    await waitFor(() =>
      expect(screen.getByText('Fatura İşlemleri')).toBeInTheDocument()
    );

    // ⛔ AYIRT EDİCİ OLMALI: `loadData`'nın KENDİ toast'ı da bu spy'ı çağırıyor.
    // İlk yazımda yalnız `toHaveBeenCalled()` vardı ve `loadCounts`'un toast'ını
    // kaldıran mutasyon YEŞİL kalıyordu — assertion YANLIŞ ÜRETİCİ tarafından
    // karşılanıyordu (`§2.7`: "kapsam var, ayırt etme gücü yok").
    await waitFor(() =>
      expect(toastErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('sayaçlar yüklenemedi')
      )
    );
  });

  // §2.5 — reddedilen sayaç `0` olarak DEĞİL, "bilinmiyor" olarak render edilir.
  // `0` "ölçüldü ve sıfır" demektir; reddedilen bir çağrı hakkında bunu söylemek
  // bir YALANDIR, ve toplamı da kirletir.
  it('reddedilen sayaç `0` değil `?` gösterir ve TOPLAMI kirletmez', async () => {
    mockedGetOffCount.mockRejectedValue(new Error('403'));

    renderPage(UserRole.FINANCE);

    await waitFor(() =>
      expect(screen.getByText('Fatura İşlemleri')).toBeInTheDocument()
    );

    await waitFor(() =>
      expect(
        screen.getByRole('button', { name: /Off-Invoice \?/ })
      ).toBeInTheDocument()
    );
    expect(screen.getByRole('button', { name: /Tümü \?/ })).toBeInTheDocument();
  });
});
