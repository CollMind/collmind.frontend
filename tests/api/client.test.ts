import { describe, it, expect, beforeEach, vi } from 'vitest';
import { http, HttpResponse } from 'msw';
import { server } from '../setup';
import { store } from '@/store';
import apiClient from '@/api/client';
import { setCredentials } from '@/store/slices/auth.slice';
import { User } from '@/types/user.types';

const API_BASE_URL = 'http://localhost:3000';

const mockUser: User = {
  id: '1',
  email: 'test@example.com',
  role: 'ADMIN',
  fullName: 'Test User',
  status: 'ACTIVE',
  tenantId: 'tenant-1',
  createdAt: new Date().toISOString() as any,
  updatedAt: new Date().toISOString() as any,
};

describe('API Client Interceptors', () => {
  beforeEach(() => {
    localStorage.clear();
    // Reset store state
    store.dispatch({ type: 'auth/logout' });
  });

  describe('Request Interceptor', () => {
    it('should add Authorization header when token exists', async () => {
      store.dispatch(
        setCredentials({
          user: mockUser,
          accessToken: 'test-access-token',
          refreshToken: 'test-refresh-token',
        })
      );

      server.use(
        http.get(`${API_BASE_URL}/test`, ({ request }) => {
          const authHeader = request.headers.get('Authorization');
          expect(authHeader).toBe('Bearer test-access-token');
          return HttpResponse.json({ success: true });
        })
      );

      await apiClient.get('/test');
    });

    it('should add x-tenant-id header when tenantId exists', async () => {
      store.dispatch(
        setCredentials({
          user: mockUser,
          accessToken: 'test-access-token',
          refreshToken: 'test-refresh-token',
        })
      );

      server.use(
        http.get(`${API_BASE_URL}/test`, ({ request }) => {
          const tenantHeader = request.headers.get('x-tenant-id');
          expect(tenantHeader).toBe('tenant-1');
          return HttpResponse.json({ success: true });
        })
      );

      await apiClient.get('/test');
    });
  });

  describe('Response Interceptor - Token Refresh', () => {
    it('should automatically refresh token on 401 and retry request', async () => {
      let requestCount = 0;
      const authHeaders: string[] = [];

      store.dispatch(
        setCredentials({
          user: mockUser,
          accessToken: 'expired-token',
          refreshToken: 'valid-refresh-token',
        })
      );

      server.use(
        http.get(`${API_BASE_URL}/protected`, ({ request }) => {
          requestCount++;
          const authHeader = request.headers.get('Authorization');
          authHeaders.push(authHeader || '');

          if (requestCount === 1) {
            // First request with expired token
            return HttpResponse.json(
              { error: 'Unauthorized' },
              { status: 401 }
            );
          } else {
            // Retry with new token
            return HttpResponse.json({ data: 'success' });
          }
        })
      );

      const response = await apiClient.get('/protected');

      expect(response.data).toEqual({ data: 'success' });
      expect(requestCount).toBe(2); // Original + retry
      expect(authHeaders[0]).toBe('Bearer expired-token');
      expect(authHeaders[1]).toBe('Bearer new-mock-access-token');
      
      // Verify new tokens are stored
      const authState = store.getState().auth;
      expect(authState.accessToken).toBe('new-mock-access-token');
      expect(authState.refreshToken).toBe('new-mock-refresh-token');
    });

    it('should queue multiple requests during token refresh', async () => {
      let requestCount = 0;
      const authHeaders: string[] = [];

      store.dispatch(
        setCredentials({
          user: mockUser,
          accessToken: 'expired-token',
          refreshToken: 'valid-refresh-token',
        })
      );

      server.use(
        http.get(`${API_BASE_URL}/protected`, ({ request }) => {
          requestCount++;
          const authHeader = request.headers.get('Authorization');
          authHeaders.push(authHeader || '');

          if (requestCount === 1) {
            return HttpResponse.json({ error: 'Unauthorized' }, { status: 401 });
          } else {
            return HttpResponse.json({ data: `success-${requestCount}` });
          }
        })
      );

      // Make multiple concurrent requests
      const [response1, response2, response3] = await Promise.all([
        apiClient.get('/protected'),
        apiClient.get('/protected'),
        apiClient.get('/protected'),
      ]);

      expect(response1.data.data).toBe('success-2');
      expect(response2.data.data).toBe('success-3');
      expect(response3.data.data).toBe('success-4');
      
      // Verify all retries used new token
      expect(authHeaders[1]).toBe('Bearer new-mock-access-token');
      expect(authHeaders[2]).toBe('Bearer new-mock-access-token');
      expect(authHeaders[3]).toBe('Bearer new-mock-access-token');
    });

    it('should logout when refresh token is invalid', async () => {
      store.dispatch(
        setCredentials({
          user: mockUser,
          accessToken: 'expired-token',
          refreshToken: 'invalid-refresh-token',
        })
      );

      // Mock refresh endpoint to fail
      server.use(
        http.get(`${API_BASE_URL}/protected`, () => {
          return HttpResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }),
        http.post(`${API_BASE_URL}/auth/refresh`, () => {
          return HttpResponse.json(
            { error: 'Invalid refresh token' },
            { status: 401 }
          );
        })
      );

      try {
        await apiClient.get('/protected');
        expect.fail('Should have thrown an error');
      } catch (error) {
        // Expected to throw
      }

      // Verify logout was called
      const authState = store.getState().auth;
      expect(authState.isAuthenticated).toBe(false);
      expect(authState.accessToken).toBeNull();
    });
  });

  describe('Response Interceptor - Error Handling', () => {
    it('should handle 403 Forbidden errors', async () => {
      store.dispatch(
        setCredentials({
          user: mockUser,
          accessToken: 'valid-token',
          refreshToken: 'valid-refresh-token',
        })
      );

      server.use(
        http.get(`${API_BASE_URL}/forbidden`, () => {
          return HttpResponse.json(
            { message: 'Access denied' },
            { status: 403 }
          );
        })
      );

      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      await expect(apiClient.get('/forbidden')).rejects.toThrow();

      expect(consoleSpy).toHaveBeenCalledWith(
        '403 Forbidden Error:',
        expect.objectContaining({
          status: 403,
        })
      );

      consoleSpy.mockRestore();
    });

    it('should handle network errors', async () => {
      store.dispatch(
        setCredentials({
          user: mockUser,
          accessToken: 'valid-token',
          refreshToken: 'valid-refresh-token',
        })
      );

      // Simulate network error
      server.use(
        http.get(`${API_BASE_URL}/network-error`, () => {
          return HttpResponse.error();
        })
      );

      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      await expect(apiClient.get('/network-error')).rejects.toThrow();

      expect(consoleSpy).toHaveBeenCalledWith(
        'Network Error:',
        expect.objectContaining({
          message: expect.any(String),
        })
      );

      consoleSpy.mockRestore();
    });

    it('should handle 500 Internal Server Error', async () => {
      store.dispatch(
        setCredentials({
          user: mockUser,
          accessToken: 'valid-token',
          refreshToken: 'valid-refresh-token',
        })
      );

      server.use(
        http.get(`${API_BASE_URL}/server-error`, () => {
          return HttpResponse.json(
            { message: 'Internal server error' },
            { status: 500 }
          );
        })
      );

      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      await expect(apiClient.get('/server-error')).rejects.toThrow();

      expect(consoleSpy).toHaveBeenCalledWith(
        '500 Internal Server Error:',
        expect.objectContaining({
          status: 500,
        })
      );

      consoleSpy.mockRestore();
    });
  });
});
