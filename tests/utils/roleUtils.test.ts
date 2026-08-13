import { describe, it, expect } from 'vitest';
import { hasRole, hasAnyRole, isRole, getPrimaryPersona } from '@/utils/roleUtils';
import { UserRole } from '@/types/user.types';

// ⚠️ B dalgası / R2a (⛔ P0, 2026-08-13): `UserRole.APPROVER`/`.MANAGER`/(jenerik)
// `.FINANCE` backend'den KALDIRILDI (0 kullanıcı, K-2.6.4b/d) — bu dosyada onları
// "hedef olmayan bir rol" örneği olarak kullanan genel testler `CATEGORY_MANAGER`/
// `FINANCE_MANAGER`'a taşındı (aynı test niyeti, geçerli enum değerleriyle). İki test
// (eski jenerik `FINANCE` ve `MANAGER` değerlerini SPESİFİK olarak hedefleyen)
// KALDIRILDI — test ettikleri değer artık yok.
describe('roleUtils', () => {
  describe('hasRole', () => {
    it('should return true for ADMIN regardless of required roles', () => {
      expect(hasRole(UserRole.ADMIN, [UserRole.PLANNER])).toBe(true);
      expect(hasRole(UserRole.ADMIN, [UserRole.CATEGORY_MANAGER])).toBe(true);
      expect(hasRole(UserRole.ADMIN, [UserRole.FINANCE_MANAGER])).toBe(true);
      expect(hasRole(UserRole.ADMIN, [UserRole.PLANNER, UserRole.CATEGORY_MANAGER])).toBe(true);
    });

    it('should return true when user has the required role', () => {
      expect(hasRole(UserRole.PLANNER, [UserRole.PLANNER])).toBe(true);
      expect(hasRole(UserRole.CATEGORY_MANAGER, [UserRole.CATEGORY_MANAGER])).toBe(true);
      expect(hasRole(UserRole.FINANCE_MANAGER, [UserRole.FINANCE_MANAGER])).toBe(true);
    });

    it('should return false when user does not have the required role', () => {
      expect(hasRole(UserRole.PLANNER, [UserRole.CATEGORY_MANAGER])).toBe(false);
      expect(hasRole(UserRole.CATEGORY_MANAGER, [UserRole.FINANCE_MANAGER])).toBe(false);
      expect(hasRole(UserRole.FINANCE_MANAGER, [UserRole.PLANNER])).toBe(false);
    });

    it('should return false when user role is undefined', () => {
      expect(hasRole(undefined, [UserRole.PLANNER])).toBe(false);
      expect(hasRole(undefined, [UserRole.ADMIN])).toBe(false);
    });
  });

  describe('hasAnyRole', () => {
    it('should return true for ADMIN regardless of allowed roles', () => {
      expect(hasAnyRole(UserRole.ADMIN, [UserRole.PLANNER])).toBe(true);
      expect(hasAnyRole(UserRole.ADMIN, [UserRole.CATEGORY_MANAGER, UserRole.FINANCE_MANAGER])).toBe(true);
    });

    it('should return true when user has any of the allowed roles', () => {
      expect(hasAnyRole(UserRole.PLANNER, [UserRole.PLANNER, UserRole.CATEGORY_MANAGER])).toBe(true);
      expect(hasAnyRole(UserRole.CATEGORY_MANAGER, [UserRole.PLANNER, UserRole.CATEGORY_MANAGER])).toBe(true);
    });

    it('should return false when user does not have any of the allowed roles', () => {
      expect(hasAnyRole(UserRole.PLANNER, [UserRole.CATEGORY_MANAGER, UserRole.FINANCE_MANAGER])).toBe(false);
    });
  });

  describe('isRole', () => {
    it('should return true for ADMIN checking any role', () => {
      expect(isRole(UserRole.ADMIN, UserRole.PLANNER)).toBe(true);
      expect(isRole(UserRole.ADMIN, UserRole.CATEGORY_MANAGER)).toBe(true);
      expect(isRole(UserRole.ADMIN, UserRole.FINANCE_MANAGER)).toBe(true);
      expect(isRole(UserRole.ADMIN, UserRole.ADMIN)).toBe(true);
    });

    it('should return true when user has the exact role', () => {
      expect(isRole(UserRole.PLANNER, UserRole.PLANNER)).toBe(true);
      expect(isRole(UserRole.CATEGORY_MANAGER, UserRole.CATEGORY_MANAGER)).toBe(true);
      expect(isRole(UserRole.FINANCE_MANAGER, UserRole.FINANCE_MANAGER)).toBe(true);
    });

    it('should return false when user does not have the exact role', () => {
      expect(isRole(UserRole.PLANNER, UserRole.CATEGORY_MANAGER)).toBe(false);
      expect(isRole(UserRole.CATEGORY_MANAGER, UserRole.FINANCE_MANAGER)).toBe(false);
    });

    it('should return false when user role is undefined', () => {
      expect(isRole(undefined, UserRole.PLANNER)).toBe(false);
    });
  });

  describe('getPrimaryPersona', () => {
    it('should return readonly for READONLY role', () => {
      expect(getPrimaryPersona(UserRole.READONLY)).toBe('readonly');
    });

    it('should return readonly for undefined role', () => {
      expect(getPrimaryPersona(undefined)).toBe('readonly');
    });

    it('should return finance for FINANCE_MANAGER role', () => {
      expect(getPrimaryPersona(UserRole.FINANCE_MANAGER)).toBe('finance');
    });

    it('should return category for CATEGORY_MANAGER role', () => {
      expect(getPrimaryPersona(UserRole.CATEGORY_MANAGER)).toBe('category');
    });

    it('should return admin for ADMIN role', () => {
      expect(getPrimaryPersona(UserRole.ADMIN)).toBe('admin');
    });

    it('should return planner for PLANNER role', () => {
      expect(getPrimaryPersona(UserRole.PLANNER)).toBe('planner');
    });
  });
});
