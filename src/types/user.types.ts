export enum UserRole {
  ADMIN = 'ADMIN',
  PLANNER = 'PLANNER',
  APPROVER = 'APPROVER',
  FINANCE = 'FINANCE',
  FINANCE_MANAGER = 'FINANCE_MANAGER',
  CATEGORY_MANAGER = 'CATEGORY_MANAGER',
}

export enum UserStatus {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
  PENDING = 'PENDING',
  LOCKED = 'LOCKED',
}

export interface User {
  id: string;
  email: string;
  role: UserRole;
  status: UserStatus;
  fullName: string;
  firstName?: string;
  lastName?: string;
  phoneNumber?: string;
  department?: string;
  jobTitle?: string;
  tenantId: string;
  lastLoginAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateUserDto {
  email: string;
  password: string;
  fullName: string;
  firstName?: string;
  lastName?: string;
  role: UserRole;
  status?: UserStatus;
  phoneNumber?: string;
  department?: string;
  jobTitle?: string;
  mustChangePassword?: boolean;
  permissions?: string[];
}

export interface UpdateUserDto {
  fullName?: string;
  firstName?: string;
  lastName?: string;
  phoneNumber?: string;
  department?: string;
  jobTitle?: string;
}

export interface ChangePasswordDto {
  currentPassword?: string; // Optional for admin changing user's password
  newPassword: string;
}

