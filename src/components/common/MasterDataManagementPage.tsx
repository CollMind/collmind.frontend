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

interface MasterDataManagementPageProps<T> {
  title: string;
  description: string;
  entityName: string;
  endpoints: {
    getAll: (activeOnly?: boolean, filter?: any) => Promise<{ data: T[] }>;
    create: (data: any) => Promise<any>;
    update: (id: string, data: any) => Promise<any>;
    delete: (id: string) => Promise<any>;
  };
  fields: Array<{
    key: string;
    label: string;
    type: 'text' | 'number' | 'textarea' | 'checkbox' | 'select';
    required?: boolean;
    options?: Array<{ value: string; label: string }>;
  }>;
  getDisplayValue: (item: T) => string;
  queryKey: string[];
}

export function MasterDataManagementPage<
  T extends { id: string; code: string; name: string; isActive?: boolean },
>({
  title,
  description,
  entityName,
  endpoints,
  fields,
  getDisplayValue,
  queryKey,
}: MasterDataManagementPageProps<T>) {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<T | null>(null);
  const [formData, setFormData] = useState<Record<string, any>>({});
  const toast = useToast();
  const queryClient = useQueryClient();

  const { data: items = [], isLoading } = useQuery({
    queryKey,
    queryFn: () => endpoints.getAll(false).then((res) => res.data),
  });

  const createMutation = useMutation({
    mutationFn: (data: any) => endpoints.create(data),
    onSuccess: () => {
      toast.success(`${entityName} başarıyla oluşturuldu`);
      queryClient.invalidateQueries({ queryKey });
      handleDialogClose();
    },
    onError: (error: any) => {
      toast.error(
        error?.response?.data?.message ||
          `${entityName} oluşturulurken hata oluştu`
      );
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) =>
      endpoints.update(id, data),
    onSuccess: () => {
      toast.success(`${entityName} başarıyla güncellendi`);
      queryClient.invalidateQueries({ queryKey });
      handleDialogClose();
    },
    onError: (error: any) => {
      toast.error(
        error?.response?.data?.message ||
          `${entityName} güncellenirken hata oluştu`
      );
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => endpoints.delete(id),
    onSuccess: () => {
      toast.success(`${entityName} başarıyla silindi`);
      queryClient.invalidateQueries({ queryKey });
    },
    onError: (error: any) => {
      toast.error(
        error?.response?.data?.message || `${entityName} silinirken hata oluştu`
      );
    },
  });

  const handleEdit = (item: T) => {
    setEditingItem(item);
    const initialData: Record<string, any> = {};
    fields.forEach((field) => {
      // For checkbox fields, default to true if undefined (especially for isActive)
      if (field.type === 'checkbox') {
        initialData[field.key] = (item as any)[field.key] ?? true;
      } else {
        initialData[field.key] = (item as any)[field.key] ?? '';
      }
    });
    setFormData(initialData);
    setIsDialogOpen(true);
  };

  const handleCreate = () => {
    setEditingItem(null);
    const initialData: Record<string, any> = {};
    fields.forEach((field) => {
      // For checkbox fields, default to true (especially for isActive)
      if (field.type === 'checkbox') {
        initialData[field.key] = true;
      } else {
        initialData[field.key] = '';
      }
    });
    setFormData(initialData);
    setIsDialogOpen(true);
  };

  const handleDialogClose = () => {
    setIsDialogOpen(false);
    setEditingItem(null);
    setFormData({});
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Ensure isActive is always included (default to true if not set)
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
    if (
      window.confirm(
        `Bu ${entityName.toLowerCase()}ı silmek istediğinizden emin misiniz?`
      )
    ) {
      deleteMutation.mutate(id);
    }
  };

  const renderField = (field: (typeof fields)[0]) => {
    const value = formData[field.key] ?? '';

    switch (field.type) {
      case 'textarea':
        return (
          <Textarea
            id={field.key}
            value={value}
            onChange={(e) =>
              setFormData({ ...formData, [field.key]: e.target.value })
            }
            rows={3}
            required={field.required}
          />
        );
      case 'checkbox':
        return (
          <div className="flex items-center space-x-2">
            <Checkbox
              id={field.key}
              checked={value}
              onCheckedChange={(checked) =>
                setFormData({ ...formData, [field.key]: checked })
              }
            />
            <Label htmlFor={field.key}>{field.label}</Label>
          </div>
        );
      case 'select':
        return (
          <select
            id={field.key}
            value={value}
            onChange={(e) =>
              setFormData({ ...formData, [field.key]: e.target.value })
            }
            className="w-full px-3 py-2 border border-gray-300 rounded-lg"
            required={field.required}
          >
            <option value="">Seçiniz</option>
            {field.options?.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        );
      case 'number':
        return (
          <Input
            id={field.key}
            type="number"
            value={value}
            onChange={(e) =>
              setFormData({
                ...formData,
                [field.key]: parseFloat(e.target.value) || 0,
              })
            }
            required={field.required}
          />
        );
      default:
        return (
          <Input
            id={field.key}
            value={value}
            onChange={(e) =>
              setFormData({ ...formData, [field.key]: e.target.value })
            }
            required={field.required}
          />
        );
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">{title}</h1>
          <p className="text-gray-600 mt-2">{description}</p>
        </div>
        <Button onClick={handleCreate}>
          <Plus className="h-4 w-4 mr-2" />
          Yeni {entityName}
        </Button>
      </div>

      <Dialog open={isDialogOpen} onOpenChange={handleDialogClose}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingItem ? `${entityName} Düzenle` : `Yeni ${entityName}`}
            </DialogTitle>
            <DialogDescription>
              {editingItem
                ? `${entityName} bilgilerini güncelleyin`
                : `Sisteme yeni bir ${entityName.toLowerCase()} ekleyin`}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            {fields.map((field) => (
              <div key={field.key}>
                {field.type !== 'checkbox' && (
                  <Label htmlFor={field.key}>
                    {field.label} {field.required && '*'}
                  </Label>
                )}
                {renderField(field)}
              </div>
            ))}
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
              items.map((item: T) => (
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
