import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
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
import { categoryEndpoints } from '@/api/endpoints/master-data.endpoints';

interface Category {
  id: string;
  code: string;
  name: string;
  description?: string;
  isActive?: boolean;
}

export function CategoryManagementPage() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<Category | null>(null);
  const [formData, setFormData] = useState<Record<string, any>>({});
  const toast = useToast();
  const queryClient = useQueryClient();

  const { data: items = [], isLoading } = useQuery({
    queryKey: ['categories', false],
    queryFn: () => categoryEndpoints.getAll(false).then((res) => res.data),
  });

  const createMutation = useMutation({
    mutationFn: (data: any) => categoryEndpoints.create(data),
    onSuccess: () => {
      toast.success('Kategori başarıyla oluşturuldu');
      // Invalidate all category queries (both activeOnly=true and activeOnly=false)
      queryClient.invalidateQueries({ queryKey: ['categories'] });
      handleDialogClose();
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || 'Kategori oluşturulurken hata oluştu');
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) =>
      categoryEndpoints.update(id, data),
    onSuccess: () => {
      toast.success('Kategori başarıyla güncellendi');
      // Invalidate all category queries (both activeOnly=true and activeOnly=false)
      queryClient.invalidateQueries({ queryKey: ['categories'] });
      handleDialogClose();
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || 'Kategori güncellenirken hata oluştu');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => categoryEndpoints.delete(id),
    onSuccess: () => {
      toast.success('Kategori başarıyla silindi');
      // Invalidate all category queries (both activeOnly=true and activeOnly=false)
      queryClient.invalidateQueries({ queryKey: ['categories'] });
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || 'Kategori silinirken hata oluştu');
    },
  });

  const handleEdit = (item: Category) => {
    setEditingItem(item);
    setFormData({
      code: item.code || '',
      name: item.name || '',
      description: item.description || '',
      isActive: item.isActive !== undefined ? item.isActive : true,
    });
    setIsDialogOpen(true);
  };

  const handleCreate = () => {
    setEditingItem(null);
    setFormData({
      code: '',
      name: '',
      description: '',
      isActive: true,
    });
    setIsDialogOpen(true);
  };

  const handleDialogClose = () => {
    setIsDialogOpen(false);
    setEditingItem(null);
    setFormData({});
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const submitData = {
      ...formData,
      isActive: formData.isActive !== undefined ? formData.isActive : true,
    };
    
    if (editingItem) {
      updateMutation.mutate({ id: editingItem.id, data: submitData });
    } else {
      createMutation.mutate(submitData);
    }
  };

  const handleDelete = (id: string) => {
    if (window.confirm('Bu kategoriyi silmek istediğinizden emin misiniz?')) {
      deleteMutation.mutate(id);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Kategori Yönetimi</h1>
          <p className="text-gray-600 mt-2">Sistem kategorilerini görüntüleyin, oluşturun ve yönetin</p>
        </div>
        <Button onClick={handleCreate}>
          <Plus className="h-4 w-4 mr-2" />
          Yeni Kategori
        </Button>
      </div>

      <Dialog open={isDialogOpen} onOpenChange={handleDialogClose}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingItem ? 'Kategori Düzenle' : 'Yeni Kategori'}
            </DialogTitle>
            <DialogDescription>
              {editingItem
                ? 'Kategori bilgilerini güncelleyin'
                : 'Sisteme yeni bir kategori ekleyin'}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="code">
                Kod *
              </Label>
              <Input
                id="code"
                value={formData.code || ''}
                onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                required
              />
            </div>
            <div>
              <Label htmlFor="name">
                İsim *
              </Label>
              <Input
                id="name"
                value={formData.name || ''}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
              />
            </div>
            <div>
              <Label htmlFor="description">Açıklama</Label>
              <Textarea
                id="description"
                value={formData.description || ''}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={3}
              />
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox
                id="isActive"
                checked={formData.isActive !== undefined ? formData.isActive : true}
                onCheckedChange={(checked) =>
                  setFormData({ ...formData, isActive: checked as boolean })
                }
              />
              <Label htmlFor="isActive">Aktif</Label>
            </div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={handleDialogClose}>
                İptal
              </Button>
              <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending}>
                {editingItem ? 'Güncelle' : 'Oluştur'}
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
              <TableHead>Durum</TableHead>
              <TableHead className="text-right">İşlemler</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={4} className="text-center">
                  Yükleniyor...
                </TableCell>
              </TableRow>
            ) : items.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="text-center">
                  Henüz kayıt bulunmamaktadır
                </TableCell>
              </TableRow>
            ) : (
              items.map((item: Category) => (
                <TableRow key={item.id}>
                  <TableCell>{item.code}</TableCell>
                  <TableCell>{item.name}</TableCell>
                  <TableCell>
                    <span
                      className={`px-2 py-1 rounded text-xs font-medium ${
                        item.isActive !== false
                          ? 'bg-green-100 text-green-800'
                          : 'bg-red-100 text-red-800'
                      }`}
                    >
                      {item.isActive !== false ? 'Aktif' : 'Pasif'}
                    </span>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleEdit(item)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDelete(item.id)}
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
