import { useMutation, useQueryClient } from '@tanstack/react-query';
import { authEndpoints } from '@/api/endpoints/auth.endpoints';
import { LoginDto } from '@/types/auth.types';
import { setCredentials, logout, setError } from '@/store/slices/auth.slice';
import { useAppDispatch } from '@/store/hooks';
import { useNavigate } from 'react-router-dom';

/**
 * Login hook - Kullanıcı girişi için
 * 
 * @example
 * ```tsx
 * const loginMutation = useLogin();
 * await loginMutation.mutateAsync({ email: 'user@example.com', password: 'password123' });
 * ```
 */
export function useLogin() {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: LoginDto) =>
      authEndpoints.login(data).then((res) => res.data),
    onSuccess: (data) => {
      dispatch(
        setCredentials({
          user: data.user as any,
          accessToken: data.accessToken,
          refreshToken: data.refreshToken,
        })
      );
      queryClient.invalidateQueries({ queryKey: ['user', 'me'] });
      navigate('/dashboard');
    },
    onError: (error: any) => {
      const errorMessage =
        error?.response?.data?.message ||
        error?.message ||
        'Giriş yapılırken bir hata oluştu. Lütfen tekrar deneyin.';
      dispatch(setError(errorMessage));
    },
  });
}

/**
 * Logout hook - Kullanıcı çıkışı için
 * 
 * @example
 * ```tsx
 * const logoutMutation = useLogout();
 * await logoutMutation.mutateAsync();
 * ```
 */
export function useLogout() {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();

  return useMutation({
    mutationFn: () => authEndpoints.logout().then((res) => res.data),
    onSuccess: () => {
      dispatch(logout());
      navigate('/login');
    },
    onError: () => {
      // Even if logout fails, clear local state
      dispatch(logout());
      navigate('/login');
    },
  });
}

/**
 * Refresh token hook - Access token yenileme için
 * 
 * @example
 * ```tsx
 * const refreshMutation = useRefreshToken();
 * await refreshMutation.mutateAsync();
 * ```
 */
export function useRefreshToken() {
  const dispatch = useAppDispatch();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      const refreshToken = localStorage.getItem('refreshToken');
      if (!refreshToken) {
        throw new Error('No refresh token available');
      }
      const response = await authEndpoints.refresh(refreshToken);
      return response.data;
    },
    onSuccess: (data) => {
      dispatch(
        setCredentials({
          user: data.user as any,
          accessToken: data.accessToken,
          refreshToken: data.refreshToken,
        })
      );
      queryClient.invalidateQueries({ queryKey: ['user', 'me'] });
    },
    onError: (error: any) => {
      // Refresh token geçersizse logout yap
      dispatch(logout());
      if (window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
    },
  });
}
