import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { channelEndpoints } from '@/api/endpoints/master-data.endpoints';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/hooks/useToast';
import { Plus, Edit, Trash2 } from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

interface Channel {
  id: string;
  code: string;
  name: string;
  description?: string;
  subchannel?: string;
  sortOrder: number;
  isActive: boolean;
  metadata?: Record<string, any>;
}

export function ChannelManagementPage() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingChannel, setEditingChannel] = useState<Channel | null>(null);
  const [formData, setFormData] = useState<Partial<Channel>>({
    code: '',
    name: '',
    description: '',
    subchannel: '',
    sortOrder: 0,
    isActive: true,
  });
  const toast = useToast();
  const queryClient = useQueryClient();

  const { data: channels = [], isLoading } = useQuery({
    queryKey: ['channels', false],
    queryFn: () => channelEndpoints.getAll(false).then((res) => res.data),
  });

  const createMutation = useMutation({
    mutationFn: (data: any) => channelEndpoints.create(data),
    onSuccess: () => {
      toast.success('Kanal başarıyla oluşturuldu');
      queryClient.invalidateQueries({ queryKey: ['channels'] });
      handleDialogClose();
    },
    onError: (error: any) => {
      toast.error(
        error?.response?.data?.message || 'Kanal oluşturulurken hata oluştu'
      );
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) =>
      channelEndpoints.update(id, data),
    onSuccess: () => {
      toast.success('Kanal başarıyla güncellendi');
      queryClient.invalidateQueries({ queryKey: ['channels'] });
      handleDialogClose();
    },
    onError: (error: any) => {
      toast.error(
        error?.response?.data?.message || 'Kanal güncellenirken hata oluştu'
      );
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => channelEndpoints.delete(id),
    onSuccess: () => {
      toast.success('Kanal başarıyla silindi');
      queryClient.invalidateQueries({ queryKey: ['channels'] });
    },
    onError: (error: any) => {
      toast.error(
        error?.response?.data?.message || 'Kanal silinirken hata oluştu'
      );
    },
  });

  const handleEdit = (channel: Channel) => {
    setEditingChannel(channel);
    setFormData({
      code: channel.code,
      name: channel.name,
      description: channel.description || '',
      subchannel: channel.subchannel || '',
      sortOrder: channel.sortOrder,
      isActive: channel.isActive,
    });
    setIsDialogOpen(true);
  };

  const handleCreate = () => {
    setEditingChannel(null);
    setFormData({
      code: '',
      name: '',
      description: '',
      subchannel: '',
      sortOrder: 0,
      isActive: true,
    });
    setIsDialogOpen(true);
  };

  const handleDialogClose = () => {
    setIsDialogOpen(false);
    setEditingChannel(null);
    setFormData({
      code: '',
      name: '',
      description: '',
      subchannel: '',
      sortOrder: 0,
      isActive: true,
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingChannel) {
      updateMutation.mutate({ id: editingChannel.id, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  const handleDelete = (id: string) => {
    if (window.confirm('Bu kanalı silmek istediğinizden emin misiniz?')) {
      deleteMutation.mutate(id);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Kanal Yönetimi</h1>
          <p className="text-gray-600 mt-2">
            Sistem kanallarını görüntüleyin, oluşturun ve yönetin
          </p>
        </div>
        <Button onClick={handleCreate}>
          <Plus className="h-4 w-4 mr-2" />
          Yeni Kanal
        </Button>
      </div>

      <Dialog open={isDialogOpen} onOpenChange={handleDialogClose}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingChannel ? 'Kanal Düzenle' : 'Yeni Kanal'}
            </DialogTitle>
            <DialogDescription>
              {editingChannel
                ? 'Kanal bilgilerini güncelleyin'
                : 'Sisteme yeni bir kanal ekleyin'}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="code">Kod *</Label>
              <Input
                id="code"
                value={formData.code}
                onChange={(e) =>
                  setFormData({ ...formData, code: e.target.value })
                }
                required
              />
            </div>
            <div>
              <Label htmlFor="name">İsim *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
                required
              />
            </div>
            <div>
              <Label htmlFor="description">Açıklama</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) =>
                  setFormData({ ...formData, description: e.target.value })
                }
                rows={3}
              />
            </div>
            <div>
              <Label htmlFor="subchannel">Alt Kanal</Label>
              <Input
                id="subchannel"
                value={formData.subchannel}
                onChange={(e) =>
                  setFormData({ ...formData, subchannel: e.target.value })
                }
              />
            </div>
            <div>
              <Label htmlFor="sortOrder">Sıralama</Label>
              <Input
                id="sortOrder"
                type="number"
                value={formData.sortOrder}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    sortOrder: parseInt(e.target.value) || 0,
                  })
                }
              />
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox
                id="isActive"
                checked={formData.isActive}
                onCheckedChange={(checked) =>
                  setFormData({ ...formData, isActive: checked as boolean })
                }
              />
              <Label htmlFor="isActive">Aktif</Label>
            </div>
            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={handleDialogClose}
              >
                İptal
              </Button>
              <Button
                type="submit"
                disabled={createMutation.isPending || updateMutation.isPending}
              >
                {editingChannel ? 'Güncelle' : 'Oluştur'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <div className="bg-white rounded-lg shadow">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Kod</TableHead>
              <TableHead>İsim</TableHead>
              <TableHead>Alt Kanal</TableHead>
              <TableHead>Sıralama</TableHead>
              <TableHead>Durum</TableHead>
              <TableHead className="text-right">İşlemler</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center">
                  Yükleniyor...
                </TableCell>
              </TableRow>
            ) : channels.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center">
                  Henüz kanal bulunmamaktadır
                </TableCell>
              </TableRow>
            ) : (
              channels.map((channel: Channel) => (
                <TableRow key={channel.id}>
                  <TableCell>{channel.code}</TableCell>
                  <TableCell>{channel.name}</TableCell>
                  <TableCell>{channel.subchannel || '-'}</TableCell>
                  <TableCell>{channel.sortOrder}</TableCell>
                  <TableCell>
                    <span
                      className={`px-2 py-1 rounded text-xs ${
                        channel.isActive
                          ? 'bg-green-100 text-green-800'
                          : 'bg-gray-100 text-gray-800'
                      }`}
                    >
                      {channel.isActive ? 'Aktif' : 'Pasif'}
                    </span>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleEdit(channel)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDelete(channel.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
