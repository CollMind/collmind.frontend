import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { ProtectedRoute } from '@/components/layout/ProtectedRoute';
import authReducer from '@/store/slices/auth.slice';
import { User } from '@/types/user.types';

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
    });

    render(
      <Provider store={store}>
        <BrowserRouter>
          <ProtectedRoute>
            <div>Protected Content</div>
          </ProtectedRoute>
        </BrowserRouter>
      </Provider>
    );

    // Should redirect, so protected content should not be visible
    expect(screen.queryByText('Protected Content')).not.toBeInTheDocument();
  });

  it('renders children when authenticated', () => {
    const store = createMockStore({
      isAuthenticated: true,
      user: mockUser,
    });

    render(
      <Provider store={store}>
        <BrowserRouter>
          <ProtectedRoute>
            <div>Protected Content</div>
          </ProtectedRoute>
        </BrowserRouter>
      </Provider>
    );

    expect(screen.getByText('Protected Content')).toBeInTheDocument();
  });

  it('allows access when user has required role', () => {
    const store = createMockStore({
      isAuthenticated: true,
      user: mockUser,
    });

    render(
      <Provider store={store}>
        <BrowserRouter>
          <ProtectedRoute requiredRole={['ADMIN']}>
            <div>Admin Content</div>
          </ProtectedRoute>
        </BrowserRouter>
      </Provider>
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
    });

    render(
      <Provider store={store}>
        <BrowserRouter>
          <ProtectedRoute requiredRole={['ADMIN']}>
            <div>Admin Content</div>
          </ProtectedRoute>
        </BrowserRouter>
      </Provider>
    );

    // Should redirect, so content should not be visible
    expect(screen.queryByText('Admin Content')).not.toBeInTheDocument();
  });
});

