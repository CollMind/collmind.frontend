import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { UserDetail } from '@/components/users';
import { UserForm } from '@/components/forms/UserForm';
import { ChangePasswordForm } from '@/components/users';
import { useUser } from '@/services/users.service';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import { useToast } from '@/hooks/useToast';

export function UserDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const toast = useToast();
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isPasswordDialogOpen, setIsPasswordDialogOpen] = useState(false);

  const { data: user, isLoading } = useUser(id || '');

  if (!id) {
    return <div>Kullanıcı ID bulunamadı</div>;
  }

  const handleEdit = () => {
    setIsEditDialogOpen(true);
  };

  const handleEditSuccess = () => {
    toast.success('Kullanıcı başarıyla güncellendi');
    setIsEditDialogOpen(false);
  };

  const handlePasswordSuccess = () => {
    toast.success('Şifre başarıyla güncellendi');
    setIsPasswordDialogOpen(false);
  };

  return (
    <div>
      <div className="mb-6">
        <Button
          variant="ghost"
          onClick={() => navigate('/users')}
          className="mb-4"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Kullanıcı Listesine Dön
        </Button>
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold">Kullanıcı Detayları</h1>
            <p className="text-gray-600 mt-2">
              Kullanıcı bilgilerini görüntüleyin ve yönetin
            </p>
          </div>
          <div className="flex gap-2">
            <Button onClick={() => setIsPasswordDialogOpen(true)}>
              Şifre Değiştir
            </Button>
            <Button onClick={handleEdit}>Düzenle</Button>
          </div>
        </div>
      </div>

      {isLoading ? (
        <div>Yükleniyor...</div>
      ) : (
        <UserDetail userId={id} onEdit={handleEdit} />
      )}

      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Kullanıcı Düzenle</DialogTitle>
            <DialogDescription>
              Kullanıcı bilgilerini güncelleyin
            </DialogDescription>
          </DialogHeader>
          <UserForm
            user={user || undefined}
            onSuccess={handleEditSuccess}
            onCancel={() => setIsEditDialogOpen(false)}
          />
        </DialogContent>
      </Dialog>

      {/* Change Password Dialog */}
      <Dialog open={isPasswordDialogOpen} onOpenChange={setIsPasswordDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Şifre Değiştir</DialogTitle>
            <DialogDescription>
              {user?.fullName} kullanıcısının şifresini değiştirin
            </DialogDescription>
          </DialogHeader>
          <ChangePasswordForm
            userId={id}
            onSuccess={handlePasswordSuccess}
            onCancel={() => setIsPasswordDialogOpen(false)}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}
