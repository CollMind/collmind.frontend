import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import authReducer from '@/store/slices/auth.slice';
import { User, UserRole, UserStatus } from '@/types/user.types';

// T-287 K3, vaka 2 (`/off-invoice/transactions`) ve vaka 3 (`/budget/ledger`):
// ekran kapısı ile rota kümesi ayrışıyor.
//
//   /off-invoice/transactions  ekran {A,F,P,RO}   rota-kümesi {A,F,P}   → RO 403
//   /budget/ledger             ekran KAPISIZ      rota-kümesi {A,F,P}   → CM,RO 403
//
// Bu dosya §2.7 #6 desenindeki "ayırt edici" şeklini izler: hem GİRMESİ
// gereken hem GİRMEMESİ gereken rolü ayrı ayrı sınar. Route element'leri
// ağır (data-fetch eden) bileşenler olduğu için stub'lanır — routeGuards.
// test.tsx'in izole ettiği aynı gerekçe (kapı, chrome değil).

vi.mock('@/components/layout/AppLayout', () => ({
  AppLayout: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="app-layout">{children}</div>
  ),
}));

vi.mock('@/components/features/dashboard/DashboardPage', () => ({
  DashboardPage: () => <div>Dashboard Stub</div>,
}));

vi.mock('@/components/features/off-invoice/OffInvoiceTransactionsPage', () => ({
  OffInvoiceTransactionsPage: () => <div>OffInvoiceTransactionsPage Stub</div>,
}));

vi.mock('@/components/budget/BudgetLedgerPage', () => ({
  BudgetLedgerPage: () => <div>BudgetLedgerPage Stub</div>,
}));

import { routeConfig } from '@/routes';

const createTestQueryClient = () =>
  new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0, staleTime: 0 } },
  });

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

function renderAtPath(path: string, role: UserRole) {
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
        <MemoryRouter initialEntries={[path]}>
          <Routes>
            {routeConfig.map((route) =>
              route.path ? (
                <Route key={route.path} path={route.path} element={route.element} />
              ) : null
            )}
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>
    </Provider>
  );
}

describe('T-287 K3 — route gate ↔ rota kümesi ayrışması (repro + pin)', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  describe('/off-invoice/transactions', () => {
    it('FINANCE girebilir (pozitif yarı — daralma FINANCE\'i etkilemez)', async () => {
      renderAtPath('/off-invoice/transactions', UserRole.FINANCE);
      expect(
        await screen.findByText('OffInvoiceTransactionsPage Stub')
      ).toBeInTheDocument();
    });

    it('PLANNER girebilir (pozitif yarı — backend rota kümesinde var)', async () => {
      renderAtPath('/off-invoice/transactions', UserRole.PLANNER);
      expect(
        await screen.findByText('OffInvoiceTransactionsPage Stub')
      ).toBeInTheDocument();
    });

    it('READONLY GİREMEMELİ (backend agreement-transaction.controller.ts {A,F,P} — READONLY yok, sayfa canlıda kırık)', async () => {
      renderAtPath('/off-invoice/transactions', UserRole.READONLY);
      expect(await screen.findByText('Dashboard Stub')).toBeInTheDocument();
      expect(
        screen.queryByText('OffInvoiceTransactionsPage Stub')
      ).not.toBeInTheDocument();
    });
  });

  describe('/budget/ledger', () => {
    it('FINANCE girebilir (pozitif yarı)', async () => {
      renderAtPath('/budget/ledger', UserRole.FINANCE);
      expect(
        await screen.findByText('BudgetLedgerPage Stub')
      ).toBeInTheDocument();
    });

    it('PLANNER girebilir (pozitif yarı)', async () => {
      renderAtPath('/budget/ledger', UserRole.PLANNER);
      expect(
        await screen.findByText('BudgetLedgerPage Stub')
      ).toBeInTheDocument();
    });

    it('CATEGORY_MANAGER GİREMEMELİ (backend ledger.controller.ts GET / {A,F,P} — CM yok)', async () => {
      renderAtPath('/budget/ledger', UserRole.CATEGORY_MANAGER);
      expect(await screen.findByText('Dashboard Stub')).toBeInTheDocument();
      expect(
        screen.queryByText('BudgetLedgerPage Stub')
      ).not.toBeInTheDocument();
    });

    it('READONLY GİREMEMELİ (aynı gerekçe)', async () => {
      renderAtPath('/budget/ledger', UserRole.READONLY);
      expect(await screen.findByText('Dashboard Stub')).toBeInTheDocument();
      expect(
        screen.queryByText('BudgetLedgerPage Stub')
      ).not.toBeInTheDocument();
    });

    it('ADMIN her zaman girebilir (hasRole admin-bypass)', async () => {
      renderAtPath('/budget/ledger', UserRole.ADMIN);
      expect(
        await screen.findByText('BudgetLedgerPage Stub')
      ).toBeInTheDocument();
    });
  });
});
