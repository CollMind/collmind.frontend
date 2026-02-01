import { useState } from 'react';
import { TenantList } from '@/components/tenants';
import { TenantForm } from '@/components/forms/TenantForm';
import { Tenant } from '@/types/tenant.types';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useToast } from '@/hooks/useToast';

export function TenantsPage() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingTenant, setEditingTenant] = useState<Tenant | null>(null);
  const toast = useToast();

  const handleEdit = (tenant: Tenant) => {
    setEditingTenant(tenant);
    setIsDialogOpen(true);
  };

  const handleCreate = () => {
    setEditingTenant(null);
    setIsDialogOpen(true);
  };

  const handleDialogClose = () => {
    setIsDialogOpen(false);
    setEditingTenant(null);
  };

  const handleSuccess = () => {
    toast.success(editingTenant ? 'Kiracı başarıyla güncellendi' : 'Kiracı başarıyla oluşturuldu');
    handleDialogClose();
  };

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Kiracı Yönetimi</h1>
        <p className="text-gray-600 mt-2">
          Sistem kiracılarını görüntüleyin, oluşturun ve yönetin
        </p>
      </div>

      <Dialog open={isDialogOpen} onOpenChange={handleDialogClose}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingTenant ? 'Kiracı Düzenle' : 'Yeni Kiracı'}
            </DialogTitle>
            <DialogDescription>
              {editingTenant
                ? 'Kiracı bilgilerini güncelleyin'
                : 'Sisteme yeni bir kiracı ekleyin'}
            </DialogDescription>
          </DialogHeader>
          <TenantForm
            tenant={editingTenant || undefined}
            onSuccess={handleSuccess}
            onCancel={handleDialogClose}
          />
        </DialogContent>
      </Dialog>

      <TenantList onEdit={handleEdit} onCreate={handleCreate} />
    </div>
  );
}
