import { describe, it, expect } from 'vitest';
import { loginSchema } from '@/schemas/auth.schema';

describe('loginSchema', () => {
  it('validates correct login data', () => {
    const validData = {
      email: 'test@example.com',
      password: 'password123',
    };
    expect(() => loginSchema.parse(validData)).not.toThrow();
  });

  it('validates with optional ipAddress', () => {
    const validData = {
      email: 'test@example.com',
      password: 'password123',
      ipAddress: '192.168.1.1',
    };
    expect(() => loginSchema.parse(validData)).not.toThrow();
  });

  it('rejects invalid email', () => {
    const invalidData = {
      email: 'invalid-email',
      password: 'password123',
    };
    expect(() => loginSchema.parse(invalidData)).toThrow();
  });

  it('rejects short password', () => {
    const invalidData = {
      email: 'test@example.com',
      password: 'short',
    };
    expect(() => loginSchema.parse(invalidData)).toThrow();
  });

  it('rejects invalid ipAddress format', () => {
    const invalidData = {
      email: 'test@example.com',
      password: 'password123',
      ipAddress: 'invalid-ip',
    };
    expect(() => loginSchema.parse(invalidData)).toThrow();
  });

  it('accepts valid IPv4 address', () => {
    const validData = {
      email: 'test@example.com',
      password: 'password123',
      ipAddress: '192.168.1.1',
    };
    expect(() => loginSchema.parse(validData)).not.toThrow();
  });

  it('accepts valid IPv6 address', () => {
    const validData = {
      email: 'test@example.com',
      password: 'password123',
      ipAddress: '2001:0db8:85a3:0000:0000:8a2e:0370:7334',
    };
    expect(() => loginSchema.parse(validData)).not.toThrow();
  });
});

