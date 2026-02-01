import { describe, it, expect, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter } from 'react-router-dom';
import { Provider } from 'react-redux';
import React from 'react';
import { store } from '@/store';
import {
  useUsers,
  useUser,
  useMe,
  useCreateUser,
  useUpdateUser,
  useDeleteUser,
  useActivateUser,
  useDeactivateUser,
  useUpdateProfile,
  useChangeMyPassword,
  useChangeUserPassword,
} from '@/services/users.service';
import { UserRole, UserStatus } from '@/types/user.types';
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

describe('Users Service', () => {
  beforeEach(() => {
    queryClient.clear();
  });

  describe('useUsers', () => {
    it('should fetch users list', async () => {
      const { result } = renderHook(() => useUsers(), { wrapper });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toBeDefined();
      expect(Array.isArray(result.current.data)).toBe(true);
      if (result.current.data && result.current.data.length > 0) {
        expect(result.current.data[0]).toHaveProperty('id');
        expect(result.current.data[0]).toHaveProperty('email');
      }
    });
  });

  describe('useUser', () => {
    it('should fetch user by id', async () => {
      const { result } = renderHook(() => useUser('1'), { wrapper });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toBeDefined();
      expect(result.current.data?.id).toBe('1');
    });
  });

  describe('useMe', () => {
    it('should fetch current user', async () => {
      const { result } = renderHook(() => useMe(), { wrapper });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toBeDefined();
      expect(result.current.data?.id).toBe('1');
    });
  });

  describe('useCreateUser', () => {
    it('should create a new user', async () => {
      const { result } = renderHook(() => useCreateUser(), { wrapper });

      await result.current.mutateAsync({
        email: 'newuser@example.com',
        password: 'password123',
        fullName: 'New User',
        role: UserRole.PLANNER,
        status: UserStatus.ACTIVE,
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toBeDefined();
      expect(result.current.data?.email).toBe('newuser@example.com');
    });
  });

  describe('useUpdateUser', () => {
    it('should update user', async () => {
      const { result } = renderHook(() => useUpdateUser(), { wrapper });

      await result.current.mutateAsync({
        id: '1',
        data: {
          fullName: 'Updated User',
          department: 'IT',
        },
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toBeDefined();
    });
  });

  describe('useUpdateProfile', () => {
    it('should update current user profile', async () => {
      const { result } = renderHook(() => useUpdateProfile(), { wrapper });

      await result.current.mutateAsync({
        fullName: 'Updated Profile',
        department: 'Sales',
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toBeDefined();
    });
  });

  describe('useDeleteUser', () => {
    it('should delete user', async () => {
      const { result } = renderHook(() => useDeleteUser(), { wrapper });

      await result.current.mutateAsync('1');

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });
    });
  });

  describe('useActivateUser', () => {
    it('should activate user', async () => {
      const { result } = renderHook(() => useActivateUser(), { wrapper });

      await result.current.mutateAsync('1');

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data?.status).toBe(UserStatus.ACTIVE);
    });
  });

  describe('useDeactivateUser', () => {
    it('should deactivate user', async () => {
      const { result } = renderHook(() => useDeactivateUser(), { wrapper });

      await result.current.mutateAsync('1');

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data?.status).toBe(UserStatus.INACTIVE);
    });
  });

  describe('useChangeMyPassword', () => {
    it('should change current user password', async () => {
      const { result } = renderHook(() => useChangeMyPassword(), { wrapper });

      await result.current.mutateAsync({
        currentPassword: 'old-password',
        newPassword: 'new-password123',
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });
    });

    it('should handle wrong current password', async () => {
      server.use(
        http.patch('http://localhost:3000/users/me/password', async ({ request }) => {
          const body = await request.json() as any;
          if (body.currentPassword === 'wrong-password') {
            return HttpResponse.json(
              { message: 'Mevcut şifre hatalı' },
              { status: 400 }
            );
          }
          return new HttpResponse(null, { status: 204 });
        })
      );

      const { result } = renderHook(() => useChangeMyPassword(), { wrapper });

      await expect(
        result.current.mutateAsync({
          currentPassword: 'wrong-password',
          newPassword: 'new-password123',
        })
      ).rejects.toThrow();
    });
  });

  describe('useChangeUserPassword', () => {
    it('should change user password (admin)', async () => {
      const { result } = renderHook(() => useChangeUserPassword(), { wrapper });

      await result.current.mutateAsync({
        id: '1',
        data: {
          currentPassword: 'old-password',
          newPassword: 'new-password123',
        },
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });
    });
  });
});
