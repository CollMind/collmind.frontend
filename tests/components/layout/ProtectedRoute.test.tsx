import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';
import { ProtectedRoute } from '@/components/layout/ProtectedRoute';
import authReducer from '@/store/slices/auth.slice';
import { User } from '@/types/user.types';
import { http, HttpResponse } from 'msw';
import { server } from '../../setup';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: false },
  },
});

const createMockStore = (authState: any) => {
  return configureStore({
    reducer: {
      auth: authReducer,
    },
    preloadedState: {
      auth: authState,
    },
  });
};

// IMPORTANT (see T-040): `ui` must be rendered *inside* a `<Routes>` tree
// with sibling routes for every path ProtectedRoute can redirect to
// (`/login`, `/dashboard`), not as a bare child of `<BrowserRouter>`.
// ProtectedRoute unconditionally renders `<Navigate>` while its redirect
// condition holds; in real usage that's fine because the route-matched
// element (ProtectedRoute) is naturally swapped out for the `/login`
// route's element once the URL changes. Rendered bare, nothing ever
// "consumes" the navigation — ProtectedRoute keeps being the thing that's
// mounted, keeps seeing the same unauthenticated state, and keeps calling
// `<Navigate>` again on every resulting render. That produced a genuine
// infinite render/navigation loop that pegged a CPU core and hung the
// entire vitest worker process indefinitely (reproduced consistently,
// unrelated to any mocking — see T-040 report for the full trace).
const renderWithProviders = (ui: React.ReactElement, store: any) => {
  // MemoryRouter (not BrowserRouter): BrowserRouter drives the real,
  // process-wide jsdom `window.history`/`window.location`, which persists
  // across tests within the same file — a prior test's redirect to
  // `/login` would leak into the next test's initial URL. MemoryRouter
  // gives every render() call its own isolated in-memory history starting
  // at `/`, matching real per-navigation isolation (see T-040).
  return render(
    <Provider store={store}>
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={['/']}>
          <Routes>
            <Route path="/login" element={<div>Login Page</div>} />
            <Route path="/dashboard" element={<div>Dashboard Page</div>} />
            <Route path="*" element={ui} />
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>
    </Provider>
  );
};

