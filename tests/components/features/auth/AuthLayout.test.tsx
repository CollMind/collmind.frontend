import { describe, it, expect } from 'vitest';
import React from 'react';
import { render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { Provider } from 'react-redux';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthLayout } from '@/components/features/auth/AuthLayout';
import { store } from '@/store';

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

describe('AuthLayout', () => {
  it('renders login form by default', () => {
    render(<AuthLayout />, { wrapper });
    expect(screen.getByText(/Welcome Back/i)).toBeInTheDocument();
  });

  it('renders CollMind logo', () => {
    render(<AuthLayout />, { wrapper });
    // Logo should be rendered (checking for text or specific element)
    const logo = document.querySelector('svg') || document.querySelector('[class*="logo"]');
    expect(logo || screen.getByText(/CollMind/i)).toBeTruthy();
  });
});

