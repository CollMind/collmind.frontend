import { useState } from 'react';
import { UserList } from '@/components/users';
import { UserForm } from '@/components/forms/UserForm';
import { User } from '@/types/user.types';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useToast } from '@/hooks/useToast';

export function UsersPage() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const toast = useToast();

  const handleEdit = (user: User) => {
    setEditingUser(user);
    setIsDialogOpen(true);
  };

  const handleCreate = () => {
    setEditingUser(null);
    setIsDialogOpen(true);
  };

  const handleDialogClose = () => {
    setIsDialogOpen(false);
    setEditingUser(null);
  };

  const handleSuccess = () => {
    toast.success(
      editingUser
        ? 'Kullanıcı başarıyla güncellendi'
        : 'Kullanıcı başarıyla oluşturuldu'
    );
    handleDialogClose();
  };

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Kullanıcı Yönetimi</h1>
        <p className="text-gray-600 mt-2">
          Sistem kullanıcılarını görüntüleyin, oluşturun ve yönetin
        </p>
      </div>

      <Dialog open={isDialogOpen} onOpenChange={handleDialogClose}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingUser ? 'Kullanıcı Düzenle' : 'Yeni Kullanıcı'}
            </DialogTitle>
            <DialogDescription>
              {editingUser
                ? 'Kullanıcı bilgilerini güncelleyin'
                : 'Sisteme yeni bir kullanıcı ekleyin'}
            </DialogDescription>
          </DialogHeader>
          <UserForm
            user={editingUser || undefined}
            onSuccess={handleSuccess}
            onCancel={handleDialogClose}
          />
        </DialogContent>
      </Dialog>

      <UserList onEdit={handleEdit} onCreate={handleCreate} />
    </div>
  );
}
