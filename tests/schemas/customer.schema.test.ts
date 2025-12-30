import { describe, it, expect } from 'vitest';
import {
  createCustomerSchema,
  updateCustomerSchema,
} from '@/schemas/customer.schema';
import { CustomerChannel, CustomerType, CustomerStatus } from '@/types/customer.types';

describe('createCustomerSchema', () => {
  it('validates correct customer data', () => {
    const validData = {
      code: 'CUST001',
      name: 'Test Customer',
      channel: CustomerChannel.NKA,
    };
    expect(() => createCustomerSchema.parse(validData)).not.toThrow();
  });

  it('rejects missing code', () => {
    const invalidData = {
      name: 'Test Customer',
      channel: CustomerChannel.NKA,
    };
    expect(() => createCustomerSchema.parse(invalidData)).toThrow();
  });

  it('rejects code that is too long', () => {
    const invalidData = {
      code: 'A'.repeat(51),
      name: 'Test Customer',
      channel: CustomerChannel.NKA,
    };
    expect(() => createCustomerSchema.parse(invalidData)).toThrow();
  });

  it('rejects name that is too short', () => {
    const invalidData = {
      code: 'CUST001',
      name: 'A',
      channel: CustomerChannel.NKA,
    };
    expect(() => createCustomerSchema.parse(invalidData)).toThrow();
  });

  it('rejects invalid email format', () => {
    const invalidData = {
      code: 'CUST001',
      name: 'Test Customer',
      channel: CustomerChannel.NKA,
      contactEmail: 'invalid-email',
    };
    expect(() => createCustomerSchema.parse(invalidData)).toThrow();
  });

  it('accepts valid optional fields', () => {
    const validData = {
      code: 'CUST001',
      name: 'Test Customer',
      channel: CustomerChannel.NKA,
      type: CustomerType.DIRECT,
      status: CustomerStatus.ACTIVE,
      city: 'Istanbul',
      contactEmail: 'test@example.com',
      creditLimit: 10000,
    };
    expect(() => createCustomerSchema.parse(validData)).not.toThrow();
  });

  it('accepts empty string for optional email', () => {
    const validData = {
      code: 'CUST001',
      name: 'Test Customer',
      channel: CustomerChannel.NKA,
      contactEmail: '',
    };
    expect(() => createCustomerSchema.parse(validData)).not.toThrow();
  });

  it('validates metadata structure', () => {
    const validData = {
      code: 'CUST001',
      name: 'Test Customer',
      channel: CustomerChannel.NKA,
      metadata: {
        storeSize: 1000,
        numberOfEmployees: 50,
        website: 'https://example.com',
      },
    };
    expect(() => createCustomerSchema.parse(validData)).not.toThrow();
  });

  it('rejects invalid URL in metadata', () => {
    const invalidData = {
      code: 'CUST001',
      name: 'Test Customer',
      channel: CustomerChannel.NKA,
      metadata: {
        website: 'invalid-url',
      },
    };
    expect(() => createCustomerSchema.parse(invalidData)).toThrow();
  });
});

describe('updateCustomerSchema', () => {
  it('allows partial updates', () => {
    const validData = {
      name: 'Updated Name',
    };
    expect(() => updateCustomerSchema.parse(validData)).not.toThrow();
  });

  it('allows empty object', () => {
    expect(() => updateCustomerSchema.parse({})).not.toThrow();
  });

  it('validates fields when provided', () => {
    const invalidData = {
      name: 'A', // Too short
    };
    expect(() => updateCustomerSchema.parse(invalidData)).toThrow();
  });
});

