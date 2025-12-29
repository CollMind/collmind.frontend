import { useMutation, useQueryClient } from '@tanstack/react-query';
import { authEndpoints } from '@/api/endpoints/auth.endpoints';
import { LoginDto } from '@/types/auth.types';
import { setCredentials, logout } from '@/store/slices/auth.slice';
import { useAppDispatch } from '@/store/hooks';
import { useNavigate } from 'react-router-dom';

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
  });
}

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

