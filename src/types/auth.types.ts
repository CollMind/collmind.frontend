import { UserRole } from './user.types';

export interface LoginDto {
  email: string;
  password: string;
  ipAddress?: string;
}

export interface LoginResponse {
  accessToken: string;
  refreshToken: string;
  user: {
    id: string;
    email: string;
    fullName: string;
    role: UserRole;
    tenantId: string;
  };
}

