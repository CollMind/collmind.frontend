import { useCallback } from 'react';
import { useAppSelector, useAppDispatch } from '@/store/hooks';
import { useLogin, useLogout, useRefreshToken } from '@/services/auth.service';
import { clearError } from '@/store/slices/auth.slice';
import { LoginDto } from '@/types/auth.types';

/**
 * Authentication hook - Merkezi auth yönetimi için
 * 
 * @example
 * ```tsx
 * const { login, logout, isAuthenticated, user, error, clearError } = useAuth();
 * 
 * await login({ email: 'user@example.com', password: 'password123' });
 * ```
 */
export function useAuth() {
  const dispatch = useAppDispatch();
  const { user, isAuthenticated, error, isLoading } = useAppSelector(
    (state) => state.auth
  );

  const loginMutation = useLogin();
  const logoutMutation = useLogout();
  const refreshTokenMutation = useRefreshToken();

  const login = useCallback(
    async (credentials: LoginDto) => {
      return loginMutation.mutateAsync(credentials);
    },
    [loginMutation]
  );

  const logout = useCallback(async () => {
    return logoutMutation.mutateAsync();
  }, [logoutMutation]);

  const refreshToken = useCallback(async () => {
    return refreshTokenMutation.mutateAsync();
  }, [refreshTokenMutation]);

  const handleClearError = useCallback(() => {
    dispatch(clearError());
  }, [dispatch]);

  return {
    // State
    user,
    isAuthenticated,
    error,
    isLoading: isLoading || loginMutation.isPending || logoutMutation.isPending,
    
    // Actions
    login,
    logout,
    refreshToken,
    clearError: handleClearError,
    
    // Mutation states
    isLoggingIn: loginMutation.isPending,
    isLoggingOut: logoutMutation.isPending,
    isRefreshing: refreshTokenMutation.isPending,
  };
}
