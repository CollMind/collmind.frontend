import React from 'react';
import { useAppSelector } from '@/store/hooks';
import { UserRole } from '@/types/user.types';
import { hasAnyRole } from '@/utils/roleUtils';

interface RoleGuardProps {
  allowedRoles: UserRole[];
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

export function RoleGuard({
  allowedRoles,
  children,
  fallback = null,
}: RoleGuardProps) {
  const user = useAppSelector((state) => state.auth.user);

  // Admin has access to everything
  if (!user || !hasAnyRole(user.role, allowedRoles)) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
}
