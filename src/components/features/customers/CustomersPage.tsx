import { useState } from 'react';
import { CustomerList } from '@/components/customers/CustomerList';
import { CustomerForm } from '@/components/forms/CustomerForm';
import { CustomerImportButton } from '@/components/customers';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Customer } from '@/types/customer.types';

export function CustomersPage() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);

  const handleEdit = (customer: Customer) => {
    setEditingCustomer(customer);
    setIsDialogOpen(true);
  };

  const handleCreate = () => {
    setEditingCustomer(null);
    setIsDialogOpen(true);
  };

  const handleDialogClose = () => {
    setIsDialogOpen(false);
    setEditingCustomer(null);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Müşteriler</h1>
        <div className="flex gap-2">
          <CustomerImportButton />
        </div>
      </div>

      {/* Müşteri Form Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={handleDialogClose}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingCustomer ? 'Müşteri Düzenle' : 'Yeni Müşteri'}
            </DialogTitle>
            <DialogDescription>
              {editingCustomer
                ? 'Müşteri bilgilerini güncelleyin'
                : 'Sisteme yeni bir müşteri ekleyin'}
            </DialogDescription>
          </DialogHeader>
          <CustomerForm
            customer={editingCustomer || undefined}
            onSuccess={handleDialogClose}
            onCancel={handleDialogClose}
          />
        </DialogContent>
      </Dialog>

      {/* Müşteri Listesi */}
      <CustomerList onEdit={handleEdit} onCreate={handleCreate} />
    </div>
  );
}
