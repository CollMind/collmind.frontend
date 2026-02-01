import { createBrowserRouter } from 'react-router-dom';
import { Link } from 'react-router-dom';
import { AppLayout } from '@/components/layout/AppLayout';
import { ProtectedRoute } from '@/components/layout/ProtectedRoute';
import { LoginPage } from '@/components/features/auth/LoginPage';
import { ErrorBoundary } from '@/components/common/ErrorBoundary';
import { DashboardPage } from '@/components/features/dashboard/DashboardPage';
import { BudgetPage } from '@/components/features/budget/BudgetPage';
import { UsersPage } from '@/components/features/users/UsersPage';
import { UserDetailPage } from '@/components/features/users/UserDetailPage';
import { ProfilePage } from '@/components/features/users/ProfilePage';

import { CustomersPage } from '@/components/features/customers/CustomersPage';
import { CustomerDetailPage } from '@/components/features/customers/CustomerDetailPage';
import { CustomerCreatePage } from '@/components/features/customers/CustomerCreatePage';
import { CustomerEditPage } from '@/components/features/customers/CustomerEditPage';
import { CustomerImportPage } from '@/components/features/customers/CustomerImportPage';
import { TenantsPage } from '@/components/features/tenants/TenantsPage';
import { TenantDetailPage } from '@/components/features/tenants/TenantDetailPage';
import { TenantCreatePage } from '@/components/features/tenants/TenantCreatePage';
import { useMe } from '@/services/users.service';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';




// Settings Page
const SettingsPage = () => {
  const { data: user, isLoading } = useMe();

  if (isLoading) return <LoadingSpinner />;
  
  // user is not used but kept for future use

  return (
    <div>
      <h1 className="text-3xl font-bold mb-6">Settings</h1>
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold mb-4">Application Settings</h2>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Theme
            </label>
            <select className="w-full px-3 py-2 border border-gray-300 rounded-lg">
              <option>Light</option>
              <option>Dark</option>
              <option>Auto</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Language
            </label>
            <select className="w-full px-3 py-2 border border-gray-300 rounded-lg">
              <option>English</option>
              <option>Turkish</option>
            </select>
          </div>
        </div>
      </div>
    </div>
  );
};


const NotFoundPage = () => (
  <div className="flex flex-col items-center justify-center min-h-[400px]">
    <h1 className="text-4xl font-bold mb-4">404</h1>
    <p className="text-gray-600 mb-4">Page not found</p>
    <Link to="/dashboard" className="text-primary-600 hover:text-primary-700">
      Go to Dashboard
    </Link>
  </div>
);

export const router = createBrowserRouter([
  {
    path: '/login',
    element: <LoginPage />,
  },
  {
    path: '/',
    element: (
      <ProtectedRoute>
        <AppLayout>
          <ErrorBoundary>
            <DashboardPage />
          </ErrorBoundary>
        </AppLayout>
      </ProtectedRoute>
    ),
  },
  {
    path: '/dashboard',
    element: (
      <ProtectedRoute>
        <AppLayout>
          <ErrorBoundary>
            <DashboardPage />
          </ErrorBoundary>
        </AppLayout>
      </ProtectedRoute>
    ),
  },
  {
    path: '/customers',
    element: (
      <ProtectedRoute>
        <AppLayout>
          <ErrorBoundary>
            <CustomersPage />
          </ErrorBoundary>
        </AppLayout>
      </ProtectedRoute>
    ),
  },
  {
    path: '/customers/new',
    element: (
      <ProtectedRoute requiredRole={['ADMIN', 'PLANNER']}>
        <AppLayout>
          <ErrorBoundary>
            <CustomerCreatePage />
          </ErrorBoundary>
        </AppLayout>
      </ProtectedRoute>
    ),
  },
  {
    path: '/customers/:id',
    element: (
      <ProtectedRoute>
        <AppLayout>
          <ErrorBoundary>
            <CustomerDetailPage />
          </ErrorBoundary>
        </AppLayout>
      </ProtectedRoute>
    ),
  },
  {
    path: '/customers/:id/edit',
    element: (
      <ProtectedRoute requiredRole={['ADMIN', 'PLANNER']}>
        <AppLayout>
          <ErrorBoundary>
            <CustomerEditPage />
          </ErrorBoundary>
        </AppLayout>
      </ProtectedRoute>
    ),
  },
  {
    path: '/customers/import',
    element: (
      <ProtectedRoute requiredRole={['ADMIN', 'PLANNER']}>
        <AppLayout>
          <ErrorBoundary>
            <CustomerImportPage />
          </ErrorBoundary>
        </AppLayout>
      </ProtectedRoute>
    ),
  },
  {
    path: '/users',
    element: (
      <ProtectedRoute requiredRole={['ADMIN']}>
        <AppLayout>
          <ErrorBoundary>
            <UsersPage />
          </ErrorBoundary>
        </AppLayout>
      </ProtectedRoute>
    ),
  },
  {
    path: '/users/:id',
    element: (
      <ProtectedRoute requiredRole={['ADMIN']}>
        <AppLayout>
          <ErrorBoundary>
            <UserDetailPage />
          </ErrorBoundary>
        </AppLayout>
      </ProtectedRoute>
    ),
  },
  {
    path: '/tenants',
    element: (
      <ProtectedRoute requiredRole={['ADMIN']}>
        <AppLayout>
          <ErrorBoundary>
            <TenantsPage />
          </ErrorBoundary>
        </AppLayout>
      </ProtectedRoute>
    ),
  },
  {
    path: '/tenants/new',
    element: (
      <ProtectedRoute requiredRole={['ADMIN']}>
        <AppLayout>
          <ErrorBoundary>
            <TenantCreatePage />
          </ErrorBoundary>
        </AppLayout>
      </ProtectedRoute>
    ),
  },
  {
    path: '/tenants/:id',
    element: (
      <ProtectedRoute requiredRole={['ADMIN']}>
        <AppLayout>
          <ErrorBoundary>
            <TenantDetailPage />
          </ErrorBoundary>
        </AppLayout>
      </ProtectedRoute>
    ),
  },
  {
    path: '/settings',
    element: (
      <ProtectedRoute>
        <AppLayout>
          <ErrorBoundary>
            <SettingsPage />
          </ErrorBoundary>
        </AppLayout>
      </ProtectedRoute>
    ),
  },
  {
    path: '/profile',
    element: (
      <ProtectedRoute>
        <AppLayout>
          <ErrorBoundary>
            <ProfilePage />
          </ErrorBoundary>
        </AppLayout>
      </ProtectedRoute>
    ),
  },
  {
    path: '/budget',
    element: (
      <ProtectedRoute>
        <AppLayout>
          <ErrorBoundary>
            <BudgetPage />
          </ErrorBoundary>
        </AppLayout>
      </ProtectedRoute>
    ),
  },
  {
    path: '*',
    element: (
      <ProtectedRoute>
        <AppLayout>
          <NotFoundPage />
        </AppLayout>
      </ProtectedRoute>
    ),
  },
]);

