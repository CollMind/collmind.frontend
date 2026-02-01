import { UserRole } from '@/types/user.types';

/**
 * Checks if a user has the required role(s)
 * Admin role has access to everything, so it always returns true
 * 
 * @param userRole - The user's role
 * @param requiredRoles - Array of roles that are allowed
 * @returns true if user has access, false otherwise
 */
export function hasRole(userRole: UserRole | undefined, requiredRoles: UserRole[]): boolean {
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
export function hasAnyRole(userRole: UserRole | undefined, allowedRoles: UserRole[]): boolean {
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
export function isRole(userRole: UserRole | undefined, role: UserRole): boolean {
  if (!userRole) return false;
  
  // Admin has all roles
  if (userRole === UserRole.ADMIN) {
    return true;
  }
  
  return userRole === role;
}
