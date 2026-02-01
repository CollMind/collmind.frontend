import { createBrowserRouter } from 'react-router-dom';
import { Link } from 'react-router-dom';
import { useState } from 'react';
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
import { useMe } from '@/services/users.service';
import { useTenants, useDeleteTenant, useActivateTenant, useSuspendTenant } from '@/services/tenants.service';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import { EmptyState } from '@/components/common/EmptyState';
import { TenantForm } from '@/components/forms/TenantForm';
import { EnumBadge } from '@/components/common/EnumBadge';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { MoreHorizontal, Edit, Trash2, CheckCircle, Ban } from 'lucide-react';
import { Tenant } from '@/types/tenant.types';



// Tenants Page with real data
const TenantsPage = () => {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingTenant, setEditingTenant] = useState<Tenant | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [tenantToDelete, setTenantToDelete] = useState<Tenant | null>(null);
  const { data: tenants, isLoading, error } = useTenants();
  const deleteMutation = useDeleteTenant();
  const activateMutation = useActivateTenant();
  const suspendMutation = useSuspendTenant();

  if (isLoading) return <LoadingSpinner />;
  if (error) {
    console.error('Error loading tenants:', error);
    return (
      <div className="text-red-600 p-4">
        Error loading tenants: {error instanceof Error ? error.message : 'Unknown error'}
      </div>
    );
  }

  // Ensure tenants is an array
  const tenantsArray = Array.isArray(tenants) ? tenants : [];

  const handleEdit = (tenant: Tenant) => {
    setEditingTenant(tenant);
    setIsDialogOpen(true);
  };

  const handleDeleteClick = (tenant: Tenant) => {
    setTenantToDelete(tenant);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (tenantToDelete) {
      await deleteMutation.mutateAsync(tenantToDelete.id);
      setDeleteDialogOpen(false);
      setTenantToDelete(null);
    }
  };

  const handleActivate = async (tenant: Tenant) => {
    await activateMutation.mutateAsync(tenant.id);
  };

  const handleSuspend = async (tenant: Tenant) => {
    await suspendMutation.mutateAsync(tenant.id);
  };

  const handleDialogClose = () => {
    setIsDialogOpen(false);
    setEditingTenant(null);
  };
  
  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Tenants</h1>
        <Button onClick={() => setIsDialogOpen(true)}>
          Add Tenant
        </Button>
      </div>

      <Dialog open={isDialogOpen} onOpenChange={handleDialogClose}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingTenant ? 'Edit Tenant' : 'Add New Tenant'}</DialogTitle>
            <DialogDescription>
              {editingTenant ? 'Update tenant information' : 'Create a new tenant in the system'}
            </DialogDescription>
          </DialogHeader>
          <TenantForm
            tenant={editingTenant || undefined}
            onSuccess={handleDialogClose}
            onCancel={handleDialogClose}
          />
        </DialogContent>
      </Dialog>

      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Tenant</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete {tenantToDelete?.name}? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteConfirm}
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? 'Deleting...' : 'Delete'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {tenantsArray.length === 0 ? (
        <EmptyState message="No tenants found" />
      ) : (
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Name
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Status
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Plan
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Max Users
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {tenantsArray.map((tenant) => (
              <tr key={tenant.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                  {tenant.name}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <EnumBadge value={tenant.status} type="status" />
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <EnumBadge value={tenant.plan} type="plan" />
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {tenant.maxUsers}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => handleEdit(tenant)}>
                        <Edit className="mr-2 h-4 w-4" />
                        Edit
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      {tenant.status === 'ACTIVE' ? (
                        <DropdownMenuItem onClick={() => handleSuspend(tenant)}>
                          <Ban className="mr-2 h-4 w-4" />
                          Suspend
                        </DropdownMenuItem>
                      ) : (
                        <DropdownMenuItem onClick={() => handleActivate(tenant)}>
                          <CheckCircle className="mr-2 h-4 w-4" />
                          Activate
                        </DropdownMenuItem>
                      )}
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        onClick={() => handleDeleteClick(tenant)}
                        className="text-red-600"
                      >
                        <Trash2 className="mr-2 h-4 w-4" />
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      )}
    </div>
  );
};

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

