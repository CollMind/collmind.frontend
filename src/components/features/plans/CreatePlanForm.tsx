import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { CreatePlanDto } from '@/api/endpoints/plans.endpoints';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Card, CardContent } from '@/components/ui/card';
import {
  channelEndpoints,
  categoryEndpoints,
  cplEndpoints,
  regionEndpoints,
  fuEndpoints,
} from '@/api/endpoints/master-data.endpoints';

interface CreatePlanFormProps {
  onSubmit: (
    data: CreatePlanDto & { selectedFuIds?: string[] }
  ) => Promise<void>;
  onCancel?: () => void;
  isLoading?: boolean;
}

interface FuWithSkuCount {
  id: string;
  code: string;
  name: string;
  skuCount?: number;
}

export function CreatePlanForm({
  onSubmit,
  onCancel,
  isLoading = false,
}: CreatePlanFormProps) {
  const [formData, setFormData] = useState<CreatePlanDto>({
    planName: '',
    description: '',
    cplId: '',
    channelId: '',
    regionId: undefined,
    categoryId: '',
    startDate: '',
    endDate: '',
    comments: '',
  });

  const [selectedFuIds, setSelectedFuIds] = useState<Set<string>>(new Set());
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Fetch master data
  const { data: cpls } = useQuery({
    queryKey: ['cpls'],
    queryFn: () => cplEndpoints.getAll().then((res) => res.data),
  });

  const { data: channels } = useQuery({
    queryKey: ['channels'],
    queryFn: () => channelEndpoints.getAll().then((res) => res.data),
  });

  const { data: categories } = useQuery({
    queryKey: ['categories'],
    queryFn: () => categoryEndpoints.getAll().then((res) => res.data),
  });

  const { data: regions } = useQuery({
    queryKey: ['regions'],
    queryFn: () => regionEndpoints.getAll().then((res) => res.data),
  });

  // Fetch FUs based on selected category
  const { data: fus } = useQuery({
    queryKey: ['fus', formData.categoryId],
    queryFn: () =>
      fuEndpoints
        .getAll(true, undefined, formData.categoryId)
        .then((res) => res.data),
    enabled: !!formData.categoryId,
  });

  // Transform FUs to include SKU count (mock for now, backend should provide this)
  const fusWithSkuCount: FuWithSkuCount[] = (fus || []).map((fu: any) => ({
    id: fu.id,
    code: fu.code,
    name: fu.name,
    skuCount: fu.skus?.length || 0, // Backend should provide skuCount
  }));

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.planName.trim()) {
      newErrors.planName = 'Plan adı zorunludur';
    }
    if (!formData.cplId) {
      newErrors.cplId = 'Müşteri seçimi zorunludur';
    }
    if (!formData.channelId) {
      newErrors.channelId = 'Kanal seçimi zorunludur';
    }
    if (!formData.categoryId) {
      newErrors.categoryId = 'Kategori seçimi zorunludur';
    }
    if (!formData.startDate) {
      newErrors.startDate = 'Başlangıç tarihi zorunludur';
    }
    if (!formData.endDate) {
      newErrors.endDate = 'Bitiş tarihi zorunludur';
    }
    if (formData.startDate && formData.endDate) {
      const start = new Date(formData.startDate);
      const end = new Date(formData.endDate);
      if (end < start) {
        newErrors.endDate = 'Bitiş tarihi başlangıç tarihinden önce olamaz';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (validate()) {
      await onSubmit({
        ...formData,
        selectedFuIds: Array.from(selectedFuIds),
      });
    }
  };

  const handleFuToggle = (fuId: string, checked: boolean) => {
    const newSelected = new Set(selectedFuIds);
    if (checked) {
      newSelected.add(fuId);
    } else {
      newSelected.delete(fuId);
    }
    setSelectedFuIds(newSelected);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="space-y-4">
        <div>
          <Label htmlFor="planName">Plan Adı *</Label>
          <Input
            id="planName"
            value={formData.planName}
            onChange={(e) =>
              setFormData({ ...formData, planName: e.target.value })
            }
            placeholder="Örn: Q1 2026 NKA Promosyon Planı"
            className={errors.planName ? 'border-red-500' : ''}
          />
          {errors.planName && (
            <p className="text-sm text-red-500 mt-1">{errors.planName}</p>
          )}
        </div>

        <div className="grid grid-cols-3 gap-4">
          <div>
            <Label htmlFor="channelId">Kanal *</Label>
            <Select
              value={formData.channelId}
              onValueChange={(value) =>
                setFormData({ ...formData, channelId: value })
              }
            >
              <SelectTrigger
                className={errors.channelId ? 'border-red-500' : ''}
              >
                <SelectValue placeholder="Kanal seçin" />
              </SelectTrigger>
              <SelectContent>
                {channels?.map((channel) => (
                  <SelectItem key={channel.id} value={channel.id}>
                    {channel.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.channelId && (
              <p className="text-sm text-red-500 mt-1">{errors.channelId}</p>
            )}
          </div>

          <div>
            <Label htmlFor="cplId">CPL *</Label>
            <Select
              value={formData.cplId}
              onValueChange={(value) =>
                setFormData({ ...formData, cplId: value })
              }
            >
              <SelectTrigger className={errors.cplId ? 'border-red-500' : ''}>
                <SelectValue placeholder="CPL seçin" />
              </SelectTrigger>
              <SelectContent>
                {cpls?.map((cpl) => (
                  <SelectItem key={cpl.id} value={cpl.id}>
                    {cpl.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.cplId && (
              <p className="text-sm text-red-500 mt-1">{errors.cplId}</p>
            )}
          </div>

          <div>
            <Label htmlFor="categoryId">Kategori *</Label>
            <Select
              value={formData.categoryId}
              onValueChange={(value) => {
                setFormData({ ...formData, categoryId: value });
                setSelectedFuIds(new Set()); // Reset FU selection when category changes
              }}
            >
              <SelectTrigger
                className={errors.categoryId ? 'border-red-500' : ''}
              >
                <SelectValue placeholder="Kategori seçin" />
              </SelectTrigger>
              <SelectContent>
                {categories?.map((category) => (
                  <SelectItem key={category.id} value={category.id}>
                    {category.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.categoryId && (
              <p className="text-sm text-red-500 mt-1">{errors.categoryId}</p>
            )}
          </div>
        </div>

        <div>
          <Label htmlFor="period">Dönem *</Label>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Input
                id="startDate"
                type="date"
                value={formData.startDate}
                onChange={(e) =>
                  setFormData({ ...formData, startDate: e.target.value })
                }
                className={errors.startDate ? 'border-red-500' : ''}
                placeholder="Başlangıç tarihi"
              />
              {errors.startDate && (
                <p className="text-sm text-red-500 mt-1">{errors.startDate}</p>
              )}
            </div>
            <div>
              <Input
                id="endDate"
                type="date"
                value={formData.endDate}
                onChange={(e) =>
                  setFormData({ ...formData, endDate: e.target.value })
                }
                className={errors.endDate ? 'border-red-500' : ''}
                placeholder="Bitiş tarihi"
              />
              {errors.endDate && (
                <p className="text-sm text-red-500 mt-1">{errors.endDate}</p>
              )}
            </div>
          </div>
        </div>

        {/* FU Selection */}
        {formData.categoryId && (
          <div>
            <Label>FU SEÇİMİ (Opsiyonel)</Label>
            <Card className="mt-2">
              <CardContent className="p-4 max-h-[300px] overflow-y-auto">
                {fusWithSkuCount.length === 0 ? (
                  <p className="text-sm text-gray-500 text-center py-4">
                    Bu kategori için FU bulunamadı.
                  </p>
                ) : (
                  <div className="space-y-2">
                    {fusWithSkuCount.map((fu) => (
                      <div
                        key={fu.id}
                        className="flex items-center space-x-3 p-2 hover:bg-gray-50 rounded"
                      >
                        <Checkbox
                          id={`fu-${fu.id}`}
                          checked={selectedFuIds.has(fu.id)}
                          onCheckedChange={(checked) =>
                            handleFuToggle(fu.id, checked as boolean)
                          }
                        />
                        <label
                          htmlFor={`fu-${fu.id}`}
                          className="flex-1 cursor-pointer text-sm"
                        >
                          <span className="font-medium">
                            {fu.code}: {fu.name}
                          </span>
                          {fu.skuCount !== undefined && (
                            <span className="text-gray-500 ml-2">
                              ({fu.skuCount} SKU içeriyor)
                            </span>
                          )}
                        </label>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}
      </div>

      <div className="flex justify-end gap-3">
        {onCancel && (
          <Button type="button" variant="outline" onClick={onCancel}>
            İptal
          </Button>
        )}
        <Button type="submit" disabled={isLoading}>
          {isLoading ? 'Oluşturuluyor...' : 'Planı Oluştur'}
        </Button>
      </div>
    </form>
  );
}
