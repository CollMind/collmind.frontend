import { UserRole } from '@/types/user.types';

export type DashboardPersona =
  | 'admin'
  | 'finance'
  | 'category'
  | 'planner'
  | 'readonly';

/**
 * Tek bir rolden dashboard persona'sını belirler.
 * Öncelik sırası: READONLY > FINANCE / FINANCE_MANAGER > CATEGORY_MANAGER / MANAGER / APPROVER > ADMIN > PLANNER
 */
export function getPrimaryPersona(
  role: UserRole | undefined
): DashboardPersona {
  if (!role) return 'readonly';
  if (role === UserRole.READONLY) return 'readonly';
  if (role === UserRole.FINANCE || role === UserRole.FINANCE_MANAGER)
    return 'finance';
  if (
    role === UserRole.CATEGORY_MANAGER ||
    role === UserRole.MANAGER ||
    role === UserRole.APPROVER
  )
    return 'category';
  if (role === UserRole.ADMIN) return 'admin';
  return 'planner';
}

/**
 * Checks if a user has the required role(s)
 * Admin role has access to everything, so it always returns true
 *
 * @param userRole - The user's role
 * @param requiredRoles - Array of roles that are allowed
 * @returns true if user has access, false otherwise
 */
export function hasRole(
  userRole: UserRole | undefined,
  requiredRoles: UserRole[]
): boolean {
  if (!userRole) return false;

  // Admin has access to everything
  if (userRole === UserRole.ADMIN) {
    return true;
  }

  return requiredRoles.includes(userRole);
}

/**
 * Checks if a user has any of the required roles
 * Admin role has access to everything, so it always returns true
 *
 * @param userRole - The user's role
 * @param allowedRoles - Array of roles that are allowed
 * @returns true if user has access, false otherwise
 */
export function hasAnyRole(
  userRole: UserRole | undefined,
  allowedRoles: UserRole[]
): boolean {
  return hasRole(userRole, allowedRoles);
}

/**
 * Checks if a user has a specific role
 * Admin role is considered to have all roles
 *
 * @param userRole - The user's role
 * @param role - The role to check
 * @returns true if user has the role, false otherwise
 */
export function isRole(
  userRole: UserRole | undefined,
  role: UserRole
): boolean {
  if (!userRole) return false;

  // Admin has all roles
  if (userRole === UserRole.ADMIN) {
    return true;
  }

  return userRole === role;
}

/**
 * Returns true if the user has READONLY role.
 * READONLY users can view all data but cannot perform any write actions.
 * Use this to conditionally hide/disable edit buttons, forms, and action menus.
 */
export function isReadOnly(userRole: UserRole | undefined): boolean {
  if (!userRole) return false;
  return userRole === UserRole.READONLY;
}
