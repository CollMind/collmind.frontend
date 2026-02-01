import { describe, it, expect, beforeEach } from 'vitest';
import authReducer, {
  setCredentials,
  logout,
  setLoading,
  setError,
  clearError,
} from '@/store/slices/auth.slice';
import { User } from '@/types/user.types';

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

describe('authSlice', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('should return initial state', () => {
    const state = authReducer(undefined, { type: 'unknown' });
    expect(state.isAuthenticated).toBe(false);
    expect(state.user).toBeNull();
    expect(state.accessToken).toBeNull();
  });

  it('should handle setCredentials', () => {
    const credentials = {
      user: mockUser,
      accessToken: 'access-token',
      refreshToken: 'refresh-token',
    };

    const state = authReducer(undefined, setCredentials(credentials));

    expect(state.user).toEqual(mockUser);
    expect(state.accessToken).toBe('access-token');
    expect(state.refreshToken).toBe('refresh-token');
    expect(state.isAuthenticated).toBe(true);
    expect(localStorage.getItem('accessToken')).toBe('access-token');
    expect(localStorage.getItem('refreshToken')).toBe('refresh-token');
  });

  it('should handle logout', () => {
    const initialState = {
      user: mockUser,
      accessToken: 'access-token',
      refreshToken: 'refresh-token',
      isAuthenticated: true,
      isLoading: false,
    };

    localStorage.setItem('accessToken', 'access-token');
    localStorage.setItem('refreshToken', 'refresh-token');
    localStorage.setItem('user', JSON.stringify(mockUser));

    const state = authReducer(initialState, logout());

    expect(state.user).toBeNull();
    expect(state.accessToken).toBeNull();
    expect(state.refreshToken).toBeNull();
    expect(state.isAuthenticated).toBe(false);
    expect(localStorage.getItem('accessToken')).toBeNull();
    expect(localStorage.getItem('refreshToken')).toBeNull();
  });

  it('should handle setLoading', () => {
    const state = authReducer(undefined, setLoading(true));
    expect(state.isLoading).toBe(true);

    const newState = authReducer(state, setLoading(false));
    expect(newState.isLoading).toBe(false);
  });

  it('should handle setError', () => {
    const state = authReducer(undefined, setError('Test error message'));
    expect(state.error).toBe('Test error message');
  });

  it('should handle clearError', () => {
    const stateWithError = authReducer(undefined, setError('Test error'));
    expect(stateWithError.error).toBe('Test error');

    const stateCleared = authReducer(stateWithError, clearError());
    expect(stateCleared.error).toBeNull();
  });

  it('should clear error on setCredentials', () => {
    const stateWithError = authReducer(undefined, setError('Test error'));
    expect(stateWithError.error).toBe('Test error');

    const credentials = {
      user: mockUser,
      accessToken: 'access-token',
      refreshToken: 'refresh-token',
    };

    const state = authReducer(stateWithError, setCredentials(credentials));
    expect(state.error).toBeNull();
  });

  it('should clear error on logout', () => {
    const stateWithError = authReducer(undefined, setError('Test error'));
    expect(stateWithError.error).toBe('Test error');

    const state = authReducer(stateWithError, logout());
    expect(state.error).toBeNull();
  });
});

