import { describe, it, expect, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import React from 'react';
import { Provider } from 'react-redux';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { store } from '@/store';
import { setCredentials, logout } from '@/store/slices/auth.slice';
import { User } from '@/types/user.types';

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

const mockUser: User = {
  id: '1',
  email: 'test@example.com',
  role: 'ADMIN',
  fullName: 'Test User',
  status: 'ACTIVE',
  tenantId: 'tenant-1',
  createdAt: new Date(),
  updatedAt: new Date(),
};

describe('useAuth', () => {
  beforeEach(() => {
    localStorage.clear();
    store.dispatch(logout());
  });

  it('should return initial state when not authenticated', () => {
    const { result } = renderHook(() => useAuth(), { wrapper });

    expect(result.current.isAuthenticated).toBe(false);
    expect(result.current.user).toBeNull();
    expect(result.current.error).toBeNull();
    expect(result.current.isLoading).toBe(false);
  });

  it('should return authenticated state when user is logged in', () => {
    store.dispatch(
      setCredentials({
        user: mockUser,
        accessToken: 'access-token',
        refreshToken: 'refresh-token',
      })
    );

    const { result } = renderHook(() => useAuth(), { wrapper });

    expect(result.current.isAuthenticated).toBe(true);
    expect(result.current.user).toEqual(mockUser);
    expect(result.current.error).toBeNull();
  });

  it('should provide login function', () => {
    const { result } = renderHook(() => useAuth(), { wrapper });

    expect(typeof result.current.login).toBe('function');
  });

  it('should provide logout function', () => {
    const { result } = renderHook(() => useAuth(), { wrapper });

    expect(typeof result.current.logout).toBe('function');
  });

  it('should provide refreshToken function', () => {
    const { result } = renderHook(() => useAuth(), { wrapper });

    expect(typeof result.current.refreshToken).toBe('function');
  });

  it('should provide clearError function', () => {
    store.dispatch(
      setCredentials({
        user: mockUser,
        accessToken: 'access-token',
        refreshToken: 'refresh-token',
      })
    );

    const { result } = renderHook(() => useAuth(), { wrapper });

    expect(typeof result.current.clearError).toBe('function');
    
    // Test clearError
    result.current.clearError();
    expect(store.getState().auth.error).toBeNull();
  });

  it('should return loading state correctly', () => {
    const { result } = renderHook(() => useAuth(), { wrapper });

    expect(result.current.isLoading).toBe(false);
    expect(result.current.isLoggingIn).toBe(false);
    expect(result.current.isLoggingOut).toBe(false);
    expect(result.current.isRefreshing).toBe(false);
  });
});
