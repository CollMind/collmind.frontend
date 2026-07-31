import { describe, it, expect, beforeEach } from 'vitest';
import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { Provider } from 'react-redux';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter } from 'react-router-dom';
import { DashboardPage } from '@/components/features/dashboard/DashboardPage';
import { store } from '@/store';
import { http, HttpResponse } from 'msw';
import { server } from '../../../setup';

// NOTE (T-040): this test previously targeted a legacy DashboardPage
// implementation (mocking a nonsensical `/users/dashboard/summary` URL and
// asserting on strings like "Gross Sales" / "CPL-Based Profitability" /
// "Recent Transactions" that don't exist anywhere in the current
// component). The current DashboardPage is persona-driven and backed by
// `/dashboard/summary`, `/dashboard/pending-tasks` and `/dashboard/cpl-status`
// (see src/components/features/dashboard/DashboardPage.tsx and
// src/services/dashboard.service.ts). Rewritten to match actual behavior.

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

describe('DashboardPage', () => {
  beforeEach(() => {
    queryClient.clear();
    server.use(
      http.get('http://localhost:3000/users/me', () => {
        return HttpResponse.json({
          id: '1',
          email: 'test@example.com',
          fullName: 'Test User',
          role: 'ADMIN',
          status: 'ACTIVE',
          tenantId: 'tenant-1',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        });
      })
    );
    // The global handlers already cover /dashboard/summary,
    // /dashboard/pending-tasks and /dashboard/cpl-status with a generic
    // ADMIN-shaped payload (see tests/mocks/handlers.ts).
  });

  it('renders the persona-appropriate dashboard title for an ADMIN user', async () => {
    render(<DashboardPage />, { wrapper });

    // ADMIN -> persona 'admin' -> "Operasyon Paneli" (see
    // getDashboardTitle in DashboardPage.tsx).
    await waitFor(() => {
      expect(
        screen.getByRole('heading', { name: 'Operasyon Paneli' })
      ).toBeInTheDocument();
    });
  });

  it('renders quick-access links available to an ADMIN user', async () => {
    render(<DashboardPage />, { wrapper });

    await waitFor(() => {
      expect(screen.getByText('Hizli erisim')).toBeInTheDocument();
    });

    expect(screen.getByText('+ Yeni Anlasma')).toBeInTheDocument();
    expect(screen.getByText('Onay Kuyrugu')).toBeInTheDocument();
    expect(screen.getByText('Actuals Yukle')).toBeInTheDocument();
    expect(screen.getByText("Planlama Grid'i")).toBeInTheDocument();
  });

  it('renders the budget utilization panel for an ADMIN user', async () => {
    render(<DashboardPage />, { wrapper });

    // BudgetUtilizationPanel is only shown for admin/finance personas when
    // summary.budgetUtilization is present (see DashboardPage.tsx and
    // BudgetUtilizationPanel.tsx).
    await waitFor(() => {
      expect(screen.getByText('Bütçe Kullanımı')).toBeInTheDocument();
    });

    expect(screen.getByText('On-Invoice')).toBeInTheDocument();
    expect(screen.getByText('Off-Invoice')).toBeInTheDocument();
  });

  it('shows an error state when the dashboard summary request fails', async () => {
    server.use(
      http.get('http://localhost:3000/dashboard/summary', () => {
        return HttpResponse.json(
          { message: 'Internal error' },
          { status: 500 }
        );
      })
    );

    render(<DashboardPage />, { wrapper });

    await waitFor(() => {
      expect(
        screen.getByText(/Dashboard verileri yuklenemedi/i)
      ).toBeInTheDocument();
    });
  });
});
