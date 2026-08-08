import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  CreateBudgetEnvelopeDto,
  BudgetEnvelopeStatus,
} from '@/types/budget.types';
import { CustomerChannel } from '@/types/customer.types';
import { categoryEndpoints } from '@/api/endpoints/master-data.endpoints';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { NumericInput } from '@/components/common/NumericInput';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Card, CardContent } from '@/components/ui/card';
import { Info, AlertCircle, Loader2 } from 'lucide-react';

interface BudgetEnvelopeFormProps {
  onSubmit: (data: CreateBudgetEnvelopeDto) => Promise<void>;
  onCancel?: () => void;
  initialData?: Partial<CreateBudgetEnvelopeDto>;
  isLoading?: boolean;
}

const MONTHS = [
  { value: '01', label: 'Ocak' },
  { value: '02', label: 'Şubat' },
  { value: '03', label: 'Mart' },
  { value: '04', label: 'Nisan' },
  { value: '05', label: 'Mayıs' },
  { value: '06', label: 'Haziran' },
  { value: '07', label: 'Temmuz' },
  { value: '08', label: 'Ağustos' },
  { value: '09', label: 'Eylül' },
  { value: '10', label: 'Ekim' },
  { value: '11', label: 'Kasım' },
  { value: '12', label: 'Aralık' },
];

const CHANNELS = Object.values(CustomerChannel);

