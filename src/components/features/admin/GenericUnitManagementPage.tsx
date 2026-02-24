import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { guEndpoints } from '@/api/endpoints/master-data.endpoints';
import { useBrands, useCategories } from '@/hooks/useMasterData';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useToast } from '@/hooks/useToast';
import { Plus, Edit, Trash2 } from 'lucide-react';
import { BrandSelect } from '@/components/common/BrandSelect';
import { CategorySelect } from '@/components/common/CategorySelect';

interface GenericUnit {
  id: string;
  code: string;
  name: string;
  description?: string;
  brandId: string;
  categoryId: string;
  isActive?: boolean;
  brand?: {
    id: string;
    name: string;
    code: string;
  };
  category?: {
    id: string;
    name: string;
    code: string;
  };
}

export function GenericUnitManagementPage() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<GenericUnit | null>(null);
  const [formData, setFormData] = useState({
    code: '',
    name: '',
    description: '',
    brandId: '',
    categoryId: '',
    isActive: true,
  });
  const toast = useToast();
  const queryClient = useQueryClient();

  const { data: genericUnits = [], isLoading } = useQuery({
    queryKey: ['generic-units', false],
    queryFn: () => guEndpoints.getAll(false).then((res) => res.data),
  });

  const { data: brands = [] } = useBrands(true);
  const { data: categories = [] } = useCategories(true);

  const createMutation = useMutation({
    mutationFn: (data: any) => guEndpoints.create(data),
    onSuccess: () => {
      toast.success('Generic Unit başarıyla oluşturuldu');
      queryClient.invalidateQueries({ queryKey: ['generic-units'] });
      handleDialogClose();
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || 'Generic Unit oluşturulurken hata oluştu');
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) =>
      guEndpoints.update(id, data),
    onSuccess: () => {
      toast.success('Generic Unit başarıyla güncellendi');
      queryClient.invalidateQueries({ queryKey: ['generic-units'] });
      handleDialogClose();
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || 'Generic Unit güncellenirken hata oluştu');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => guEndpoints.delete(id),
    onSuccess: () => {
      toast.success('Generic Unit başarıyla silindi');
      queryClient.invalidateQueries({ queryKey: ['generic-units'] });
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || 'Generic Unit silinirken hata oluştu');
    },
  });

  const handleEdit = (item: GenericUnit) => {
    setEditingItem(item);
    setFormData({
      code: item.code || '',
      name: item.name || '',
      description: item.description || '',
      brandId: item.brandId || item.brand?.id || '',
      categoryId: item.categoryId || item.category?.id || '',
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
      brandId: '',
      categoryId: '',
      isActive: true,
    });
    setIsDialogOpen(true);
  };

  const handleDialogClose = () => {
    setIsDialogOpen(false);
    setEditingItem(null);
    setFormData({
      code: '',
      name: '',
      description: '',
      brandId: '',
      categoryId: '',
      isActive: true,
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Validate required fields
    if (!formData.code?.trim() || !formData.name?.trim() || !formData.brandId || !formData.categoryId) {
      toast.error('Lütfen tüm zorunlu alanları doldurun');
      return;
    }

    const submitData = {
      code: formData.code.trim(),
      name: formData.name.trim(),
      description: formData.description?.trim() || '',
      brandId: formData.brandId,
      categoryId: formData.categoryId,
      isActive: formData.isActive !== undefined ? formData.isActive : true,
    };

    if (editingItem) {
      updateMutation.mutate({ id: editingItem.id, data: submitData });
    } else {
      createMutation.mutate(submitData);
    }
  };

  const handleDelete = (id: string) => {
    if (window.confirm('Bu Generic Unit\'i silmek istediğinizden emin misiniz?')) {
      deleteMutation.mutate(id);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Generic Unit Yönetimi</h1>
          <p className="text-gray-600 mt-2">Generic Unit'leri görüntüleyin, oluşturun ve yönetin</p>
        </div>
        <Button onClick={handleCreate}>
          <Plus className="h-4 w-4 mr-2" />
          Yeni Generic Unit
        </Button>
      </div>

      <Dialog open={isDialogOpen} onOpenChange={handleDialogClose}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingItem ? 'Generic Unit Düzenle' : 'Yeni Generic Unit'}
            </DialogTitle>
            <DialogDescription>
              {editingItem
                ? 'Generic Unit bilgilerini güncelleyin'
                : 'Sisteme yeni bir Generic Unit ekleyin'}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="code">
                Kod <span className="text-red-500">*</span>
              </Label>
              <Input
                id="code"
                value={formData.code}
                onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                required
              />
            </div>

            <div>
              <Label htmlFor="name">
                İsim <span className="text-red-500">*</span>
              </Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
              />
            </div>

            <div>
              <Label htmlFor="description">Açıklama</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={3}
              />
            </div>

            <div>
              <Label htmlFor="brandId">
                Marka <span className="text-red-500">*</span>
              </Label>
              <BrandSelect
                value={formData.brandId}
                onChange={(value) => setFormData({ ...formData, brandId: value })}
                required
                id="brandId"
              />
            </div>

            <div>
              <Label htmlFor="categoryId">
                Kategori <span className="text-red-500">*</span>
              </Label>
              <CategorySelect
                value={formData.categoryId}
                onChange={(value) => setFormData({ ...formData, categoryId: value })}
                required
                id="categoryId"
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
              <TableHead>Marka</TableHead>
              <TableHead>Kategori</TableHead>
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
            ) : genericUnits.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center">
                  Henüz kayıt bulunmamaktadır
                </TableCell>
              </TableRow>
            ) : (
              genericUnits.map((item: GenericUnit) => (
                <TableRow key={item.id}>
                  <TableCell>{item.code}</TableCell>
                  <TableCell>{item.name}</TableCell>
                  <TableCell>
                    {item.brand?.name || brands.find((b) => b.id === item.brandId)?.name || '-'}
                  </TableCell>
                  <TableCell>
                    {item.category?.name || categories.find((c) => c.id === item.categoryId)?.name || '-'}
                  </TableCell>
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
