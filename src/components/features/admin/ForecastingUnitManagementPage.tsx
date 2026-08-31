import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  fuEndpoints,
  skuEndpoints,
} from '@/api/endpoints/master-data.endpoints';
import {
  useForecastingUnits,
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
import { useToast } from '@/hooks/useToast';
import {
  Plus,
  Edit,
  Trash2,
  Package,
  Search,
  ChevronDown,
  Check,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { CategorySelect } from '@/components/common/CategorySelect';
import { GenericUnitSelect } from '@/components/common/GenericUnitSelect';

interface ForecastingUnit {
  id: string;
  code: string;
  name: string;
  description?: string;
  size?: string;
  segment?: string;
  defaultBaseVolume?: number;
  isActive?: boolean;
  genericUnit?: {
    id: string;
    code: string;
    name: string;
    category?: {
      id: string;
      code: string;
      name: string;
    };
  };
  skus?: Array<{
    id: string;
    code: string;
    name: string;
  }>;
}

export function ForecastingUnitManagementPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isAssignSkuDialogOpen, setIsAssignSkuDialogOpen] = useState(false);
  const [editingFu, setEditingFu] = useState<ForecastingUnit | null>(null);
  const [selectedFuForSku, setSelectedFuForSku] =
    useState<ForecastingUnit | null>(null);
  const [createStep, setCreateStep] = useState(1);
  const [formData, setFormData] = useState({
    categoryId: '',
    guId: '',
    code: '',
    name: '',
    description: '',
    selectedSkuIds: [] as string[],
  });
  const [skuSearchTerm, setSkuSearchTerm] = useState('');
  const toast = useToast();
  const queryClient = useQueryClient();

  const { data: categories = [] } = useCategories(true);
  const { data: fus = [], isLoading } = useForecastingUnits(
    false,
    undefined,
    selectedCategory !== 'all' ? selectedCategory : undefined
  );
  const { data: genericUnits = [] } = useGenericUnits(true);

  // Filter by category
  const filteredFus = useMemo(() => {
    let filtered = fus;

    if (searchTerm) {
      filtered = filtered.filter(
        (fu) =>
          fu.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
          fu.name.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    return filtered;
  }, [fus, searchTerm]);

  // Get SKUs for each FU
  const { data: allSkus = [] } = useQuery({
    queryKey: ['skus', false],
    queryFn: () =>
      skuEndpoints
        .getAll(false)
        .then((res) => res.data || [])
        .catch(() => []),
  });

  // Calculate metrics for each FU
  const fusWithMetrics = useMemo(() => {
    return filteredFus.map((fu) => {
      const assignedSkus = allSkus.filter((sku: any) => sku.fuId === fu.id);
      const totalBaseVol = fu.defaultBaseVolume || 0;
      // ⛔ `activePlans` KALDIRILDI (`Z75 §5` `K5`, 2026-08-31): değeri
      // `const activePlans = 0; // Placeholder` idi ve ekranda "AKTİF PLAN 0"
      // olarak YEŞİL bir sayı gibi basılıyordu. Bir FU'nun kaç aktif planda
      // kullanıldığını söyleyen bir uç FE'de YOK (ölçüldü) — yani bu bir
      // ölçüm değil, ölçüm KILIĞINDA bir sabitti. Sayının kaynağı
      // doğduğunda alan da rozetiyle birlikte geri gelir.

      return {
        ...fu,
        skus: assignedSkus,
        skuCount: assignedSkus.length,
        totalBaseVol,
      };
    });
  }, [filteredFus, allSkus]);

  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      // This is now handled in handleCreateSubmit
      return Promise.resolve({ data: { id: '' } });
    },
    onSuccess: () => {
      // Success is handled in handleCreateSubmit
    },
    onError: (error: any) => {
      toast.error(
        error?.response?.data?.message || 'FU oluşturulurken hata oluştu'
      );
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) =>
      fuEndpoints.update(id, data),
    onSuccess: () => {
      toast.success('FU başarıyla güncellendi');
      queryClient.invalidateQueries({ queryKey: ['forecasting-units'] });
      handleEditDialogClose();
    },
    onError: (error: any) => {
      toast.error(
        error?.response?.data?.message || 'FU güncellenirken hata oluştu'
      );
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => fuEndpoints.delete(id),
    onSuccess: () => {
      toast.success('FU başarıyla silindi');
      queryClient.invalidateQueries({ queryKey: ['forecasting-units'] });
    },
    onError: (error: any) => {
      toast.error(
        error?.response?.data?.message || 'FU silinirken hata oluştu'
      );
    },
  });

  const assignSkuMutation = useMutation({
    mutationFn: ({ skuId, fuId }: { skuId: string; fuId: string }) =>
      skuEndpoints.assignToFu(skuId, fuId),
    onSuccess: () => {
      toast.success('SKU başarıyla atandı');
      queryClient.invalidateQueries({ queryKey: ['skus'] });
      queryClient.invalidateQueries({ queryKey: ['forecasting-units'] });
      setIsAssignSkuDialogOpen(false);
    },
    onError: (error: any) => {
      toast.error(
        error?.response?.data?.message || 'SKU atanırken hata oluştu'
      );
    },
  });

  const handleCreate = () => {
    setCreateStep(1);
    setFormData({
      categoryId: '',
      guId: '',
      code: '',
      name: '',
      description: '',
      selectedSkuIds: [],
    });
    setSkuSearchTerm('');
    setIsCreateDialogOpen(true);
  };

  const handleCreateDialogClose = () => {
    setIsCreateDialogOpen(false);
    setCreateStep(1);
    setFormData({
      categoryId: '',
      guId: '',
      code: '',
      name: '',
      description: '',
      selectedSkuIds: [],
    });
    setSkuSearchTerm('');
  };

  const handleEdit = (fu: ForecastingUnit) => {
    setEditingFu(fu);
    // Get SKU IDs for this FU
    const fuSkuIds = fu.skus?.map((sku: any) => sku.id) || [];
    setFormData({
      categoryId: fu.genericUnit?.category?.id || '',
      guId: fu.genericUnit?.id || '',
      code: fu.code,
      name: fu.name,
      description: fu.description || '',
      selectedSkuIds: fuSkuIds,
    });
    setIsEditDialogOpen(true);
  };

  const handleEditDialogClose = () => {
    setIsEditDialogOpen(false);
    setEditingFu(null);
    setFormData({
      categoryId: '',
      guId: '',
      code: '',
      name: '',
      description: '',
      selectedSkuIds: [],
    });
  };

  const handleAssignSku = (fu: ForecastingUnit) => {
    setSelectedFuForSku(fu);
    setIsAssignSkuDialogOpen(true);
  };

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (createStep === 1) {
      if (!formData.categoryId || !formData.code || !formData.name) {
        toast.error('Lütfen kategori, FU kodu ve adını giriniz');
        return;
      }
      // Check if there's a GU for this category
      const categoryGu = genericUnits.find(
        (gu: any) => gu.categoryId === formData.categoryId
      );
      if (!categoryGu) {
        toast.error(
          'Bu kategori için Generic Unit bulunamadı. Lütfen önce Generic Unit oluşturun.'
        );
        return;
      }
      setFormData((prev) => ({ ...prev, guId: categoryGu.id }));
      setCreateStep(2);
    } else {
      if (!formData.guId) {
        toast.error('Generic Unit bulunamadı');
        return;
      }

      // Create FU first
      const createData = {
        guId: formData.guId,
        code: formData.code.trim(),
        name: formData.name.trim(),
        description: formData.description?.trim() || '',
      };

      try {
        const response = await fuEndpoints.create(createData);
        const newFuId = response.data?.id || response.data?.data?.id;

        if (!newFuId) {
          throw new Error('FU oluşturuldu ancak ID alınamadı');
        }

        // Assign selected SKUs to the new FU
        if (formData.selectedSkuIds && formData.selectedSkuIds.length > 0) {
          await Promise.all(
            formData.selectedSkuIds.map((skuId) =>
              skuEndpoints.assignToFu(skuId, newFuId).catch((err) => {
                console.error(`SKU ${skuId} atanırken hata:`, err);
                // Continue with other SKUs even if one fails
              })
            )
          );
        }

        toast.success('FU başarıyla oluşturuldu');
        queryClient.invalidateQueries({ queryKey: ['forecasting-units'] });
        queryClient.invalidateQueries({ queryKey: ['skus'] });
        handleCreateDialogClose();
      } catch (error: any) {
        console.error('FU oluşturma hatası:', error);
        toast.error(
          error?.response?.data?.message ||
            error?.message ||
            'FU oluşturulurken hata oluştu'
        );
      }
    }
  };

  const handleEditSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingFu) return;
    updateMutation.mutate({
      id: editingFu.id,
      data: {
        guId: formData.guId,
        code: formData.code,
        name: formData.name,
        description: formData.description,
      },
    });
  };

  const handleDelete = (id: string) => {
    if (window.confirm("Bu FU'yu silmek istediğinizden emin misiniz?")) {
      deleteMutation.mutate(id);
    }
  };

  const handleAssignSkuSubmit = (skuId: string) => {
    if (!selectedFuForSku) return;
    assignSkuMutation.mutate({ skuId, fuId: selectedFuForSku.id });
  };

  // Get available SKUs (not assigned to any FU or assigned to this FU)
  const availableSkus = useMemo(() => {
    if (!selectedFuForSku) return [];
    return allSkus.filter(
      (sku: any) => !sku.fuId || sku.fuId === selectedFuForSku.id
    );
  }, [allSkus, selectedFuForSku]);

  // Get SKUs for step 2 (filtered by category and search)
  const availableSkusForSelection = useMemo(() => {
    if (!formData.categoryId) return [];
    if (!allSkus || allSkus.length === 0) return [];

    let filtered = allSkus.filter((sku: any) => {
      if (!sku) return false;
      // Filter by category (through GU)
      // SKU might have genericUnit relation loaded or just categoryId
      const skuCategoryId =
        sku.genericUnit?.categoryId ||
        sku.genericUnit?.category?.id ||
        sku.categoryId;
      const matchesCategory = skuCategoryId === formData.categoryId;

      // Filter by search term
      const matchesSearch =
        !skuSearchTerm ||
        (sku.code &&
          sku.code.toLowerCase().includes(skuSearchTerm.toLowerCase())) ||
        (sku.name &&
          sku.name.toLowerCase().includes(skuSearchTerm.toLowerCase()));

      return matchesCategory && matchesSearch;
    });
    return filtered;
  }, [allSkus, formData.categoryId, skuSearchTerm]);

  // Calculate total volume for selected SKUs
  const totalVolume = useMemo(() => {
    if (!formData.selectedSkuIds || formData.selectedSkuIds.length === 0) {
      return 0;
    }
    const volume = formData.selectedSkuIds.reduce((total, skuId) => {
      const sku = allSkus.find((s: any) => s.id === skuId);
      if (!sku) return total;
      // Use defaultBaseVolume or unitPrice as volume indicator
      const skuVolume = sku.defaultBaseVolume || sku.unitPrice || 0;
      const numericVolume =
        typeof skuVolume === 'number' ? skuVolume : parseFloat(skuVolume) || 0;
      return total + numericVolume;
    }, 0);
    return isNaN(volume) ? 0 : volume;
  }, [formData.selectedSkuIds, allSkus]);

  const handleSkuToggle = (skuId: string) => {
    setFormData((prev) => {
      const currentIds = prev.selectedSkuIds || [];
      return {
        ...prev,
        selectedSkuIds: currentIds.includes(skuId)
          ? currentIds.filter((id) => id !== skuId)
          : [...currentIds, skuId],
      };
    });
  };

  const handleUnassignSku = (skuId: string) => {
    if (!selectedFuForSku) return;
    assignSkuMutation.mutate({ skuId, fuId: '' });
  };

  // Filter GU by category
  const filteredGenericUnits = useMemo(() => {
    if (!formData.categoryId) return genericUnits;
    return genericUnits.filter(
      (gu: any) => gu.categoryId === formData.categoryId
    );
  }, [genericUnits, formData.categoryId]);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">FU Yönetimi</h1>
          <p className="text-gray-600 mt-2">
            Forecasting Unit'lar (FU), SKU'ların planlama için gruplandığı
            birimlerdir.
          </p>
        </div>
        <Button onClick={handleCreate}>
          <Plus className="h-4 w-4 mr-2" />
          Yeni FU
        </Button>
      </div>

      {/* Search and Filter */}
      <div className="flex gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
          <Input
            placeholder="FU kodu veya adı ile ara..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={selectedCategory} onValueChange={setSelectedCategory}>
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="Kategori: Tümü" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tümü</SelectItem>
            {categories.map((cat: any) => (
              <SelectItem key={cat.id} value={cat.id}>
                {cat.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* FU Cards Grid */}
      {isLoading ? (
        <div className="text-center py-12">Yükleniyor...</div>
      ) : fusWithMetrics.length === 0 ? (
        <div className="text-center py-12 text-gray-500">
          Henüz FU bulunmamaktadır
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {fusWithMetrics.map((fu) => (
            <Card key={fu.id} className="hover:shadow-lg transition-shadow">
              <CardContent className="p-6">
                <div className="flex justify-between items-start mb-4">
                  <span className="text-sm font-mono text-gray-500">
                    {fu.code}
                  </span>
                  <Badge variant="outline">
                    {fu.genericUnit?.category?.code || 'N/A'}
                  </Badge>
                </div>
                <h3 className="text-lg font-semibold mb-2">{fu.name}</h3>
                <p className="text-sm text-gray-500 mb-4">
                  {fu.description || 'Açıklama yok.'}
                </p>
                <div className="flex items-center gap-2 mb-4 text-sm text-gray-600">
                  <Package className="h-4 w-4" />
                  <span>{fu.skuCount} SKU Atanmış</span>
                </div>
                {fu.skus && fu.skus.length > 0 && (
                  <div className="mb-4 space-y-1">
                    {fu.skus.slice(0, 3).map((sku: any) => (
                      <div key={sku.id} className="text-sm text-gray-600">
                        • {sku.code}: {sku.name}
                      </div>
                    ))}
                    {fu.skus.length > 3 && (
                      <div className="text-sm text-gray-500">
                        ... ve {fu.skus.length - 3} SKU daha
                      </div>
                    )}
                  </div>
                )}
                <div className="grid grid-cols-1 gap-4 mb-4">
                  <div>
                    <div className="text-xs text-gray-500 mb-1">
                      TOPLAM BASE VOL
                    </div>
                    <div className="text-lg font-semibold">
                      {fu.totalBaseVol.toFixed(3)}
                    </div>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleEdit(fu)}
                    className="flex-1"
                  >
                    <Edit className="h-4 w-4 mr-1" />
                    Düzenle
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleAssignSku(fu)}
                    className="flex-1"
                  >
                    <Package className="h-4 w-4 mr-1" />
                    SKU Ata
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleDelete(fu.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Create FU Dialog - Step 1 */}
      <Dialog open={isCreateDialogOpen} onOpenChange={handleCreateDialogClose}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Yeni FU Oluştur</DialogTitle>
            <DialogDescription>Adım {createStep}/2</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreateSubmit} className="space-y-4">
            {createStep === 1 ? (
              <>
                <div>
                  <Label htmlFor="categoryId">Kategori *</Label>
                  <CategorySelect
                    value={formData.categoryId}
                    onChange={(value) => {
                      setFormData({
                        ...formData,
                        categoryId: value,
                        guId: '',
                        selectedSkuIds: [],
                      });
                    }}
                    label={undefined}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="code">FU Kodu *</Label>
                  <Input
                    id="code"
                    value={formData.code}
                    onChange={(e) =>
                      setFormData({ ...formData, code: e.target.value })
                    }
                    placeholder="ÖRN: FU-HC-001"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="name">FU Adı *</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) =>
                      setFormData({ ...formData, name: e.target.value })
                    }
                    placeholder="Örn: Wella SP Balance Range"
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
                    placeholder="FU kapsamı hakkında bilgi..."
                    rows={3}
                  />
                </div>
                <div className="flex justify-end gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleCreateDialogClose}
                  >
                    İptal
                  </Button>
                  <Button type="submit">Devam Et →</Button>
                </div>
              </>
            ) : (
              <>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                  <Input
                    placeholder="SKU ara..."
                    value={skuSearchTerm}
                    onChange={(e) => setSkuSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
                <div className="border rounded-lg max-h-[400px] overflow-y-auto min-h-[300px]">
                  {availableSkusForSelection.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-[300px] text-gray-500">
                      <Package className="h-12 w-12 mb-4 text-gray-400" />
                      <p>SKU bulunamadı.</p>
                    </div>
                  ) : (
                    <div className="p-4 space-y-2">
                      {availableSkusForSelection.map((sku: any) => (
                        <label
                          key={sku.id}
                          className={`flex items-center justify-between p-3 border rounded-lg cursor-pointer hover:bg-gray-50 ${
                            formData.selectedSkuIds?.includes(sku.id)
                              ? 'bg-blue-50 border-blue-300'
                              : ''
                          }`}
                        >
                          <div className="flex items-center gap-3 flex-1">
                            <Checkbox
                              checked={
                                formData.selectedSkuIds?.includes(sku.id) ||
                                false
                              }
                              onCheckedChange={() => handleSkuToggle(sku.id)}
                            />
                            <div className="flex-1">
                              <div className="font-medium">{sku.code}</div>
                              <div className="text-sm text-gray-500">
                                {sku.name}
                              </div>
                            </div>
                          </div>
                        </label>
                      ))}
                    </div>
                  )}
                </div>
                <div className="flex justify-between items-center pt-2 border-t">
                  <div className="text-sm text-gray-600">
                    {formData.selectedSkuIds?.length || 0} SKU Seçildi
                  </div>
                  <div className="text-sm text-gray-600">
                    Toplam Hacim:{' '}
                    {typeof totalVolume === 'number' && !isNaN(totalVolume)
                      ? totalVolume.toFixed(2)
                      : '0.00'}
                  </div>
                </div>
                <div className="flex justify-end gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setCreateStep(1)}
                  >
                    ← Geri
                  </Button>
                  <Button
                    type="submit"
                    disabled={createMutation.isPending}
                    className="bg-green-600 hover:bg-green-700"
                  >
                    {createMutation.isPending ? (
                      'Oluşturuluyor...'
                    ) : (
                      <>
                        <Check className="h-4 w-4 mr-2" />
                        Oluştur
                      </>
                    )}
                  </Button>
                </div>
              </>
            )}
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit FU Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={handleEditDialogClose}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>FU Düzenle</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleEditSubmit} className="space-y-4">
            <div>
              <Label htmlFor="edit-code">FU Kodu *</Label>
              <Input
                id="edit-code"
                value={formData.code}
                onChange={(e) =>
                  setFormData({ ...formData, code: e.target.value })
                }
                required
              />
            </div>
            <div>
              <Label htmlFor="edit-name">FU Adı *</Label>
              <Input
                id="edit-name"
                value={formData.name}
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
                required
              />
            </div>
            <div>
              <Label htmlFor="edit-description">Açıklama</Label>
              <Textarea
                id="edit-description"
                value={formData.description}
                onChange={(e) =>
                  setFormData({ ...formData, description: e.target.value })
                }
                rows={3}
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={handleEditDialogClose}
              >
                İptal
              </Button>
              <Button type="submit" disabled={updateMutation.isPending}>
                {updateMutation.isPending ? 'Güncelleniyor...' : 'Güncelle'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Assign SKU Dialog */}
      <Dialog
        open={isAssignSkuDialogOpen}
        onOpenChange={() => setIsAssignSkuDialogOpen(false)}
      >
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>SKU Ata: {selectedFuForSku?.name}</DialogTitle>
            <DialogDescription>
              Bu FU'ya atanacak SKU'ları seçin veya atanmış SKU'ları kaldırın
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2 max-h-[400px] overflow-y-auto">
            {availableSkus.length === 0 ? (
              <p className="text-gray-500 text-center py-4">
                Atanabilir SKU bulunmamaktadır
              </p>
            ) : (
              availableSkus.map((sku: any) => {
                const isAssigned = sku.fuId === selectedFuForSku?.id;
                return (
                  <div
                    key={sku.id}
                    className={`flex items-center justify-between p-3 border rounded-lg ${
                      isAssigned
                        ? 'bg-green-50 border-green-200'
                        : 'hover:bg-gray-50'
                    }`}
                  >
                    <div>
                      <div className="font-medium">{sku.code}</div>
                      <div className="text-sm text-gray-500">{sku.name}</div>
                    </div>
                    {isAssigned ? (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleUnassignSku(sku.id)}
                        disabled={assignSkuMutation.isPending}
                      >
                        Kaldır
                      </Button>
                    ) : (
                      <Button
                        size="sm"
                        onClick={() => handleAssignSkuSubmit(sku.id)}
                        disabled={assignSkuMutation.isPending}
                      >
                        Ata
                      </Button>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
