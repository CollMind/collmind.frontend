import { Navigate, useLocation } from 'react-router-dom';
import { useAppSelector, useAppDispatch } from '@/store/hooks';
import { useMe } from '@/services/users.service';
import { setCredentials, logout } from '@/store/slices/auth.slice';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import { useEffect } from 'react';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredRole?: string[];
}

/**
 * ProtectedRoute - Korumalı route component'i
 * 
 * Özellikler:
 * - Authentication kontrolü
 * - Role-based access control
 * - Sayfa yenileme sonrası oturum kontrolü (GET /users/me)
 * 
 * @example
 * ```tsx
 * <ProtectedRoute requiredRole={['ADMIN']}>
 *   <AdminPage />
 * </ProtectedRoute>
 * ```
 */
export function ProtectedRoute({
  children,
  requiredRole,
}: ProtectedRouteProps) {
  const location = useLocation();
  const dispatch = useAppDispatch();
  const { isAuthenticated, user, accessToken } = useAppSelector(
    (state) => state.auth
  );

  // Token varsa ama kullanıcı bilgisi yoksa, GET /users/me ile kontrol et
  const shouldFetchUser = !!accessToken && !user;
  const { data: meData, isLoading: isMeLoading, error: meError } = useMe({
    enabled: shouldFetchUser,
  });

  // Sayfa yenileme sonrası oturum kontrolü
  useEffect(() => {
    if (shouldFetchUser && meData) {
      // Kullanıcı bilgilerini store'a kaydet
      // Not: Token'lar zaten localStorage'da, sadece user bilgisini güncelle
      const refreshToken = localStorage.getItem('refreshToken');
      if (refreshToken && accessToken) {
        dispatch(
          setCredentials({
            user: meData as any,
            accessToken,
            refreshToken,
          })
        );
      }
    } else if (shouldFetchUser && meError) {
      // Token geçersizse logout yap
      dispatch(logout());
    }
  }, [shouldFetchUser, meData, meError, accessToken, dispatch]);

  // Token varsa ama kullanıcı bilgisi yükleniyorsa loading göster
  if (shouldFetchUser && isMeLoading) {
    return <LoadingSpinner />;
  }

  // Authentication kontrolü
  if (!isAuthenticated || !accessToken) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Role-based access control
  if (requiredRole && user && !requiredRole.includes(user.role)) {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
}