describe('ProtectedRoute', () => {
  const mockUser: User = {
    id: '1',
    email: 'test@example.com',
    role: 'ADMIN',
    firstName: 'Test',
    lastName: 'User',
    status: 'ACTIVE',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  it('redirects to login when not authenticated', () => {
    const store = createMockStore({
      isAuthenticated: false,
      user: null,
      accessToken: null,
    });

    renderWithProviders(
      <ProtectedRoute>
        <div>Protected Content</div>
      </ProtectedRoute>,
      store
    );

    // Should redirect, so protected content should not be visible
    expect(screen.queryByText('Protected Content')).not.toBeInTheDocument();
  });

  it('renders children when authenticated', () => {
    const store = createMockStore({
      isAuthenticated: true,
      user: mockUser,
      accessToken: 'access-token',
    });

    renderWithProviders(
      <ProtectedRoute>
        <div>Protected Content</div>
      </ProtectedRoute>,
      store
    );

    expect(screen.getByText('Protected Content')).toBeInTheDocument();
  });

  it('should fetch user when token exists but user is missing (page refresh scenario)', async () => {
    const store = createMockStore({
      isAuthenticated: false,
      user: null,
      accessToken: 'access-token',
    });

    renderWithProviders(
      <ProtectedRoute>
        <div>Protected Content</div>
      </ProtectedRoute>,
      store
    );

    // Should show loading initially, then fetch user and show content
    await waitFor(() => {
      expect(screen.getByText('Protected Content')).toBeInTheDocument();
    });

    // Verify user was fetched and stored
    const finalState = store.getState();
    expect(finalState.auth.user).toBeTruthy();
    expect(finalState.auth.isAuthenticated).toBe(true);
  });

  it('should logout when token is invalid after page refresh', async () => {
    // Mock /users/me to return 401
    server.use(
      http.get('http://localhost:3000/users/me', () => {
        return HttpResponse.json(
          { message: 'Unauthorized' },
          { status: 401 }
        );
      })
    );

    const store = createMockStore({
      isAuthenticated: false,
      user: null,
      accessToken: 'invalid-token',
    });

    renderWithProviders(
      <ProtectedRoute>
        <div>Protected Content</div>
      </ProtectedRoute>,
      store
    );

    // Should logout and redirect
    await waitFor(() => {
      const finalState = store.getState();
      expect(finalState.auth.isAuthenticated).toBe(false);
      expect(finalState.auth.accessToken).toBeNull();
    });

    // Protected content should not be visible
    expect(screen.queryByText('Protected Content')).not.toBeInTheDocument();
  });

  it('allows access when user has required role', () => {
    const store = createMockStore({
      isAuthenticated: true,
      user: mockUser,
      accessToken: 'access-token',
    });

    renderWithProviders(
      <ProtectedRoute requiredRole={['ADMIN']}>
        <div>Admin Content</div>
      </ProtectedRoute>,
      store
    );

    expect(screen.getByText('Admin Content')).toBeInTheDocument();
  });

  it('redirects when user does not have required role', () => {
    const plannerUser: User = {
      ...mockUser,
      role: 'PLANNER',
    };

    const store = createMockStore({
      isAuthenticated: true,
      user: plannerUser,
      accessToken: 'access-token',
    });

    renderWithProviders(
      <ProtectedRoute requiredRole={['ADMIN']}>
        <div>Admin Content</div>
      </ProtectedRoute>,
      store
    );

    // Should redirect, so content should not be visible
    expect(screen.queryByText('Admin Content')).not.toBeInTheDocument();
  });

  it('allows ADMIN access to PLANNER-only routes', () => {
    const store = createMockStore({
      isAuthenticated: true,
      user: mockUser, // ADMIN role
      accessToken: 'access-token',
    });

    renderWithProviders(
      <ProtectedRoute requiredRole={['PLANNER']}>
        <div>Planner Content</div>
      </ProtectedRoute>,
      store
    );

    // Admin should have access to Planner routes
    expect(screen.getByText('Planner Content')).toBeInTheDocument();
  });

  it('allows ADMIN access to APPROVER-only routes', () => {
    const store = createMockStore({
      isAuthenticated: true,
      user: mockUser, // ADMIN role
      accessToken: 'access-token',
    });

    renderWithProviders(
      <ProtectedRoute requiredRole={['APPROVER']}>
        <div>Approver Content</div>
      </ProtectedRoute>,
      store
    );

    // Admin should have access to Approver routes
    expect(screen.getByText('Approver Content')).toBeInTheDocument();
  });

  it('allows ADMIN access to FINANCE-only routes', () => {
    const store = createMockStore({
      isAuthenticated: true,
      user: mockUser, // ADMIN role
      accessToken: 'access-token',
    });

    renderWithProviders(
      <ProtectedRoute requiredRole={['FINANCE']}>
        <div>Finance Content</div>
      </ProtectedRoute>,
      store
    );

    // Admin should have access to Finance routes
    expect(screen.getByText('Finance Content')).toBeInTheDocument();
  });

  it('allows ADMIN access to multiple role routes', () => {
    const store = createMockStore({
      isAuthenticated: true,
      user: mockUser, // ADMIN role
      accessToken: 'access-token',
    });

    renderWithProviders(
      <ProtectedRoute requiredRole={['PLANNER', 'APPROVER']}>
        <div>Multi-Role Content</div>
      </ProtectedRoute>,
      store
    );

    // Admin should have access to routes requiring any role
    expect(screen.getByText('Multi-Role Content')).toBeInTheDocument();
  });
});

