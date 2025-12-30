import { describe, it, expect } from 'vitest';
import {
  createTenantSchema,
  updateTenantSchema,
} from '@/schemas/tenant.schema';
import { TenantStatus, TenantPlan } from '@/types/tenant.types';

describe('createTenantSchema', () => {
  it('validates correct tenant data', () => {
    const validData = {
      name: 'Test Tenant',
    };
    expect(() => createTenantSchema.parse(validData)).not.toThrow();
  });

  it('rejects name that is too short', () => {
    const invalidData = {
      name: 'AB',
    };
    expect(() => createTenantSchema.parse(invalidData)).toThrow();
  });

  it('accepts optional fields', () => {
    const validData = {
      name: 'Test Tenant',
      domain: 'test.example.com',
      status: TenantStatus.ACTIVE,
      plan: TenantPlan.PROFESSIONAL,
      contactEmail: 'test@example.com',
      maxUsers: 10,
      maxStorageGB: 100,
    };
    expect(() => createTenantSchema.parse(validData)).not.toThrow();
  });

  it('rejects invalid email format', () => {
    const invalidData = {
      name: 'Test Tenant',
      contactEmail: 'invalid-email',
    };
    expect(() => createTenantSchema.parse(invalidData)).toThrow();
  });

  it('accepts empty string for optional email', () => {
    const validData = {
      name: 'Test Tenant',
      contactEmail: '',
    };
    expect(() => createTenantSchema.parse(validData)).not.toThrow();
  });

  it('rejects maxUsers less than 1', () => {
    const invalidData = {
      name: 'Test Tenant',
      maxUsers: 0,
    };
    expect(() => createTenantSchema.parse(invalidData)).toThrow();
  });

  it('validates settings structure', () => {
    const validData = {
      name: 'Test Tenant',
      settings: {
        defaultCurrency: 'USD',
        timezone: 'UTC',
        dateFormat: 'MM/DD/YYYY',
      },
    };
    expect(() => createTenantSchema.parse(validData)).not.toThrow();
  });
});

describe('updateTenantSchema', () => {
  it('allows partial updates', () => {
    const validData = {
      name: 'Updated Name',
    };
    expect(() => updateTenantSchema.parse(validData)).not.toThrow();
  });

  it('allows empty object', () => {
    expect(() => updateTenantSchema.parse({})).not.toThrow();
  });
});

