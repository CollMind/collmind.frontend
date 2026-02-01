import { useParams } from 'react-router-dom';
import { useState } from 'react';
import { TenantDetail, TenantStats } from '@/components/tenants';
import { TenantForm } from '@/components/forms/TenantForm';
import { useTenant } from '@/services/tenants.service';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useToast } from '@/hooks/useToast';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export function TenantDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const toast = useToast();
  const { data: tenant } = useTenant(id || '');

  const handleEdit = () => {
    setIsEditDialogOpen(true);
  };

  const handleDialogClose = () => {
    setIsEditDialogOpen(false);
  };

  const handleSuccess = () => {
    toast.success('Kiracı başarıyla güncellendi');
    handleDialogClose();
  };

  if (!id) {
    return <div>Kiracı ID bulunamadı</div>;
  }

  return (
    <div className="space-y-6">
      <Dialog open={isEditDialogOpen} onOpenChange={handleDialogClose}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Kiracı Düzenle</DialogTitle>
            <DialogDescription>
              Kiracı bilgilerini güncelleyin
            </DialogDescription>
          </DialogHeader>
          {tenant && (
            <TenantForm
              tenant={tenant}
              onSuccess={handleSuccess}
              onCancel={handleDialogClose}
            />
          )}
        </DialogContent>
      </Dialog>

      <TenantDetail tenantId={id} onEdit={handleEdit} />

      <Card>
        <CardHeader>
          <CardTitle>İstatistikler</CardTitle>
        </CardHeader>
        <CardContent>
          <TenantStats tenantId={id} />
        </CardContent>
      </Card>
    </div>
  );
}
