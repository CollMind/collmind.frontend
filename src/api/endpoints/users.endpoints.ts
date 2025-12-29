import apiClient from '../client';
import {
  User,
  CreateUserDto,
  UpdateUserDto,
  ChangePasswordDto,
} from '@/types/user.types';

export const userEndpoints = {
  getAll: () => apiClient.get<User[]>('/users'),

  getById: (id: string) => apiClient.get<User>(`/users/${id}`),

  getMe: () => apiClient.get<User>('/users/me'),

  create: (data: CreateUserDto) => apiClient.post<User>('/users', data),

  update: (id: string, data: UpdateUserDto) =>
    apiClient.patch<User>(`/users/${id}`, data),

  updateMe: (data: UpdateUserDto) => apiClient.patch<User>('/users/me', data),

  changePassword: (id: string, data: ChangePasswordDto) =>
    apiClient.patch(`/users/${id}/password`, data),

  changeMyPassword: (data: ChangePasswordDto) =>
    apiClient.patch('/users/me/password', data),

  activate: (id: string) => apiClient.post<User>(`/users/${id}/activate`),

  deactivate: (id: string) => apiClient.post<User>(`/users/${id}/deactivate`),

  delete: (id: string) => apiClient.delete(`/users/${id}`),
};

