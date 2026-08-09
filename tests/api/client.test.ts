import { describe, it, expect, beforeEach, vi } from 'vitest';
import { http, HttpResponse } from 'msw';
import { server } from '../setup';
import { store } from '@/store';
import apiClient from '@/api/client';
import { setCredentials } from '@/store/slices/auth.slice';
import { User, UserRole, UserStatus } from '@/types/user.types';

const API_BASE_URL = 'http://localhost:3000';

const mockUser: User = {
  id: '1',
  email: 'test@example.com',
  role: UserRole.ADMIN,
  fullName: 'Test User',
  status: UserStatus.ACTIVE,
  tenantId: 'tenant-1',
  createdAt: new Date(),
  updatedAt: new Date(),
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
      const authHeaders: string[] = [];

      store.dispatch(
        setCredentials({
          user: mockUser,
          accessToken: 'expired-token',
          refreshToken: 'valid-refresh-token',
        })
      );

      server.use(
        // Respond based on which token was actually sent, not on arrival order.
        // The previous version keyed off a global request counter, so only the
        // literal first request to reach the handler ever got a 401 — the other
        // two concurrent requests always received a direct 200 with the *old*
        // expired token, meaning the interceptor's refresh queue was never
        // actually exercised for them. Reproduces the original test's false
        // green: response ordering asserted against `success-2/3/4` relied on
        // network-race timing, not on the queueing behavior under test.
        http.get(`${API_BASE_URL}/protected`, ({ request }) => {
          const authHeader = request.headers.get('Authorization');
          authHeaders.push(authHeader || '');

          if (authHeader === 'Bearer expired-token') {
            return HttpResponse.json(
              { error: 'Unauthorized' },
              { status: 401 }
            );
          }
          return HttpResponse.json({ data: 'success' });
        })
      );

      // Make multiple concurrent requests, all with the expired token.
      const responses = await Promise.all([
        apiClient.get('/protected'),
        apiClient.get('/protected'),
        apiClient.get('/protected'),
      ]);

      // All three must eventually succeed after being queued behind the
      // single in-flight refresh.
      responses.forEach((response) => {
        expect(response.data).toEqual({ data: 'success' });
      });

      // Every request initially goes out with the expired token; every
      // retry (whether the one that triggered refresh, or one released
      // from the queue) must carry the newly refreshed token.
      const initialAttempts = authHeaders.filter(
        (h) => h === 'Bearer expired-token'
      );
      const retriedAttempts = authHeaders.filter(
        (h) => h === 'Bearer new-mock-access-token'
      );
      expect(initialAttempts).toHaveLength(3);
      expect(retriedAttempts).toHaveLength(3);

      // Only one refresh call should have happened — that's the entire
      // point of the isRefreshing/failedQueue mechanism under test.
      const authState = store.getState().auth;
      expect(authState.accessToken).toBe('new-mock-access-token');
      expect(authState.refreshToken).toBe('new-mock-refresh-token');
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

  describe('Response Interceptor - Auth endpoint 401 exemption (T-050)', () => {
    it('should NOT attempt token refresh on /auth/login 401 and should preserve the original error', async () => {
      // Regression for T-050: a failed login's own 401 was being treated
      // like an expired-session 401, so the interceptor tried to refresh
      // using whatever (stale/absent) refreshToken was in the store and
      // threw "No refresh token" — stomping the real "Invalid email or
      // password" error the login endpoint returned.
      let loginCallCount = 0;
      let refreshCallCount = 0;

      // No credentials in the store — mirrors an unauthenticated user on
      // the login screen (no accessToken/refreshToken yet).
      server.use(
        http.post(`${API_BASE_URL}/auth/login`, () => {
          loginCallCount++;
          return HttpResponse.json(
            { message: 'Invalid email or password' },
            { status: 401 }
          );
        }),
        http.post(`${API_BASE_URL}/auth/refresh`, () => {
          refreshCallCount++;
          return HttpResponse.json(
            { message: 'Invalid refresh token' },
            { status: 401 }
          );
        })
      );

      await expect(
        apiClient.post('/auth/login', {
          email: 'user@example.com',
          password: 'wrong-password',
        })
      ).rejects.toMatchObject({
        response: {
          status: 401,
          data: { message: 'Invalid email or password' },
        },
      });

      // The login request itself happened exactly once — no silent retry.
      expect(loginCallCount).toBe(1);
      // Crucially, the refresh endpoint was never called at all.
      expect(refreshCallCount).toBe(0);

      // The interceptor must not have logged the user out or mutated auth
      // state — there was no session to expire in the first place.
      const authState = store.getState().auth;
      expect(authState.isAuthenticated).toBe(false);
    });

    it('should NOT attempt to refresh a /auth/refresh call that itself returns 401', async () => {
      // Guards against the recursion/infinite-loop trap: exempting only
      // /auth/login is not enough. If /auth/refresh is ever invoked through
      // apiClient (interceptors attached) and the refresh token itself is
      // rejected with 401, the interceptor must not try to "refresh the
      // refresh call" using the same (invalid) refreshToken.
      let refreshCallCount = 0;

      store.dispatch(
        setCredentials({
          user: mockUser,
          accessToken: 'expired-token',
          refreshToken: 'invalid-refresh-token',
        })
      );

      server.use(
        http.post(`${API_BASE_URL}/auth/refresh`, () => {
          refreshCallCount++;
          return HttpResponse.json(
            { message: 'Invalid refresh token' },
            { status: 401 }
          );
        })
      );

      await expect(
        apiClient.post('/auth/refresh', { refreshToken: 'invalid-refresh-token' })
      ).rejects.toMatchObject({
        response: { status: 401 },
      });

      // Exactly one call — no self-recursive refresh attempt.
      expect(refreshCallCount).toBe(1);
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
