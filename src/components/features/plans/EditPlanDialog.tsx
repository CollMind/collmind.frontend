import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Plan, UpdatePlanDto } from '@/api/endpoints/plans.endpoints';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  channelEndpoints,
  categoryEndpoints,
  cplEndpoints,
} from '@/api/endpoints/master-data.endpoints';

interface EditPlanDialogProps {
  plan: Plan;
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: UpdatePlanDto) => Promise<void>;
  isSaving?: boolean;
}

const toDateInputValue = (dateStr?: string): string => {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return '';
  return d.toISOString().split('T')[0];
};

export function EditPlanDialog({
  plan,
  isOpen,
  onClose,
  onSave,
  isSaving = false,
}: EditPlanDialogProps) {
  const [formData, setFormData] = useState<UpdatePlanDto>({});
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Initialize form with plan data when dialog opens
  useEffect(() => {
    if (isOpen && plan) {
      setFormData({
        planName: plan.planName,
        description: plan.description || '',
        cplId: plan.cplId,
        channelId: plan.channelId,
        categoryId: plan.categoryId,
        startDate: toDateInputValue(plan.startDate),
        endDate: toDateInputValue(plan.endDate),
        comments: plan.comments || '',
      });
      setErrors({});
    }
  }, [isOpen, plan]);

  // Fetch master data
  const { data: cpls } = useQuery({
    queryKey: ['cpls'],
    queryFn: () => cplEndpoints.getAll().then((res) => res.data),
    enabled: isOpen,
  });

  const { data: channels } = useQuery({
    queryKey: ['channels'],
    queryFn: () => channelEndpoints.getAll().then((res) => res.data),
    enabled: isOpen,
  });

  const { data: categories } = useQuery({
    queryKey: ['categories'],
    queryFn: () => categoryEndpoints.getAll().then((res) => res.data),
    enabled: isOpen,
  });

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.planName?.trim()) {
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

  const handleSubmit = async () => {
    if (!validate()) return;

    // Build only changed fields
    const changes: UpdatePlanDto = {};
    if (formData.planName !== plan.planName) changes.planName = formData.planName;
    if (formData.description !== (plan.description || ''))
      changes.description = formData.description;
    if (formData.cplId !== plan.cplId) changes.cplId = formData.cplId;
    if (formData.channelId !== plan.channelId) changes.channelId = formData.channelId;
    if (formData.categoryId !== plan.categoryId) changes.categoryId = formData.categoryId;
    if (formData.startDate !== toDateInputValue(plan.startDate))
      changes.startDate = formData.startDate;
    if (formData.endDate !== toDateInputValue(plan.endDate))
      changes.endDate = formData.endDate;
    if (formData.comments !== (plan.comments || '')) changes.comments = formData.comments;

    // If nothing changed, just close
    if (Object.keys(changes).length === 0) {
      onClose();
      return;
    }

    await onSave(changes);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Plan Bilgilerini Düzenle</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Plan Name */}
          <div>
            <Label htmlFor="edit-planName">Plan Adı *</Label>
            <Input
              id="edit-planName"
              value={formData.planName || ''}
              onChange={(e) => setFormData({ ...formData, planName: e.target.value })}
              placeholder="Örn: Q1 2026 NKA Promosyon Planı"
              className={errors.planName ? 'border-red-500' : ''}
            />
            {errors.planName && (
              <p className="text-sm text-red-500 mt-1">{errors.planName}</p>
            )}
          </div>

          {/* Description */}
          <div>
            <Label htmlFor="edit-description">Açıklama</Label>
            <Input
              id="edit-description"
              value={formData.description || ''}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Plan açıklaması..."
            />
          </div>

          {/* Channel, CPL, Category */}
          <div className="grid grid-cols-3 gap-4">
            <div>
              <Label>Kanal *</Label>
              <Select
                value={formData.channelId}
                onValueChange={(value) => setFormData({ ...formData, channelId: value })}
              >
                <SelectTrigger className={errors.channelId ? 'border-red-500' : ''}>
                  <SelectValue placeholder="Kanal seçin" />
                </SelectTrigger>
                <SelectContent>
                  {channels?.map((channel: any) => (
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
              <Label>CPL *</Label>
              <Select
                value={formData.cplId}
                onValueChange={(value) => setFormData({ ...formData, cplId: value })}
              >
                <SelectTrigger className={errors.cplId ? 'border-red-500' : ''}>
                  <SelectValue placeholder="CPL seçin" />
                </SelectTrigger>
                <SelectContent>
                  {cpls?.map((cpl: any) => (
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
              <Label>Kategori *</Label>
              <Select
                value={formData.categoryId}
                onValueChange={(value) => setFormData({ ...formData, categoryId: value })}
              >
                <SelectTrigger className={errors.categoryId ? 'border-red-500' : ''}>
                  <SelectValue placeholder="Kategori seçin" />
                </SelectTrigger>
                <SelectContent>
                  {categories?.map((category: any) => (
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

          {/* Period */}
          <div>
            <Label>Dönem *</Label>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Input
                  type="date"
                  value={formData.startDate || ''}
                  onChange={(e) =>
                    setFormData({ ...formData, startDate: e.target.value })
                  }
                  className={errors.startDate ? 'border-red-500' : ''}
                />
                {errors.startDate && (
                  <p className="text-sm text-red-500 mt-1">{errors.startDate}</p>
                )}
              </div>
              <div>
                <Input
                  type="date"
                  value={formData.endDate || ''}
                  onChange={(e) =>
                    setFormData({ ...formData, endDate: e.target.value })
                  }
                  className={errors.endDate ? 'border-red-500' : ''}
                />
                {errors.endDate && (
                  <p className="text-sm text-red-500 mt-1">{errors.endDate}</p>
                )}
              </div>
            </div>
          </div>

          {/* Comments */}
          <div>
            <Label htmlFor="edit-comments">Notlar</Label>
            <Input
              id="edit-comments"
              value={formData.comments || ''}
              onChange={(e) => setFormData({ ...formData, comments: e.target.value })}
              placeholder="Onaylayan için notlar..."
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isSaving}>
            İptal
          </Button>
          <Button onClick={handleSubmit} disabled={isSaving}>
            {isSaving ? 'Kaydediliyor...' : 'Kaydet'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
