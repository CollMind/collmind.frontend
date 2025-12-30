import { describe, it, expect } from 'vitest';
import {
  createUserSchema,
  updateUserSchema,
  changePasswordSchema,
} from '@/schemas/user.schema';
import { UserRole, UserStatus } from '@/types/user.types';

describe('createUserSchema', () => {
  it('validates correct user data', () => {
    const validData = {
      email: 'test@example.com',
      password: 'password123',
      fullName: 'Test User',
      role: UserRole.ADMIN,
    };
    expect(() => createUserSchema.parse(validData)).not.toThrow();
  });

  it('rejects invalid email', () => {
    const invalidData = {
      email: 'invalid-email',
      password: 'password123',
      fullName: 'Test User',
      role: UserRole.ADMIN,
    };
    expect(() => createUserSchema.parse(invalidData)).toThrow();
  });

  it('rejects short password', () => {
    const invalidData = {
      email: 'test@example.com',
      password: 'short',
      fullName: 'Test User',
      role: UserRole.ADMIN,
    };
    expect(() => createUserSchema.parse(invalidData)).toThrow();
  });

  it('rejects short fullName', () => {
    const invalidData = {
      email: 'test@example.com',
      password: 'password123',
      fullName: 'A',
      role: UserRole.ADMIN,
    };
    expect(() => createUserSchema.parse(invalidData)).toThrow();
  });

  it('accepts optional fields', () => {
    const validData = {
      email: 'test@example.com',
      password: 'password123',
      fullName: 'Test User',
      role: UserRole.ADMIN,
      status: UserStatus.ACTIVE,
      phoneNumber: '+1234567890',
      department: 'IT',
      jobTitle: 'Developer',
    };
    expect(() => createUserSchema.parse(validData)).not.toThrow();
  });
});

describe('updateUserSchema', () => {
  it('allows partial updates', () => {
    const validData = {
      fullName: 'Updated Name',
    };
    expect(() => updateUserSchema.parse(validData)).not.toThrow();
  });

  it('allows empty object', () => {
    expect(() => updateUserSchema.parse({})).not.toThrow();
  });

  it('validates fullName when provided', () => {
    const invalidData = {
      fullName: 'A',
    };
    expect(() => updateUserSchema.parse(invalidData)).toThrow();
  });
});

describe('changePasswordSchema', () => {
  it('validates correct password change data', () => {
    const validData = {
      currentPassword: 'oldpassword123',
      newPassword: 'newpassword123',
      confirmPassword: 'newpassword123',
    };
    expect(() => changePasswordSchema.parse(validData)).not.toThrow();
  });

  it('rejects when passwords do not match', () => {
    const invalidData = {
      currentPassword: 'oldpassword123',
      newPassword: 'newpassword123',
      confirmPassword: 'differentpassword',
    };
    expect(() => changePasswordSchema.parse(invalidData)).toThrow();
  });

  it('rejects short new password', () => {
    const invalidData = {
      currentPassword: 'oldpassword123',
      newPassword: 'short',
      confirmPassword: 'short',
    };
    expect(() => changePasswordSchema.parse(invalidData)).toThrow();
  });

  it('rejects empty current password', () => {
    const invalidData = {
      currentPassword: '',
      newPassword: 'newpassword123',
      confirmPassword: 'newpassword123',
    };
    expect(() => changePasswordSchema.parse(invalidData)).toThrow();
  });
});

