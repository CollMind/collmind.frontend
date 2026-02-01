import { useState, useMemo } from 'react';
import { useTenants, useDeleteTenant, useActivateTenant, useSuspendTenant } from '@/services/tenants.service';
import { Tenant, TenantStatus, TenantPlan } from '@/types/tenant.types';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import { EmptyState } from '@/components/common/EmptyState';
import { EnumBadge } from '@/components/common/EnumBadge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
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
import { MoreHorizontal, Edit, Trash2, CheckCircle, Ban, Search, Filter } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useToast } from '@/hooks/useToast';

interface TenantListProps {
  onEdit?: (tenant: Tenant) => void;
  onCreate?: () => void;
}

export function TenantList({ onEdit, onCreate }: TenantListProps) {
  const navigate = useNavigate();
  const toast = useToast();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [planFilter, setPlanFilter] = useState<string>('all');
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [tenantToDelete, setTenantToDelete] = useState<Tenant | null>(null);
  const [deleteConfirmName, setDeleteConfirmName] = useState('');
  const [sortField, setSortField] = useState<'name' | 'status' | 'plan' | 'createdAt'>('name');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

  const { data: tenants, isLoading, error } = useTenants();
  const deleteMutation = useDeleteTenant();
  const activateMutation = useActivateTenant();
  const suspendMutation = useSuspendTenant();

  const filteredAndSortedTenants = useMemo(() => {
    if (!tenants || !Array.isArray(tenants)) return [];

    let filtered = [...tenants];

    // Search filter
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      filtered = filtered.filter(
        (tenant) =>
          tenant.name.toLowerCase().includes(searchLower) ||
          tenant.domain?.toLowerCase().includes(searchLower) ||
          tenant.contactEmail?.toLowerCase().includes(searchLower) ||
          tenant.contactPerson?.toLowerCase().includes(searchLower)
      );
    }

    // Status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter((tenant) => tenant.status === statusFilter);
    }

    // Plan filter
    if (planFilter !== 'all') {
      filtered = filtered.filter((tenant) => tenant.plan === planFilter);
    }

    // Sorting
    filtered.sort((a, b) => {
      let aValue: string | number | Date;
      let bValue: string | number | Date;

      switch (sortField) {
        case 'name':
          aValue = a.name.toLowerCase();
          bValue = b.name.toLowerCase();
          break;
        case 'status':
          aValue = a.status;
          bValue = b.status;
          break;
        case 'plan':
          aValue = a.plan;
          bValue = b.plan;
          break;
        case 'createdAt':
          aValue = new Date(a.createdAt).getTime();
          bValue = new Date(b.createdAt).getTime();
          break;
        default:
          return 0;
      }

      if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });

    return filtered;
  }, [tenants, searchTerm, statusFilter, planFilter, sortField, sortDirection]);

  const handleDeleteClick = (tenant: Tenant) => {
    setTenantToDelete(tenant);
    setDeleteConfirmName('');
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (tenantToDelete && deleteConfirmName === tenantToDelete.name) {
      try {
        await deleteMutation.mutateAsync(tenantToDelete.id);
        toast.success('Kiracı başarıyla silindi');
        setDeleteDialogOpen(false);
        setTenantToDelete(null);
        setDeleteConfirmName('');
      } catch (error: any) {
        toast.error(error?.response?.data?.message || 'Kiracı silinirken bir hata oluştu');
      }
    }
  };

  const handleActivate = async (tenant: Tenant) => {
    try {
      await activateMutation.mutateAsync(tenant.id);
      toast.success('Kiracı başarıyla aktif edildi');
    } catch (error: any) {
      toast.error(error?.response?.data?.message || 'Kiracı aktif edilirken bir hata oluştu');
    }
  };

  const handleSuspend = async (tenant: Tenant) => {
    try {
      await suspendMutation.mutateAsync(tenant.id);
      toast.success('Kiracı başarıyla askıya alındı');
    } catch (error: any) {
      toast.error(error?.response?.data?.message || 'Kiracı askıya alınırken bir hata oluştu');
    }
  };

  const handleSort = (field: 'name' | 'status' | 'plan' | 'createdAt') => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  if (isLoading) return <LoadingSpinner />;

  if (error) {
    return (
      <div className="text-red-600 p-4">
        Kiracılar yüklenirken bir hata oluştu:{' '}
        {error instanceof Error ? error.message : 'Bilinmeyen hata'}
      </div>
    );
  }

  return (
    <div>
      {/* Filters and Search */}
      <div className="mb-6 space-y-4">
        <div className="flex flex-col sm:flex-row gap-4">
          {/* Search */}
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <Input
              placeholder="Kiracı ara (isim, domain, email)..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>

          {/* Status Filter */}
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-full sm:w-[180px]">
              <Filter className="mr-2 h-4 w-4" />
              <SelectValue placeholder="Durum Filtrele" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tüm Durumlar</SelectItem>
              {Object.values(TenantStatus).map((status) => (
                <SelectItem key={status} value={status}>
                  <EnumBadge value={status} type="status" />
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Plan Filter */}
          <Select value={planFilter} onValueChange={setPlanFilter}>
            <SelectTrigger className="w-full sm:w-[180px]">
              <Filter className="mr-2 h-4 w-4" />
              <SelectValue placeholder="Plan Filtrele" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tüm Planlar</SelectItem>
              {Object.values(TenantPlan).map((plan) => (
                <SelectItem key={plan} value={plan}>
                  <EnumBadge value={plan} type="plan" />
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Create Button */}
          {onCreate && (
            <Button onClick={onCreate}>Yeni Kiracı</Button>
          )}
        </div>

        {/* Results count */}
        <div className="text-sm text-gray-600">
          {filteredAndSortedTenants.length} kiracı bulundu
        </div>
      </div>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Kiracıyı Sil</DialogTitle>
            <DialogDescription>
              Bu işlem geri alınamaz. Onaylamak için kiracı adını girin: <strong>{tenantToDelete?.name}</strong>
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <Input
              placeholder="Kiracı adını girin"
              value={deleteConfirmName}
              onChange={(e) => setDeleteConfirmName(e.target.value)}
            />
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setDeleteDialogOpen(false);
                setDeleteConfirmName('');
                setTenantToDelete(null);
              }}
            >
              İptal
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteConfirm}
              disabled={deleteMutation.isPending || deleteConfirmName !== tenantToDelete?.name}
            >
              {deleteMutation.isPending ? 'Siliniyor...' : 'Sil'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Tenants Table */}
      {filteredAndSortedTenants.length === 0 ? (
        <EmptyState message="Kiracı bulunamadı" />
      ) : (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                    onClick={() => handleSort('name')}
                  >
                    <div className="flex items-center gap-2">
                      İsim
                      {sortField === 'name' && (
                        <span>{sortDirection === 'asc' ? '↑' : '↓'}</span>
                      )}
                    </div>
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Domain
                  </th>
                  <th
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                    onClick={() => handleSort('status')}
                  >
                    <div className="flex items-center gap-2">
                      Durum
                      {sortField === 'status' && (
                        <span>{sortDirection === 'asc' ? '↑' : '↓'}</span>
                      )}
                    </div>
                  </th>
                  <th
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                    onClick={() => handleSort('plan')}
                  >
                    <div className="flex items-center gap-2">
                      Plan
                      {sortField === 'plan' && (
                        <span>{sortDirection === 'asc' ? '↑' : '↓'}</span>
                      )}
                    </div>
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    İletişim
                  </th>
                  <th
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                    onClick={() => handleSort('createdAt')}
                  >
                    <div className="flex items-center gap-2">
                      Oluşturulma
                      {sortField === 'createdAt' && (
                        <span>{sortDirection === 'asc' ? '↑' : '↓'}</span>
                      )}
                    </div>
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    İşlemler
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredAndSortedTenants.map((tenant) => (
                  <tr
                    key={tenant.id}
                    className="hover:bg-gray-50 cursor-pointer"
                    onClick={() => navigate(`/tenants/${tenant.id}`)}
                  >
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {tenant.name}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {tenant.domain || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <EnumBadge value={tenant.status} type="status" />
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <EnumBadge value={tenant.plan} type="plan" />
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {tenant.contactEmail || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(tenant.createdAt).toLocaleDateString('tr-TR')}
                    </td>
                    <td
                      className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem
                            onClick={() => navigate(`/tenants/${tenant.id}`)}
                          >
                            <Edit className="mr-2 h-4 w-4" />
                            Detayları Görüntüle
                          </DropdownMenuItem>
                          {onEdit && (
                            <DropdownMenuItem onClick={() => onEdit(tenant)}>
                              <Edit className="mr-2 h-4 w-4" />
                              Düzenle
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuSeparator />
                          {tenant.status === TenantStatus.ACTIVE ? (
                            <DropdownMenuItem onClick={() => handleSuspend(tenant)}>
                              <Ban className="mr-2 h-4 w-4" />
                              Askıya Al
                            </DropdownMenuItem>
                          ) : (
                            <DropdownMenuItem onClick={() => handleActivate(tenant)}>
                              <CheckCircle className="mr-2 h-4 w-4" />
                              Aktif Et
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            onClick={() => handleDeleteClick(tenant)}
                            className="text-red-600"
                          >
                            <Trash2 className="mr-2 h-4 w-4" />
                            Sil
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
