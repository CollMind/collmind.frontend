import { useState } from 'react';
import { useMe, useUpdateProfile } from '@/services/users.service';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import { EmptyState } from '@/components/common/EmptyState';
import { EnumBadge } from '@/components/common/EnumBadge';
import { ChangePasswordForm } from '@/components/users';
import { UserForm } from '@/components/forms/UserForm';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Edit, Mail, Phone, Building, Briefcase, Calendar, Shield, Lock } from 'lucide-react';
import { format } from 'date-fns';
import { tr } from 'date-fns/locale';
import { useToast } from '@/hooks/useToast';

export function ProfilePage() {
  const { data: user, isLoading } = useMe();
  const toast = useToast();
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isPasswordDialogOpen, setIsPasswordDialogOpen] = useState(false);

  const handleEditSuccess = () => {
    toast.success('Profil bilgileriniz başarıyla güncellendi');
    setIsEditDialogOpen(false);
  };

  const handlePasswordSuccess = () => {
    toast.success('Şifreniz başarıyla güncellendi');
    setIsPasswordDialogOpen(false);
  };

  if (isLoading) return <LoadingSpinner />;

  if (!user) {
    return <EmptyState message="Kullanıcı bilgileri yüklenemedi" />;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold">Profilim</h1>
          <p className="text-gray-600 mt-1">Hesap bilgilerinizi görüntüleyin ve düzenleyin</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setIsPasswordDialogOpen(true)}>
            <Lock className="mr-2 h-4 w-4" />
            Şifre Değiştir
          </Button>
          <Button onClick={() => setIsEditDialogOpen(true)}>
            <Edit className="mr-2 h-4 w-4" />
            Düzenle
          </Button>
        </div>
      </div>

      {/* Main Info Card */}
      <Card>
        <CardHeader>
          <CardTitle>Kişisel Bilgiler</CardTitle>
          <CardDescription>Hesabınızın temel bilgileri</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex items-start gap-3">
              <Mail className="h-5 w-5 text-gray-400 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-gray-500">Email</p>
                <p className="text-sm text-gray-900">{user.email}</p>
                <p className="text-xs text-gray-400 mt-1">Email adresi değiştirilemez</p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <Shield className="h-5 w-5 text-gray-400 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-gray-500">Rol</p>
                <div className="mt-1">
                  <EnumBadge value={user.role} type="role" />
                </div>
                <p className="text-xs text-gray-400 mt-1">Rol değiştirilemez</p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <Shield className="h-5 w-5 text-gray-400 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-gray-500">Durum</p>
                <div className="mt-1">
                  <EnumBadge value={user.status} type="status" />
                </div>
              </div>
            </div>

            {user.phoneNumber && (
              <div className="flex items-start gap-3">
                <Phone className="h-5 w-5 text-gray-400 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-gray-500">Telefon</p>
                  <p className="text-sm text-gray-900">{user.phoneNumber}</p>
                </div>
              </div>
            )}

            {user.department && (
              <div className="flex items-start gap-3">
                <Building className="h-5 w-5 text-gray-400 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-gray-500">Departman</p>
                  <p className="text-sm text-gray-900">{user.department}</p>
                </div>
              </div>
            )}

            {user.jobTitle && (
              <div className="flex items-start gap-3">
                <Briefcase className="h-5 w-5 text-gray-400 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-gray-500">Pozisyon</p>
                  <p className="text-sm text-gray-900">{user.jobTitle}</p>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Additional Info Card */}
      <Card>
        <CardHeader>
          <CardTitle>Ek Bilgiler</CardTitle>
          <CardDescription>Hesap oluşturulma ve güncellenme bilgileri</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {user.firstName && (
              <div>
                <p className="text-sm font-medium text-gray-500">Ad</p>
                <p className="text-sm text-gray-900">{user.firstName}</p>
              </div>
            )}

            {user.lastName && (
              <div>
                <p className="text-sm font-medium text-gray-500">Soyad</p>
                <p className="text-sm text-gray-900">{user.lastName}</p>
              </div>
            )}

            {user.lastLoginAt && (
              <div className="flex items-start gap-3">
                <Calendar className="h-5 w-5 text-gray-400 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-gray-500">Son Giriş</p>
                  <p className="text-sm text-gray-900">
                    {format(new Date(user.lastLoginAt), 'dd MMMM yyyy, HH:mm', {
                      locale: tr,
                    })}
                  </p>
                </div>
              </div>
            )}

            <div className="flex items-start gap-3">
              <Calendar className="h-5 w-5 text-gray-400 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-gray-500">Oluşturulma Tarihi</p>
                <p className="text-sm text-gray-900">
                  {format(new Date(user.createdAt), 'dd MMMM yyyy, HH:mm', {
                    locale: tr,
                  })}
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <Calendar className="h-5 w-5 text-gray-400 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-gray-500">Güncellenme Tarihi</p>
                <p className="text-sm text-gray-900">
                  {format(new Date(user.updatedAt), 'dd MMMM yyyy, HH:mm', {
                    locale: tr,
                  })}
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Profil Düzenle</DialogTitle>
            <DialogDescription>
              Profil bilgilerinizi güncelleyin. Email ve rol değiştirilemez.
            </DialogDescription>
          </DialogHeader>
          <UserForm
            user={user}
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
              Hesap güvenliğiniz için güçlü bir şifre kullanın
            </DialogDescription>
          </DialogHeader>
          <ChangePasswordForm
            onSuccess={handlePasswordSuccess}
            onCancel={() => setIsPasswordDialogOpen(false)}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}
