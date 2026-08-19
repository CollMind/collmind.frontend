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

// T-243 — `createUserSchema`'nın `superRefine` dalları (`user.schema.ts`).
// Backend'in dört kapısından üçünün (B1/R1/A3) istemci-taraf yansıması.
// `R2` (rol değişimi 409) burada YOK — `updateUserSchema` `role` alanı
// taşımıyor, tetikleyecek bir arayüz yolu yok (T-243 brief, "⛔ Yazılmayacak").
describe('createUserSchema — scope (T-243 B1/R1/A3)', () => {
  const base = {
    email: 'test@example.com',
    password: 'password123',
    fullName: 'Test User',
  };
  const CPL_ID = '11111111-1111-1111-1111-111111111111';
  const CATEGORY_ID = '22222222-2222-2222-2222-222222222222';

  // B1 — SCOPE_REQUIRED (PLANNER) rolünde kapsam zorunlu.
  it('rejects PLANNER without a scope array at all (B1)', () => {
    const result = createUserSchema.safeParse({
      ...base,
      role: UserRole.PLANNER,
    });
    expect(result.success).toBe(false);
  });

  it('rejects PLANNER with a joker scope pair — both dimensions empty (B1)', () => {
    const result = createUserSchema.safeParse({
      ...base,
      role: UserRole.PLANNER,
      scope: [{}],
    });
    expect(result.success).toBe(false);
  });

  it('accepts PLANNER with only cplId set in the scope pair (B1 — yeşil yarı)', () => {
    const result = createUserSchema.safeParse({
      ...base,
      role: UserRole.PLANNER,
      scope: [{ cplId: CPL_ID }],
    });
    expect(result.success).toBe(true);
  });

  // R1 — CATEGORY_MANAGER kapsamı yalnız kategori boyutundadır, cplId
  // taşıyamaz. Ayrı özneyle kuruldu (B1 PLANNER ile kuruldu) — CLAUDE.md:
  // "bir kural birden çok özneye uygulanıyorsa testi her özne için ayrı kur."
  it('rejects CATEGORY_MANAGER scope pair carrying a cplId (R1)', () => {
    const result = createUserSchema.safeParse({
      ...base,
      role: UserRole.CATEGORY_MANAGER,
      scope: [{ cplId: CPL_ID, categoryId: CATEGORY_ID }],
    });
    expect(result.success).toBe(false);
  });

  it('accepts CATEGORY_MANAGER with only categoryId set (R1 — yeşil yarı)', () => {
    const result = createUserSchema.safeParse({
      ...base,
      role: UserRole.CATEGORY_MANAGER,
      scope: [{ categoryId: CATEGORY_ID }],
    });
    expect(result.success).toBe(true);
  });

  // A3 — UNRESTRICTED (ADMIN/FINANCE/READONLY) rollerinde kapsam hiç
  // istenmiyor; scope alanı verilmese de form geçerli.
  it.each([UserRole.ADMIN, UserRole.FINANCE, UserRole.READONLY])(
    'does not require scope for %s (A3)',
    (role) => {
      const result = createUserSchema.safeParse({ ...base, role });
      expect(result.success).toBe(true);
    },
  );
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

