import apiClient from '../client';
import { LoginDto, LoginResponse } from '@/types/auth.types';

export const authEndpoints = {
  login: (data: LoginDto) =>
    apiClient.post<LoginResponse>('/auth/login', data),

  refresh: (refreshToken: string) =>
    apiClient.post<LoginResponse>('/auth/refresh', { refreshToken }),

  logout: () => apiClient.post('/auth/logout'),
};

