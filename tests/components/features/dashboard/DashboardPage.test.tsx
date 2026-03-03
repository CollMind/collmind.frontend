import { describe, it, expect, beforeEach } from 'vitest';
import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { Provider } from 'react-redux';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter } from 'react-router-dom';
import { DashboardPage } from '@/components/features/dashboard/DashboardPage';
import { store } from '@/store';
import { http, HttpResponse } from 'msw';
import { server } from '../../setup';

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
    server.use(
      http.get('http://localhost:3000/users/me', () => {
        return HttpResponse.json({
          id: '1',
          email: 'test@example.com',
          fullName: 'Test User',
          role: 'ADMIN',
          tenantId: 'tenant-1',
        });
      }),
      http.get('http://localhost:3000/users/dashboard/summary', () => {
        return HttpResponse.json({
          activeOperations: 5,
          drafts: 2,
          managedBudget: 100000,
          budgetUsage: 50,
        });
      })
    );
  });

  it('renders dashboard title', async () => {
    render(<DashboardPage />, { wrapper });
    await waitFor(() => {
      expect(screen.getByText(/Dashboard/i)).toBeInTheDocument();
    });
  });

  it('renders metric cards', async () => {
    render(<DashboardPage />, { wrapper });
    await waitFor(() => {
      expect(screen.getByText(/Gross Sales/i)).toBeInTheDocument();
    });
  });

  it('renders profitability chart', async () => {
    render(<DashboardPage />, { wrapper });
    await waitFor(() => {
      expect(screen.getByText(/CPL-Based Profitability/i)).toBeInTheDocument();
    });
  });

  it('renders recent transactions', async () => {
    render(<DashboardPage />, { wrapper });
    await waitFor(() => {
      expect(screen.getByText(/Recent Transactions/i)).toBeInTheDocument();
    });
  });
});