export function BudgetEnvelopeForm({
  onSubmit,
  onCancel,
  initialData,
  isLoading = false,
}: BudgetEnvelopeFormProps) {
  const currentYear = new Date().getFullYear();
  const [fiscalYear, setFiscalYear] = useState(
    initialData?.fiscalYear || currentYear.toString()
  );
  const [month, setMonth] = useState(initialData?.month || '');
  const [channel, setChannel] = useState(initialData?.channel || '');
  const [category, setCategory] = useState(initialData?.category || '');
  const [allocatedAmount, setAllocatedAmount] = useState(
    initialData?.allocatedAmount || 0
  );
  const [currency, setCurrency] = useState<'TRY' | 'USD' | 'EUR'>(
    initialData?.currency || 'TRY'
  );

  const [errors, setErrors] = useState<Record<string, string>>({});

  // Fetch categories from API
  const { data: categoriesData, isLoading: categoriesLoading } = useQuery({
    queryKey: ['categories', 'active'],
    queryFn: () => categoryEndpoints.getAll(true),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  const categories = useMemo(() => {
    return categoriesData?.data || [];
  }, [categoriesData]);

  // Period hesaplama
  const period = useMemo(() => {
    if (fiscalYear && month) {
      return `${fiscalYear}-${month}`;
    }
    return '';
  }, [fiscalYear, month]);

  // Ön izleme
  const preview = useMemo(() => {
    if (channel && category && period) {
      return `${channel}/${category}/${period}`;
    }
    return '.../.../...';
  }, [channel, category, period]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('tr-TR', {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!fiscalYear) {
      newErrors.fiscalYear = 'Yıl zorunludur';
    }

    if (!month) {
      newErrors.month = 'Ay zorunludur';
    }

    if (!channel) {
      newErrors.channel = 'Kanal zorunludur';
    }

    if (!category) {
      newErrors.category = 'Kategori zorunludur';
    }

    if (allocatedAmount <= 0) {
      newErrors.allocatedAmount = "Tahsis edilen tutar 0'dan büyük olmalıdır";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validate()) {
      return;
    }

    try {
      const data: CreateBudgetEnvelopeDto = {
        fiscalYear,
        period,
        month,
        channel,
        category,
        allocatedAmount,
        currency,
        status: BudgetEnvelopeStatus.DRAFT,
      };

      await onSubmit(data);
    } catch (error) {
      // Error is handled by parent component
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="fiscalYear">
            Dönem * <span className="text-xs text-gray-500">(Yıl)</span>
          </Label>
          <Select value={fiscalYear} onValueChange={setFiscalYear}>
            <SelectTrigger id="fiscalYear">
              <SelectValue placeholder="Yıl seçin" />
            </SelectTrigger>
            <SelectContent>
              {Array.from({ length: 5 }, (_, i) => currentYear + i).map(
                (year) => (
                  <SelectItem key={year} value={year.toString()}>
                    {year}
                  </SelectItem>
                )
              )}
            </SelectContent>
          </Select>
          {errors.fiscalYear && (
            <p className="text-xs text-red-600 mt-1">{errors.fiscalYear}</p>
          )}
        </div>
        <div>
          <Label htmlFor="month">
            <span className="text-xs text-gray-500">(Ay)</span>
          </Label>
          <Select value={month} onValueChange={setMonth}>
            <SelectTrigger id="month">
              <SelectValue placeholder="Ay seçin" />
            </SelectTrigger>
            <SelectContent>
              {MONTHS.map((m) => (
                <SelectItem key={m.value} value={m.value}>
                  {m.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {errors.month && (
            <p className="text-xs text-red-600 mt-1">{errors.month}</p>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="channel">Kanal *</Label>
          <Select value={channel} onValueChange={setChannel}>
            <SelectTrigger id="channel">
              <SelectValue placeholder="Seçiniz" />
            </SelectTrigger>
            <SelectContent>
              {CHANNELS.map((ch) => (
                <SelectItem key={ch} value={ch}>
                  {ch}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {errors.channel && (
            <p className="text-xs text-red-600 mt-1">{errors.channel}</p>
          )}
        </div>
        <div>
          <Label htmlFor="category">Kategori *</Label>
          <Select
            value={category}
            onValueChange={setCategory}
            disabled={categoriesLoading}
          >
            <SelectTrigger id="category">
              {categoriesLoading ? (
                <div className="flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Yükleniyor...</span>
                </div>
              ) : (
                <SelectValue placeholder="Seçiniz" />
              )}
            </SelectTrigger>
            <SelectContent>
              {categories.map(
                (cat: { id: string; code: string; name: string }) => (
                  <SelectItem key={cat.id} value={cat.code}>
                    {cat.name}
                  </SelectItem>
                )
              )}
            </SelectContent>
          </Select>
          {errors.category && (
            <p className="text-xs text-red-600 mt-1">{errors.category}</p>
          )}
        </div>
      </div>

      <div>
        <Label htmlFor="allocatedAmount">Tahsis Tutarı *</Label>
        <NumericInput
          id="allocatedAmount"
          value={allocatedAmount}
          onChange={(v) => setAllocatedAmount(v ?? 0)}
          required
        />
        {errors.allocatedAmount && (
          <p className="text-xs text-red-600 mt-1">{errors.allocatedAmount}</p>
        )}
      </div>

      {/* Ön İzleme */}
      <Card className="bg-blue-50 border-blue-200">
        <CardContent className="pt-4">
          <div className="flex items-start gap-2">
            <Info className="h-5 w-5 text-blue-600 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm text-gray-700">
                <span className="font-medium">{preview}</span> için{' '}
                <span className="font-medium">
                  {formatCurrency(allocatedAmount)}
                </span>{' '}
                tahsis edilecek.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Uyarı */}
      <Card className="bg-yellow-50 border-yellow-200">
        <CardContent className="pt-4">
          <div className="flex items-start gap-2">
            <AlertCircle className="h-5 w-5 text-yellow-600 mt-0.5" />
            <p className="text-sm text-gray-700">
              Bu kombinasyon unique olmalı.
            </p>
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end gap-2">
        {onCancel && (
          <Button type="button" variant="outline" onClick={onCancel}>
            İptal
          </Button>
        )}
        <Button type="submit" disabled={isLoading}>
          {isLoading ? (
            'Oluşturuluyor...'
          ) : (
            <>
              <span className="mr-2">✓</span>
              Oluştur
            </>
          )}
        </Button>
      </div>
    </form>
  );
}
