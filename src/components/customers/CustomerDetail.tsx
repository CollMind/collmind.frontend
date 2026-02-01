import { useParams, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import { EmptyState } from '@/components/common/EmptyState';
import { EnumBadge } from '@/components/common/EnumBadge';
import {
  useCustomer,
  useCustomerStats,
  useDeleteCustomer,
} from '@/services/customers.service';
import { useToast } from '@/hooks/useToast';
import {
  ArrowLeft,
  Edit,
  Trash2,
  Building2,
  MapPin,
  Phone,
  Mail,
  User,
  DollarSign,
  Calendar,
  TrendingUp,
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useState } from 'react';

export function CustomerDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const toast = useToast();
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  const { data: customer, isLoading, error } = useCustomer(id || '');
  const { data: stats } = useCustomerStats(id || '');
  const deleteMutation = useDeleteCustomer();

  const handleDelete = async () => {
    if (!customer) return;
    try {
      await deleteMutation.mutateAsync(customer.id);
      toast.success('Müşteri başarıyla silindi');
      navigate('/customers');
    } catch (error) {
      toast.error('Müşteri silinirken bir hata oluştu');
    }
  };

  if (isLoading) return <LoadingSpinner />;
  if (error || !customer) {
    return (
      <div className="space-y-4">
        <Button variant="ghost" onClick={() => navigate('/customers')}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Geri Dön
        </Button>
        <EmptyState message="Müşteri bulunamadı" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" onClick={() => navigate('/customers')}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Geri Dön
          </Button>
          <div>
            <h1 className="text-3xl font-bold">{customer.name}</h1>
            <p className="text-gray-500">Kod: {customer.code}</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => navigate(`/customers/${customer.id}/edit`)}
          >
            <Edit className="mr-2 h-4 w-4" />
            Düzenle
          </Button>
          <Button
            variant="destructive"
            onClick={() => setDeleteDialogOpen(true)}
          >
            <Trash2 className="mr-2 h-4 w-4" />
            Sil
          </Button>
        </div>
      </div>

      {/* İstatistikler */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Toplam Sipariş</p>
                <p className="text-2xl font-bold">
                  {stats.totalOrders || 0}
                </p>
              </div>
              <TrendingUp className="h-8 w-8 text-blue-500" />
            </div>
          </Card>
          <Card className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Toplam Gelir</p>
                <p className="text-2xl font-bold">
                  {stats.totalRevenue
                    ? new Intl.NumberFormat('tr-TR', {
                        style: 'currency',
                        currency: 'TRY',
                      }).format(stats.totalRevenue)
                    : '₺0'}
                </p>
              </div>
              <DollarSign className="h-8 w-8 text-green-500" />
            </div>
          </Card>
          <Card className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Ortalama Sipariş</p>
                <p className="text-2xl font-bold">
                  {stats.averageOrderValue
                    ? new Intl.NumberFormat('tr-TR', {
                        style: 'currency',
                        currency: 'TRY',
                      }).format(stats.averageOrderValue)
                    : '₺0'}
                </p>
              </div>
              <Calendar className="h-8 w-8 text-purple-500" />
            </div>
          </Card>
          <Card className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Son Sipariş</p>
                <p className="text-sm font-medium">
                  {stats.lastOrderDate
                    ? new Date(stats.lastOrderDate).toLocaleDateString('tr-TR')
                    : '-'}
                </p>
              </div>
              <Calendar className="h-8 w-8 text-orange-500" />
            </div>
          </Card>
        </div>
      )}

      {/* Genel Bilgiler */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="p-6">
          <h2 className="text-xl font-semibold mb-4">Genel Bilgiler</h2>
          <div className="space-y-4">
            <div>
              <label className="text-sm text-gray-500">Kod</label>
              <p className="font-medium">{customer.code}</p>
            </div>
            <div>
              <label className="text-sm text-gray-500">Ad</label>
              <p className="font-medium">{customer.name}</p>
            </div>
            <div>
              <label className="text-sm text-gray-500">Kanal</label>
              <div className="mt-1">
                <EnumBadge value={customer.channel} type="channel" />
              </div>
            </div>
            <div>
              <label className="text-sm text-gray-500">Tip</label>
              <div className="mt-1">
                <EnumBadge value={customer.type} type="type" />
              </div>
            </div>
            <div>
              <label className="text-sm text-gray-500">Durum</label>
              <div className="mt-1">
                <EnumBadge value={customer.status} type="status" />
              </div>
            </div>
            {customer.isVip && (
              <div>
                <Badge variant="outline" className="bg-yellow-100 text-yellow-800">
                  VIP Müşteri
                </Badge>
              </div>
            )}
          </div>
        </Card>

        {/* İletişim Bilgileri */}
        <Card className="p-6">
          <h2 className="text-xl font-semibold mb-4">İletişim Bilgileri</h2>
          <div className="space-y-4">
            {customer.contactPerson && (
              <div className="flex items-start gap-2">
                <User className="h-5 w-5 text-gray-400 mt-0.5" />
                <div>
                  <label className="text-sm text-gray-500">İletişim Kişisi</label>
                  <p className="font-medium">{customer.contactPerson}</p>
                </div>
              </div>
            )}
            {customer.contactEmail && (
              <div className="flex items-start gap-2">
                <Mail className="h-5 w-5 text-gray-400 mt-0.5" />
                <div>
                  <label className="text-sm text-gray-500">Email</label>
                  <p className="font-medium">{customer.contactEmail}</p>
                </div>
              </div>
            )}
            {customer.contactPhone && (
              <div className="flex items-start gap-2">
                <Phone className="h-5 w-5 text-gray-400 mt-0.5" />
                <div>
                  <label className="text-sm text-gray-500">Telefon</label>
                  <p className="font-medium">{customer.contactPhone}</p>
                </div>
              </div>
            )}
            {(customer.city || customer.district || customer.region) && (
              <div className="flex items-start gap-2">
                <MapPin className="h-5 w-5 text-gray-400 mt-0.5" />
                <div>
                  <label className="text-sm text-gray-500">Adres</label>
                  <p className="font-medium">
                    {[customer.district, customer.city, customer.region]
                      .filter(Boolean)
                      .join(', ')}
                  </p>
                </div>
              </div>
            )}
            {customer.numberOfBranches !== undefined && (
              <div className="flex items-start gap-2">
                <Building2 className="h-5 w-5 text-gray-400 mt-0.5" />
                <div>
                  <label className="text-sm text-gray-500">Şube Sayısı</label>
                  <p className="font-medium">{customer.numberOfBranches}</p>
                </div>
              </div>
            )}
          </div>
        </Card>
      </div>

      {/* Silme Onay Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Müşteriyi Sil</DialogTitle>
            <DialogDescription>
              {customer.name} müşterisini silmek istediğinizden emin misiniz?
              Bu işlem geri alınamaz.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeleteDialogOpen(false)}
            >
              İptal
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? 'Siliniyor...' : 'Sil'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
