import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { skuEndpoints } from '@/api/endpoints/master-data.endpoints';
import {
  useSkus,
  useBrands,
  useCategories,
  useGenericUnits,
} from '@/hooks/useMasterData';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/hooks/useToast';
import {
  Plus,
  Edit,
  Trash2,
  Search,
  Upload,
  Hash,
  Tag,
  DollarSign,
  Package,
} from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { BrandSelect } from '@/components/common/BrandSelect';
import { CategorySelect } from '@/components/common/CategorySelect';
import { GenericUnitSelect } from '@/components/common/GenericUnitSelect';

interface Sku {
  id: string;
  code: string;
  name: string;
  description?: string;
  size?: string;
  unitPrice?: number;
  cogs?: number;
  isActive?: boolean;
  genericUnit?: {
    id: string;
    code: string;
    name: string;
    brand?: {
      id: string;
      code: string;
      name: string;
    };
    category?: {
      id: string;
      code: string;
      name: string;
    };
  };
}

export function SkuManagementPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedBrand, setSelectedBrand] = useState<string>('all');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingSku, setEditingSku] = useState<Sku | null>(null);
  const [formData, setFormData] = useState({
    code: '',
    name: '',
    description: '',
    brandId: '',
    categoryId: '',
    unitPrice: '',
    cogs: '',
    isActive: true,
  });
  const toast = useToast();
  const queryClient = useQueryClient();

  const { data: brands = [] } = useBrands(true);
  const { data: categories = [] } = useCategories(true);
  const { data: genericUnits = [] } = useGenericUnits(true);
  const { data: skus = [], isLoading } = useSkus(
    false,
    undefined,
    selectedBrand !== 'all' ? selectedBrand : undefined,
    selectedCategory !== 'all' ? selectedCategory : undefined
  );

  // Filter SKUs
  const filteredSkus = useMemo(() => {
    let filtered = skus;

    if (searchTerm) {
      filtered = filtered.filter(
        (sku) =>
          sku.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
          sku.name.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (selectedStatus !== 'all') {
      const isActive = selectedStatus === 'active';
      filtered = filtered.filter(
        (sku) => (sku.isActive !== false) === isActive
      );
    }

    return filtered;
  }, [skus, searchTerm, selectedStatus]);

  const createMutation = useMutation({
    mutationFn: (data: any) => skuEndpoints.create(data),
    onSuccess: () => {
      toast.success('SKU başarıyla oluşturuldu');
      queryClient.invalidateQueries({ queryKey: ['skus'] });
      queryClient.invalidateQueries({ queryKey: ['generic-units'] });
      handleDialogClose();
    },
    onError: (error: any) => {
      console.error('SKU oluşturma hatası:', error);
      const errorMessage =
        error?.response?.data?.message ||
        error?.message ||
        'SKU oluşturulurken hata oluştu';
      toast.error(errorMessage);
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) =>
      skuEndpoints.update(id, data),
    onSuccess: () => {
      toast.success('SKU başarıyla güncellendi');
      queryClient.invalidateQueries({ queryKey: ['skus'] });
      handleDialogClose();
    },
    onError: (error: any) => {
      toast.error(
        error?.response?.data?.message || 'SKU güncellenirken hata oluştu'
      );
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => skuEndpoints.delete(id),
    onSuccess: () => {
      toast.success('SKU başarıyla silindi');
      queryClient.invalidateQueries({ queryKey: ['skus'] });
    },
    onError: (error: any) => {
      toast.error(
        error?.response?.data?.message || 'SKU silinirken hata oluştu'
      );
    },
  });

  const handleCreate = () => {
    setEditingSku(null);
    setFormData({
      code: '',
      name: '',
      description: '',
      brandId: '',
      categoryId: '',
      unitPrice: '',
      cogs: '',
      isActive: true,
    });
    setIsDialogOpen(true);
  };

  const handleEdit = (sku: Sku) => {
    setEditingSku(sku);
    setFormData({
      code: sku.code,
      name: sku.name,
      description: sku.description || '',
      brandId: sku.genericUnit?.brand?.id || '',
      categoryId: sku.genericUnit?.category?.id || '',
      unitPrice: sku.unitPrice?.toString() || '',
      cogs: sku.cogs?.toString() || '',
      isActive: sku.isActive !== false,
    });
    setIsDialogOpen(true);
  };

  const handleDialogClose = () => {
    setIsDialogOpen(false);
    setEditingSku(null);
    setFormData({
      code: '',
      name: '',
      description: '',
      brandId: '',
      categoryId: '',
      unitPrice: '',
      cogs: '',
      isActive: true,
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    console.log('Form submit başladı', {
      formData,
      genericUnitsCount: genericUnits.length,
    });

    // Validate required fields
    if (
      !formData.code?.trim() ||
      !formData.name?.trim() ||
      !formData.brandId ||
      !formData.categoryId
    ) {
      console.log('Validasyon hatası: Zorunlu alanlar eksik');
      toast.error('Lütfen tüm zorunlu alanları doldurun');
      return;
    }

    const unitPrice = formData.unitPrice ? parseFloat(formData.unitPrice) : 0;
    const cogs = formData.cogs ? parseFloat(formData.cogs) : 0;

    if (!formData.unitPrice || isNaN(unitPrice) || unitPrice <= 0) {
      console.log('Validasyon hatası: Liste fiyatı geçersiz', unitPrice);
      toast.error('Lütfen geçerli bir liste fiyatı giriniz');
      return;
    }

    if (!formData.cogs || isNaN(cogs) || cogs <= 0) {
      console.log('Validasyon hatası: COGS geçersiz', cogs);
      toast.error('Lütfen geçerli bir COGS değeri giriniz');
      return;
    }

    // Check if genericUnits are loaded
    if (!genericUnits || genericUnits.length === 0) {
      console.error('Generic Units yüklenemedi');
      toast.error("Generic Unit'ler yüklenemedi. Lütfen sayfayı yenileyin.");
      return;
    }

    // Debug: Log all Generic Units with their brand/category info BEFORE searching
    console.log('🔍 Generic Unit aranıyor:', {
      formBrandId: formData.brandId,
      formCategoryId: formData.categoryId,
      availableGenericUnits: genericUnits.map((gu: any) => ({
        id: gu.id,
        code: gu.code,
        name: gu.name,
        brandId: gu.brandId,
        categoryId: gu.categoryId,
        brandIdFromRelation: gu.brand?.id,
        categoryIdFromRelation: gu.category?.id,
        brandName: gu.brand?.name,
        categoryName: gu.category?.name,
        fullGu: gu,
      })),
    });

    // Find Generic Unit by brand and category
    // Generic Unit might have brand and category as relations or direct IDs
    const genericUnit = genericUnits.find((gu: any) => {
      // Try multiple ways to get brand and category IDs
      const guBrandId = gu.brandId || gu.brand?.id;
      const guCategoryId = gu.categoryId || gu.category?.id;

      // Convert to string for comparison (in case of UUID vs string mismatch)
      const brandMatch =
        guBrandId &&
        formData.brandId &&
        String(guBrandId) === String(formData.brandId);
      const categoryMatch =
        guCategoryId &&
        formData.categoryId &&
        String(guCategoryId) === String(formData.categoryId);

      if (brandMatch && categoryMatch) {
        console.log('✅ Generic Unit bulundu:', {
          gu,
          guBrandId,
          guCategoryId,
          formBrandId: formData.brandId,
          formCategoryId: formData.categoryId,
        });
        return true;
      }

      // Debug: Log why this GU doesn't match
      if (guBrandId && guCategoryId) {
        console.log('❌ Generic Unit eşleşmedi:', {
          guCode: gu.code,
          guBrandId,
          formBrandId: formData.brandId,
          brandMatch,
          guCategoryId,
          formCategoryId: formData.categoryId,
          categoryMatch,
        });
      }

      return false;
    });

    if (!genericUnit) {
      const brandName =
        brands.find((b: any) => b.id === formData.brandId)?.name ||
        'Seçilen marka';
      const categoryName =
        categories.find((c: any) => c.id === formData.categoryId)?.name ||
        'Seçilen kategori';

      // Show available Generic Units for debugging
      const availableCombinations = genericUnits
        .map((gu: any) => {
          const guBrandId = gu.brandId || gu.brand?.id;
          const guCategoryId = gu.categoryId || gu.category?.id;
          const guBrandName =
            brands.find((b: any) => b.id === guBrandId)?.name || 'Bilinmeyen';
          const guCategoryName =
            categories.find((c: any) => c.id === guCategoryId)?.name ||
            'Bilinmeyen';
          return `${guBrandName} - ${guCategoryName}`;
        })
        .filter((combo: string) => combo !== 'Bilinmeyen - Bilinmeyen')
        .join(', ');

      console.error('Generic Unit bulunamadı:', {
        brandId: formData.brandId,
        categoryId: formData.categoryId,
        brandName,
        categoryName,
        availableGenericUnits: genericUnits.length,
        availableCombinations,
        allGenericUnits: genericUnits,
      });

      const errorMessage = availableCombinations
        ? `${brandName} ve ${categoryName} için Generic Unit bulunamadı. Mevcut kombinasyonlar: ${availableCombinations}. Lütfen önce Generic Unit oluşturun.`
        : `${brandName} ve ${categoryName} için Generic Unit bulunamadı. Lütfen önce Generic Unit oluşturun.`;

      toast.error(errorMessage);
      console.log('Form submit iptal edildi - Generic Unit bulunamadı');
      return;
    }

    const submitData = {
      code: formData.code.trim(),
      name: formData.name.trim(),
      description: formData.description?.trim() || '',
      guId: genericUnit.id,
      unitPrice: formData.unitPrice
        ? parseFloat(formData.unitPrice)
        : undefined,
      cogs: formData.cogs ? parseFloat(formData.cogs) : undefined,
      isActive: formData.isActive,
    };

    console.log('Form submit ediliyor:', {
      submitData,
      editingSku: editingSku?.id,
    });

    if (editingSku) {
      updateMutation.mutate({ id: editingSku.id, data: submitData });
    } else {
      createMutation.mutate(submitData);
    }
  };

  const handleDelete = (id: string) => {
    if (window.confirm("Bu SKU'yu silmek istediğinizden emin misiniz?")) {
      deleteMutation.mutate(id);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">SKU Yönetimi</h1>
          <p className="text-gray-600 mt-2">
            Ürün master datası ve fiyatlandırma yönetimi
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline">
            <Upload className="h-4 w-4 mr-2" />
            Import
          </Button>
          <Button onClick={handleCreate}>
            <Plus className="h-4 w-4 mr-2" />
            Yeni SKU
          </Button>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="flex gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
          <Input
            placeholder="Ürün kodu veya adı ile ara..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={selectedBrand} onValueChange={setSelectedBrand}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Tüm Markalar" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tüm Markalar</SelectItem>
            {brands.map((brand: any) => (
              <SelectItem key={brand.id} value={brand.id}>
                {brand.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={selectedCategory} onValueChange={setSelectedCategory}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Tüm Kategoriler" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tüm Kategoriler</SelectItem>
            {categories.map((cat: any) => (
              <SelectItem key={cat.id} value={cat.id}>
                {cat.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={selectedStatus} onValueChange={setSelectedStatus}>
          <SelectTrigger className="w-[120px]">
            <SelectValue placeholder="Durum" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Durum</SelectItem>
            <SelectItem value="active">Aktif</SelectItem>
            <SelectItem value="inactive">Pasif</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* SKU Table */}
      <div className="bg-white rounded-lg shadow">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Kod</TableHead>
              <TableHead>Ürün Adı</TableHead>
              <TableHead>Marka</TableHead>
              <TableHead>Kategori</TableHead>
              <TableHead>Liste Fiyatı</TableHead>
              <TableHead>COGS</TableHead>
              <TableHead>Durum</TableHead>
              <TableHead className="text-right">Aksiyon</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center">
                  Yükleniyor...
                </TableCell>
              </TableRow>
            ) : filteredSkus.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center">
                  Henüz SKU bulunmamaktadır
                </TableCell>
              </TableRow>
            ) : (
              filteredSkus.map((sku: Sku) => (
                <TableRow key={sku.id}>
                  <TableCell className="font-mono">{sku.code}</TableCell>
                  <TableCell>{sku.name}</TableCell>
                  <TableCell>{sku.genericUnit?.brand?.name || '-'}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      {sku.genericUnit?.category?.name || '-'}
                    </div>
                  </TableCell>
                  <TableCell>
                    {sku.unitPrice
                      ? new Intl.NumberFormat('tr-TR', {
                          style: 'currency',
                          currency: 'TRY',
                        }).format(sku.unitPrice)
                      : '-'}
                  </TableCell>
                  <TableCell>
                    {sku.cogs
                      ? new Intl.NumberFormat('tr-TR', {
                          style: 'currency',
                          currency: 'TRY',
                        }).format(sku.cogs)
                      : '-'}
                  </TableCell>
                  <TableCell>
                    <span
                      className={`inline-block w-2 h-2 rounded-full ${
                        sku.isActive !== false ? 'bg-green-500' : 'bg-gray-400'
                      }`}
                    />
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleEdit(sku)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDelete(sku.id)}
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

      {/* Create/Edit SKU Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={handleDialogClose}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Package className="h-5 w-5" />
              {editingSku ? 'SKU Düzenle' : 'Yeni SKU Ekle'}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="code">SKU Kodu *</Label>
              <div className="relative">
                <Hash className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  id="code"
                  value={formData.code}
                  onChange={(e) =>
                    setFormData({ ...formData, code: e.target.value })
                  }
                  placeholder="Örn: SKU-HC-001"
                  className="pl-10"
                  required
                />
              </div>
            </div>
            <div>
              <Label htmlFor="name">Ürün Adı *</Label>
              <div className="relative">
                <Tag className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  placeholder="Örn: Elidor Onarıcı Bakım 500ml"
                  className="pl-10"
                  required
                />
              </div>
            </div>
            <div>
              <Label htmlFor="brandId">Marka *</Label>
              <BrandSelect
                value={formData.brandId}
                onChange={(value) => {
                  setFormData({ ...formData, brandId: value, categoryId: '' });
                }}
                label={undefined}
                required
              />
            </div>
            <div>
              <Label htmlFor="categoryId">Kategori *</Label>
              <CategorySelect
                value={formData.categoryId}
                onChange={(value) => {
                  setFormData({ ...formData, categoryId: value });
                }}
                label={undefined}
                required
              />
            </div>
            <div>
              <Label htmlFor="unitPrice">Liste Fiyatı (₺) *</Label>
              <div className="relative">
                <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  id="unitPrice"
                  type="number"
                  step="0.01"
                  value={formData.unitPrice}
                  onChange={(e) =>
                    setFormData({ ...formData, unitPrice: e.target.value })
                  }
                  placeholder="0.00"
                  className="pl-10"
                  required
                />
              </div>
            </div>
            <div>
              <Label htmlFor="cogs">COGS (₺) *</Label>
              <div className="relative">
                <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  id="cogs"
                  type="number"
                  step="0.01"
                  value={formData.cogs}
                  onChange={(e) =>
                    setFormData({ ...formData, cogs: e.target.value })
                  }
                  placeholder="0.00"
                  className="pl-10"
                  required
                />
              </div>
            </div>
            <div>
              <Label>Durum</Label>
              <div className="flex gap-4 mt-2">
                <div
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg cursor-pointer border-2 ${
                    formData.isActive
                      ? 'bg-green-50 border-green-500 text-green-800'
                      : 'bg-gray-50 border-gray-300 text-gray-600'
                  }`}
                  onClick={() => setFormData({ ...formData, isActive: true })}
                >
                  <div
                    className={`w-3 h-3 rounded-full ${
                      formData.isActive ? 'bg-green-500' : 'bg-gray-400'
                    }`}
                  />
                  <span>Aktif</span>
                </div>
                <div
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg cursor-pointer border-2 ${
                    !formData.isActive
                      ? 'bg-gray-100 border-gray-500 text-gray-800'
                      : 'bg-gray-50 border-gray-300 text-gray-600'
                  }`}
                  onClick={() => setFormData({ ...formData, isActive: false })}
                >
                  <div
                    className={`w-3 h-3 rounded-full ${
                      !formData.isActive ? 'bg-gray-500' : 'bg-gray-400'
                    }`}
                  />
                  <span>Pasif</span>
                </div>
              </div>
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
                {createMutation.isPending || updateMutation.isPending
                  ? 'Kaydediliyor...'
                  : 'Kaydet'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
