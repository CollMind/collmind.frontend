import { describe, it, expect, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter } from 'react-router-dom';
import { Provider } from 'react-redux';
import React from 'react';
import { store } from '@/store';
import { useLogin, useLogout, useRefreshToken } from '@/services/auth.service';
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

describe('useLogin', () => {
  beforeEach(() => {
    localStorage.clear();
    store.dispatch({ type: 'auth/logout' });
    queryClient.clear();
  });

  it('should login successfully with valid credentials', async () => {
    const { result } = renderHook(() => useLogin(), { wrapper });

    await result.current.mutateAsync({
      email: 'test@example.com',
      password: 'password123',
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    const authState = store.getState().auth;
    expect(authState.isAuthenticated).toBe(true);
    expect(authState.accessToken).toBe('mock-access-token');
    expect(authState.refreshToken).toBe('mock-refresh-token');
  });

  it('should handle login error with invalid credentials', async () => {
    const { result } = renderHook(() => useLogin(), { wrapper });

    await expect(
      result.current.mutateAsync({
        email: 'invalid@example.com',
        password: 'wrongpassword',
      })
    ).rejects.toThrow();

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });

    const authState = store.getState().auth;
    expect(authState.error).toBeTruthy();
  });
});

describe('useLogout', () => {
  beforeEach(() => {
    localStorage.clear();
    queryClient.clear();
  });

  it('should logout successfully', async () => {
    // First login
    store.dispatch({
      type: 'auth/setCredentials',
      payload: {
        user: { id: '1', email: 'test@example.com' },
        accessToken: 'token',
        refreshToken: 'refresh',
      },
    });

    const { result } = renderHook(() => useLogout(), { wrapper });

    await result.current.mutateAsync();

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    const authState = store.getState().auth;
    expect(authState.isAuthenticated).toBe(false);
    expect(authState.accessToken).toBeNull();
  });

  it('should clear local state even if logout fails', async () => {
    // Mock logout endpoint to fail
    server.use(
      http.post('http://localhost:3000/auth/logout', () => {
        return HttpResponse.json({ error: 'Server error' }, { status: 500 });
      })
    );

    // First login
    store.dispatch({
      type: 'auth/setCredentials',
      payload: {
        user: { id: '1', email: 'test@example.com' },
        accessToken: 'token',
        refreshToken: 'refresh',
      },
    });

    const { result } = renderHook(() => useLogout(), { wrapper });

    // mutateAsync rejects (logout endpoint mocked to 500) — that's the
    // whole point of this test (onError still clears local state despite
    // the failure). The rejection must be caught here: `await
    // mutateAsync()` unguarded throws out of the test before the
    // assertions below ever run, and the resulting unhandled-rejection
    // window (a promise reject with no synchronously-attached handler)
    // is exactly the "AxiosError could not be cloned" worker-serialization
    // failure seen elsewhere in this suite (see T-040).
    await result.current.mutateAsync().catch(() => {});

    // Should still clear local state
    const authState = store.getState().auth;
    expect(authState.isAuthenticated).toBe(false);
  });
});

describe('useRefreshToken', () => {
  beforeEach(() => {
    localStorage.clear();
    queryClient.clear();
  });

  it('should refresh token successfully', async () => {
    localStorage.setItem('refreshToken', 'old-refresh-token');

    store.dispatch({
      type: 'auth/setCredentials',
      payload: {
        user: { id: '1', email: 'test@example.com' },
        accessToken: 'old-token',
        refreshToken: 'old-refresh-token',
      },
    });

    const { result } = renderHook(() => useRefreshToken(), { wrapper });

    await result.current.mutateAsync();

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    const authState = store.getState().auth;
    expect(authState.accessToken).toBe('new-mock-access-token');
    expect(authState.refreshToken).toBe('new-mock-refresh-token');
  });

  it('should handle refresh error when no refresh token', async () => {
    localStorage.removeItem('refreshToken');

    const { result } = renderHook(() => useRefreshToken(), { wrapper });

    await expect(result.current.mutateAsync()).rejects.toThrow();

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });
  });
});
