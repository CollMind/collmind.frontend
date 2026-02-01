import { describe, it, expect, beforeEach } from 'vitest';
import {
  setAccessToken,
  getAccessToken,
  setRefreshToken,
  getRefreshToken,
  setUser,
  getUser,
  clearTokens,
  hasTokens,
  setAuthData,
  getAuthData,
} from '@/utils/tokenStorage';

describe('tokenStorage', () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
  });

  describe('Access Token', () => {
    it('should set and get access token from localStorage', () => {
      setAccessToken('test-access-token');
      expect(getAccessToken()).toBe('test-access-token');
      expect(localStorage.getItem('accessToken')).toBe('test-access-token');
    });

    it('should set and get access token from sessionStorage', () => {
      setAccessToken('test-access-token', { storageType: 'sessionStorage' });
      expect(getAccessToken({ storageType: 'sessionStorage' })).toBe('test-access-token');
      expect(sessionStorage.getItem('accessToken')).toBe('test-access-token');
    });
  });

  describe('Refresh Token', () => {
    it('should set and get refresh token from localStorage', () => {
      setRefreshToken('test-refresh-token');
      expect(getRefreshToken()).toBe('test-refresh-token');
      expect(localStorage.getItem('refreshToken')).toBe('test-refresh-token');
    });

    it('should set and get refresh token from sessionStorage', () => {
      setRefreshToken('test-refresh-token', { storageType: 'sessionStorage' });
      expect(getRefreshToken({ storageType: 'sessionStorage' })).toBe('test-refresh-token');
      expect(sessionStorage.getItem('refreshToken')).toBe('test-refresh-token');
    });
  });

  describe('User', () => {
    const mockUser = {
      id: '1',
      email: 'test@example.com',
      role: 'ADMIN',
    };

    it('should set and get user from localStorage', () => {
      setUser(mockUser);
      expect(getUser()).toEqual(mockUser);
      expect(JSON.parse(localStorage.getItem('user')!)).toEqual(mockUser);
    });

    it('should set and get user from sessionStorage', () => {
      setUser(mockUser, { storageType: 'sessionStorage' });
      expect(getUser({ storageType: 'sessionStorage' })).toEqual(mockUser);
      expect(JSON.parse(sessionStorage.getItem('user')!)).toEqual(mockUser);
    });

    it('should return null when user does not exist', () => {
      expect(getUser()).toBeNull();
    });
  });

  describe('clearTokens', () => {
    it('should clear all tokens from localStorage', () => {
      setAccessToken('token');
      setRefreshToken('refresh');
      setUser({ id: '1' });

      clearTokens();

      expect(getAccessToken()).toBeNull();
      expect(getRefreshToken()).toBeNull();
      expect(getUser()).toBeNull();
    });

    it('should clear all tokens from sessionStorage', () => {
      setAccessToken('token', { storageType: 'sessionStorage' });
      setRefreshToken('refresh', { storageType: 'sessionStorage' });
      setUser({ id: '1' }, { storageType: 'sessionStorage' });

      clearTokens({ storageType: 'sessionStorage' });

      expect(getAccessToken({ storageType: 'sessionStorage' })).toBeNull();
      expect(getRefreshToken({ storageType: 'sessionStorage' })).toBeNull();
      expect(getUser({ storageType: 'sessionStorage' })).toBeNull();
    });
  });

  describe('hasTokens', () => {
    it('should return true when both tokens exist', () => {
      setAccessToken('token');
      setRefreshToken('refresh');
      expect(hasTokens()).toBe(true);
    });

    it('should return false when access token is missing', () => {
      setRefreshToken('refresh');
      expect(hasTokens()).toBe(false);
    });

    it('should return false when refresh token is missing', () => {
      setAccessToken('token');
      expect(hasTokens()).toBe(false);
    });

    it('should return false when both tokens are missing', () => {
      expect(hasTokens()).toBe(false);
    });
  });

  describe('setAuthData and getAuthData', () => {
    const mockAuthData = {
      accessToken: 'access-token',
      refreshToken: 'refresh-token',
      user: {
        id: '1',
        email: 'test@example.com',
      },
    };

    it('should set and get all auth data', () => {
      setAuthData(mockAuthData);
      const data = getAuthData();

      expect(data.accessToken).toBe('access-token');
      expect(data.refreshToken).toBe('refresh-token');
      expect(data.user).toEqual(mockAuthData.user);
    });

    it('should work with sessionStorage', () => {
      setAuthData(mockAuthData, { storageType: 'sessionStorage' });
      const data = getAuthData({ storageType: 'sessionStorage' });

      expect(data.accessToken).toBe('access-token');
      expect(data.refreshToken).toBe('refresh-token');
      expect(data.user).toEqual(mockAuthData.user);
    });
  });
});
