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
import {
  mechanicEndpoints,
  tacticEndpoints,
} from '@/api/endpoints/master-data.endpoints';
import { TacticSelect } from '@/components/common/TacticSelect';

interface Mechanic {
  id: string;
  code: string;
  name: string;
  description?: string;
  tacticId: string;
  tactic?: {
    id: string;
    code: string;
    name: string;
  };
  mechanicType: 'PERCENT' | 'AMOUNT' | 'AMOUNT_PER_UNIT';
  isActive?: boolean;
}

export function MechanicManagementPage() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<Mechanic | null>(null);
  const [formData, setFormData] = useState<Record<string, any>>({});
  const toast = useToast();
  const queryClient = useQueryClient();

  const { data: mechanics = [], isLoading } = useQuery({
    queryKey: ['mechanics', false],
    queryFn: () => mechanicEndpoints.getAll(false).then((res) => res.data),
  });

  const { data: tactics = [] } = useQuery({
    queryKey: ['tactics', false],
    queryFn: () => tacticEndpoints.getAll(false).then((res) => res.data),
  });

  const createMutation = useMutation({
    mutationFn: (data: any) => mechanicEndpoints.create(data),
    onSuccess: () => {
      toast.success('Mekanik başarıyla oluşturuldu');
      queryClient.invalidateQueries({ queryKey: ['mechanics', false] });
      handleDialogClose();
    },
    onError: (error: any) => {
      const errorMessage =
        error?.response?.data?.message || 'Mekanik oluşturulurken hata oluştu';
      toast.error(
        Array.isArray(errorMessage) ? errorMessage.join(', ') : errorMessage
      );
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) =>
      mechanicEndpoints.update(id, data),
    onSuccess: () => {
      toast.success('Mekanik başarıyla güncellendi');
      queryClient.invalidateQueries({ queryKey: ['mechanics', false] });
      handleDialogClose();
    },
    onError: (error: any) => {
      const errorMessage =
        error?.response?.data?.message || 'Mekanik güncellenirken hata oluştu';
      toast.error(
        Array.isArray(errorMessage) ? errorMessage.join(', ') : errorMessage
      );
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => mechanicEndpoints.delete(id),
    onSuccess: () => {
      toast.success('Mekanik başarıyla silindi');
      queryClient.invalidateQueries({ queryKey: ['mechanics', false] });
    },
    onError: (error: any) => {
      toast.error(
        error?.response?.data?.message || 'Mekanik silinirken hata oluştu'
      );
    },
  });

  const handleEdit = (item: Mechanic) => {
    setEditingItem(item);
    setFormData({
      code: item.code || '',
      name: item.name || '',
      description: item.description || '',
      tacticId: item.tacticId || '',
      mechanicType: item.mechanicType || 'PERCENT',
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
      tacticId: '',
      mechanicType: 'PERCENT',
      isActive: true,
    });
    setIsDialogOpen(true);
  };

  const handleDialogClose = () => {
    setIsDialogOpen(false);
    setEditingItem(null);
    setFormData({});
  };

  const handleCodeChange = (value: string) => {
    // Convert to uppercase and remove invalid characters (keep only A-Z, 0-9, _)
    const sanitized = value.toUpperCase().replace(/[^A-Z0-9_]/g, '');
    setFormData({ ...formData, code: sanitized });
  };

  const validateCode = (code: string): string | null => {
    if (!code || !code.trim()) {
      return 'Kod zorunludur';
    }
    const trimmed = code.trim();
    if (!/^[A-Z][A-Z0-9_]*$/.test(trimmed)) {
      return 'Kod büyük harfle başlamalı ve sadece büyük harf, rakam ve alt çizgi içermelidir';
    }
    if (trimmed.length > 50) {
      return 'Kod en fazla 50 karakter olabilir';
    }
    return null;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Validate required fields
    if (
      !formData.code?.trim() ||
      !formData.name?.trim() ||
      !formData.tacticId
    ) {
      toast.error('Lütfen tüm zorunlu alanları doldurun (Kod, İsim, Taktik)');
      return;
    }

    // Validate code format
    const codeError = validateCode(formData.code);
    if (codeError) {
      toast.error(codeError);
      return;
    }

    const submitData = {
      code: formData.code.trim().toUpperCase(),
      name: formData.name.trim(),
      description: formData.description?.trim() || '',
      tacticId: formData.tacticId,
      mechanicType: formData.mechanicType,
      isActive: formData.isActive !== undefined ? formData.isActive : true,
    };

    if (editingItem) {
      updateMutation.mutate({ id: editingItem.id, data: submitData });
    } else {
      createMutation.mutate(submitData);
    }
  };

  const handleDelete = (id: string) => {
    if (window.confirm('Bu mekaniği silmek istediğinizden emin misiniz?')) {
      deleteMutation.mutate(id);
    }
  };

  const getTacticName = (mechanic: Mechanic) => {
    // Önce mechanic'in kendi tactic relation'ını kontrol et
    if (mechanic.tactic) {
      return `${mechanic.tactic.code} - ${mechanic.tactic.name}`;
    }
    // Fallback: tactics listesinden bul
    const tactic = tactics.find((t) => t.id === mechanic.tacticId);
    return tactic ? `${tactic.code} - ${tactic.name}` : mechanic.tacticId;
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Mekanik Yönetimi</h1>
          <p className="text-gray-600 mt-2">
            Sistem mekaniklerini görüntüleyin, oluşturun ve yönetin
          </p>
        </div>
        <Button onClick={handleCreate}>
          <Plus className="h-4 w-4 mr-2" />
          Yeni Mekanik
        </Button>
      </div>

      {/* Table */}
      <div className="bg-white rounded-lg shadow">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Kod</TableHead>
              <TableHead>İsim</TableHead>
              <TableHead>Taktik</TableHead>
              <TableHead>Tip</TableHead>
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
            ) : mechanics.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center">
                  Henüz mekanik eklenmemiş
                </TableCell>
              </TableRow>
            ) : (
              mechanics.map((mechanic: Mechanic) => (
                <TableRow key={mechanic.id}>
                  <TableCell className="font-medium">{mechanic.code}</TableCell>
                  <TableCell>{mechanic.name}</TableCell>
                  <TableCell>
                    <div className="flex flex-col">
                      <span className="font-medium">
                        {getTacticName(mechanic)}
                      </span>
                      {mechanic.tactic && (
                        <span className="text-xs text-gray-500">
                          Taktik ID: {mechanic.tactic.id}
                        </span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>{mechanic.mechanicType}</TableCell>
                  <TableCell>
                    <span
                      className={`px-2 py-1 rounded text-xs ${
                        mechanic.isActive
                          ? 'bg-green-100 text-green-800'
                          : 'bg-gray-100 text-gray-800'
                      }`}
                    >
                      {mechanic.isActive ? 'Aktif' : 'Pasif'}
                    </span>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleEdit(mechanic)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDelete(mechanic.id)}
                      >
                        <Trash2 className="h-4 w-4 text-red-600" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {editingItem ? 'Mekanik Düzenle' : 'Yeni Mekanik Oluştur'}
            </DialogTitle>
            <DialogDescription>Mekanik bilgilerini girin</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="code">
                Kod <span className="text-red-500">*</span>
              </Label>
              <Input
                id="code"
                value={formData.code || ''}
                onChange={(e) => handleCodeChange(e.target.value)}
                onBlur={(e) => {
                  const error = validateCode(e.target.value);
                  if (error) {
                    toast.error(error);
                  }
                }}
                placeholder="Örn: CPP_ON_INV"
                required
              />
              <p className="text-xs text-gray-500 mt-1">
                Büyük harf, rakam ve alt çizgi kullanın (örn: CPP_ON_INV)
              </p>
            </div>
            <div>
              <Label htmlFor="name">
                İsim <span className="text-red-500">*</span>
              </Label>
              <Input
                id="name"
                value={formData.name || ''}
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
                value={formData.description || ''}
                onChange={(e) =>
                  setFormData({ ...formData, description: e.target.value })
                }
                rows={3}
              />
            </div>
            <div>
              <Label htmlFor="tacticId">
                Taktik <span className="text-red-500">*</span>
              </Label>
              <TacticSelect
                value={formData.tacticId}
                onChange={(value) =>
                  setFormData({ ...formData, tacticId: value })
                }
                required
                placeholder="Taktik seçiniz"
              />
            </div>
            <div>
              <Label htmlFor="mechanicType">
                Mekanik Tipi <span className="text-red-500">*</span>
              </Label>
              <select
                id="mechanicType"
                value={formData.mechanicType || 'PERCENT'}
                onChange={(e) =>
                  setFormData({ ...formData, mechanicType: e.target.value })
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                required
              >
                <option value="PERCENT">Yüzde</option>
                <option value="AMOUNT">Tutar</option>
                <option value="AMOUNT_PER_UNIT">Birim Başına Tutar</option>
              </select>
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox
                id="isActive"
                checked={
                  formData.isActive !== undefined ? formData.isActive : true
                }
                onCheckedChange={(checked) =>
                  setFormData({ ...formData, isActive: checked })
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
                {editingItem ? 'Güncelle' : 'Oluştur'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
