import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
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
import { tacticEndpoints } from '@/api/endpoints/master-data.endpoints';
import { useMutation } from '@tanstack/react-query';
import { Loader2 } from 'lucide-react';

interface CreateTacticModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess: (tactic: any) => void;
}

export function CreateTacticModal({
  open,
  onClose,
  onSuccess,
}: CreateTacticModalProps) {
  const [formData, setFormData] = useState({
    code: '',
    name: '',
    description: '',
    tacticType: '',
    spendType: '',
    isActive: true,
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  const createMutation = useMutation({
    mutationFn: (data: any) => tacticEndpoints.create(data),
    onSuccess: (response) => {
      onSuccess(response.data);
      // Reset form
      setFormData({
        code: '',
        name: '',
        description: '',
        tacticType: '',
        spendType: '',
        isActive: true,
      });
      setErrors({});
    },
    onError: (error: any) => {
      console.error('Tactic creation error:', error);
      setErrors({
        submit:
          error.response?.data?.message ||
          'Taktik oluşturulurken bir hata oluştu',
      });
    },
  });

  const validate = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.code.trim()) {
      newErrors.code = 'Kod zorunludur';
    }
    if (!formData.name.trim()) {
      newErrors.name = 'İsim zorunludur';
    }
    if (!formData.tacticType) {
      newErrors.tacticType = 'Taktik tipi zorunludur';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = () => {
    if (!validate()) return;
    createMutation.mutate(formData);
  };

  const handleClose = () => {
    setFormData({
      code: '',
      name: '',
      description: '',
      tacticType: '',
      spendType: '',
      isActive: true,
    });
    setErrors({});
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Yeni Taktik Oluştur</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="code">
                Kod <span className="text-red-500">*</span>
              </Label>
              <Input
                id="code"
                value={formData.code}
                onChange={(e) =>
                  setFormData({ ...formData, code: e.target.value })
                }
                placeholder="TKT-001"
                className={errors.code ? 'border-red-500' : ''}
              />
              {errors.code && (
                <p className="text-xs text-red-600 mt-1">{errors.code}</p>
              )}
            </div>
            <div>
              <Label htmlFor="name">
                İsim <span className="text-red-500">*</span>
              </Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
                placeholder="İndirim Kampanyası"
                className={errors.name ? 'border-red-500' : ''}
              />
              {errors.name && (
                <p className="text-xs text-red-600 mt-1">{errors.name}</p>
              )}
            </div>
          </div>

          <div>
            <Label htmlFor="description">Açıklama</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) =>
                setFormData({ ...formData, description: e.target.value })
              }
              placeholder="Taktik açıklaması..."
              rows={3}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="tacticType">
                Taktik Tipi <span className="text-red-500">*</span>
              </Label>
              <Select
                value={formData.tacticType}
                onValueChange={(val) =>
                  setFormData({ ...formData, tacticType: val })
                }
              >
                <SelectTrigger
                  className={errors.tacticType ? 'border-red-500' : ''}
                >
                  <SelectValue placeholder="Seçiniz" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="DISCOUNT">İndirim</SelectItem>
                  <SelectItem value="LUMP_SUM">Toplu Ödeme</SelectItem>
                  <SelectItem value="VOLUME_REBATE">Hacim İndirimi</SelectItem>
                  <SelectItem value="CO_OP">Co-op</SelectItem>
                  <SelectItem value="LISTING_FEE">Listeleme Ücreti</SelectItem>
                  <SelectItem value="OTHER">Diğer</SelectItem>
                </SelectContent>
              </Select>
              {errors.tacticType && (
                <p className="text-xs text-red-600 mt-1">{errors.tacticType}</p>
              )}
            </div>

            <div>
              <Label htmlFor="spendType">Harcama Tipi</Label>
              <Select
                value={formData.spendType}
                onValueChange={(val) =>
                  setFormData({ ...formData, spendType: val })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Seçiniz" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ON_INVOICE">On-Invoice</SelectItem>
                  <SelectItem value="OFF_INVOICE">Off-Invoice</SelectItem>
                  <SelectItem value="BOTH">Her İkisi</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {errors.submit && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-md">
              <p className="text-sm text-red-600">{errors.submit}</p>
            </div>
          )}

          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={handleClose}>
              İptal
            </Button>
            <Button
              type="button"
              onClick={handleSubmit}
              disabled={createMutation.isPending}
            >
              {createMutation.isPending && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              {createMutation.isPending ? 'Oluşturuluyor...' : 'Oluştur'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
