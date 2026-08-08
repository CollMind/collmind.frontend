import React, { useState } from 'react';
import {
  CreateAgreementDto,
  AgreementType,
  MechanicType,
  SpendType,
  SkuScope,
  ReconciliationPeriod,
} from '@/types/agreement.types';
import { CustomerChannel } from '@/types/customer.types';
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
import { Card, CardContent } from '@/components/ui/card';
import { ChevronRight, ChevronLeft, Check } from 'lucide-react';
import { toNumber, toNumberOrZero } from '@/utils/numberUtils';

interface AgreementFormProps {
  onSubmit: (data: CreateAgreementDto) => Promise<void>;
  onCancel?: () => void;
  initialData?: Partial<CreateAgreementDto>;
  isLoading?: boolean;
}

// STEPS moved to component for dynamic behavior

const CHANNELS = Object.values(CustomerChannel);

export function AgreementForm({
  onSubmit,
  onCancel,
  initialData,
  isLoading = false,
}: AgreementFormProps) {
  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState<CreateAgreementDto>({
    agreementName: initialData?.agreementName || '',
    description: initialData?.description || '',
    agreementType: initialData?.agreementType || AgreementType.STA,
    cplId: initialData?.cplId || '',
    channelId: initialData?.channelId || '',
    regionId: initialData?.regionId,
    categoryId: initialData?.categoryId,
    fuId: initialData?.fuId || '',
    guId: initialData?.guId,
    skuScope: initialData?.skuScope || SkuScope.FU,
    tacticId: initialData?.tacticId || '',
    mechanicId: initialData?.mechanicId || '',
    mechanicValue: initialData?.mechanicValue,
    mechanicType: initialData?.mechanicType,
    capTotalAmount: initialData?.capTotalAmount || 0,
    spendType: initialData?.spendType || SpendType.OFF_INVOICE,
    startDate: initialData?.startDate || '',
    endDate: initialData?.endDate || '',
    reconciliationPeriod: initialData?.reconciliationPeriod,
    justification: initialData?.justification || '',
    notes: initialData?.notes || '',
    currency: initialData?.currency || 'TRY',
    additionalParams: initialData?.additionalParams || {},
  });

  // Dynamic Steps Definition
  const STEPS = React.useMemo(() => {
    const steps = [
      { id: 1, title: 'Temel Bilgiler' },
      { id: 2, title: 'Müşteri Seçimi' },
      { id: 3, title: 'Ürün/Unit Seçimi' },
      { id: 4, title: 'Taktik ve Mekanik' },
      { id: 5, title: 'Bütçe ve Tarihler' },
      { id: 6, title: 'Gerekçe' },
    ];

    if (formData.agreementType === AgreementType.LTA) {
      // Example: LTA might have an extra "Terms" step or similar
      // For now, we just ensure the structure is dynamic
    }
    return steps;
  }, [formData.agreementType]);

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [newParamKey, setNewParamKey] = useState('');
  const [newParamValue, setNewParamValue] = useState('');

  const handleAddParam = () => {
    if (newParamKey && newParamValue) {
      setFormData((prev) => ({
        ...prev,
        additionalParams: {
          ...prev.additionalParams,
          [newParamKey]: isNaN(Number(newParamValue))
            ? newParamValue
            : Number(newParamValue),
        },
      }));
      setNewParamKey('');
      setNewParamValue('');
    }
  };

  const handleRemoveParam = (key: string) => {
    setFormData((prev) => {
      const newParams = { ...prev.additionalParams };
      delete newParams[key];
      return { ...prev, additionalParams: newParams };
    });
  };

  const validateStep = (step: number): boolean => {
    const newErrors: Record<string, string> = {};

    if (step === 1) {
      if (!formData.agreementType) {
        newErrors.agreementType = 'Anlaşma tipi zorunludur';
      }
      if (!formData.channelId) {
        newErrors.channelId = 'Kanal zorunludur';
      }
    }

    if (step === 2) {
      if (!formData.cplId) {
        newErrors.cplId = 'Müşteri seçimi zorunludur';
      }
    }

    if (step === 3) {
      if (!formData.fuId) {
        newErrors.fuId = 'Forecasting Unit seçimi zorunludur';
      }
    }

    if (step === 4) {
      if (!formData.tacticId) {
        newErrors.tacticId = 'Taktik seçimi zorunludur';
      }
      if (!formData.mechanicId) {
        newErrors.mechanicId = 'Mekanik seçimi zorunludur';
      }
    }

    if (step === 5) {
      const capAmount =
        typeof formData.capTotalAmount === 'number'
          ? formData.capTotalAmount
          : toNumber(formData.capTotalAmount);
      if (!capAmount || capAmount <= 0) {
        newErrors.capTotalAmount = "Bütçe tavanı 0'dan büyük olmalıdır";
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
        if (end <= start) {
          newErrors.endDate =
            'Bitiş tarihi başlangıç tarihinden sonra olmalıdır';
        }
      }
    }

    if (step === 6) {
      if (
        !formData.justification ||
        formData.justification.trim().length < 10
      ) {
        newErrors.justification = 'Gerekçe en az 10 karakter olmalıdır';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNext = () => {
    if (validateStep(currentStep)) {
      setCurrentStep((prev) => Math.min(prev + 1, STEPS.length));
    }
  };

  const handlePrevious = () => {
    setCurrentStep((prev) => Math.max(prev - 1, 1));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Son adımı validate et
    if (!validateStep(6)) {
      setCurrentStep(6);
      return;
    }

    try {
      await onSubmit(formData);
    } catch (error) {
      // Error handled by parent component
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('tr-TR', {
      style: 'currency',
      currency: formData.currency || 'TRY',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Stepper */}
      <div className="flex items-center justify-between mb-6">
        {STEPS.map((step, index) => (
          <React.Fragment key={step.id}>
            <div className="flex items-center">
              <div
                className={`flex items-center justify-center w-10 h-10 rounded-full border-2 ${
                  currentStep > step.id
                    ? 'bg-green-500 border-green-500 text-white'
                    : currentStep === step.id
                      ? 'bg-blue-500 border-blue-500 text-white'
                      : 'bg-white border-gray-300 text-gray-500'
                }`}
              >
                {currentStep > step.id ? (
                  <Check className="h-5 w-5" />
                ) : (
                  <span>{step.id}</span>
                )}
              </div>
              <span
                className={`ml-2 text-sm ${
                  currentStep >= step.id
                    ? 'text-gray-900 font-medium'
                    : 'text-gray-500'
                }`}
              >
                {step.title}
              </span>
            </div>
            {index < STEPS.length - 1 && (
              <div
                className={`flex-1 h-0.5 mx-4 ${
                  currentStep > step.id ? 'bg-green-500' : 'bg-gray-300'
                }`}
              />
            )}
          </React.Fragment>
        ))}
      </div>

      {/* Step 1: Temel Bilgiler */}
      {currentStep === 1 && (
        <Card>
          <CardContent className="pt-6 space-y-4">
            <div>
              <Label htmlFor="agreementName">Anlaşma İsmi (Opsiyonel)</Label>
              <Input
                id="agreementName"
                value={formData.agreementName}
                onChange={(e) =>
                  setFormData({ ...formData, agreementName: e.target.value })
                }
                placeholder="Anlaşma ismi..."
                maxLength={200}
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
                placeholder="Anlaşma kapsamı ve detayları..."
                rows={4}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="agreementType">
                  Anlaşma Tipi *{' '}
                  <span className="text-xs text-gray-500">
                    (STA ≤30 gün, LTA &gt;30 gün)
                  </span>
                </Label>
                <Select
                  value={formData.agreementType}
                  onValueChange={(value) =>
                    setFormData({
                      ...formData,
                      agreementType: value as AgreementType,
                    })
                  }
                >
                  <SelectTrigger id="agreementType">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={AgreementType.STA}>
                      STA (Short-Term)
                    </SelectItem>
                    <SelectItem value={AgreementType.LTA}>
                      LTA (Long-Term)
                    </SelectItem>
                  </SelectContent>
                </Select>
                {errors.agreementType && (
                  <p className="text-xs text-red-600 mt-1">
                    {errors.agreementType}
                  </p>
                )}
              </div>
              <div>
                <Label htmlFor="channel">Kanal *</Label>
                <Select
                  value={formData.channelId}
                  onValueChange={(value) =>
                    setFormData({ ...formData, channelId: value })
                  }
                >
                  <SelectTrigger id="channel">
                    <SelectValue placeholder="Kanal seçin" />
                  </SelectTrigger>
                  <SelectContent>
                    {CHANNELS.map((channel) => (
                      <SelectItem key={channel} value={channel}>
                        {channel}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.channel && (
                  <p className="text-xs text-red-600 mt-1">{errors.channel}</p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 2: Müşteri Seçimi */}
      {currentStep === 2 && (
        <Card>
          <CardContent className="pt-6 space-y-4">
            <div>
              <Label htmlFor="cplId">Müşteri *</Label>
              <Input
                id="cplId"
                value={formData.cplId}
                onChange={(e) =>
                  setFormData({ ...formData, cplId: e.target.value })
                }
                placeholder="Müşteri ID (UUID)"
                required
              />
              <p className="text-xs text-gray-500 mt-1">
                Müşteri seçimi için autocomplete eklenecek
              </p>
              {errors.cplId && (
                <p className="text-xs text-red-600 mt-1">{errors.cplId}</p>
              )}
            </div>
            <div>
              <Label htmlFor="regionId">Bölge (Opsiyonel)</Label>
              <Input
                id="regionId"
                value={formData.regionId || ''}
                onChange={(e) =>
                  setFormData({ ...formData, regionId: e.target.value })
                }
                placeholder="Bölge ID (UUID)"
              />
            </div>
            <div>
              <Label htmlFor="categoryId">Kategori (Opsiyonel)</Label>
              <Input
                id="categoryId"
                value={formData.categoryId || ''}
                onChange={(e) =>
                  setFormData({ ...formData, categoryId: e.target.value })
                }
                placeholder="Kategori ID (UUID)"
              />
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 3: Ürün/Unit Seçimi */}
      {currentStep === 3 && (
        <Card>
          <CardContent className="pt-6 space-y-4">
            <div>
              <Label htmlFor="fuId">Forecasting Unit (FU) *</Label>
              <Input
                id="fuId"
                value={formData.fuId}
                onChange={(e) =>
                  setFormData({ ...formData, fuId: e.target.value })
                }
                placeholder="FU ID (UUID)"
                required
              />
              {errors.fuId && (
                <p className="text-xs text-red-600 mt-1">{errors.fuId}</p>
              )}
            </div>
            <div>
              <Label htmlFor="guId">Generic Unit (GU) (Opsiyonel)</Label>
              <Input
                id="guId"
                value={formData.guId || ''}
                onChange={(e) =>
                  setFormData({ ...formData, guId: e.target.value })
                }
                placeholder="GU ID (UUID)"
              />
            </div>
            <div>
              <Label htmlFor="skuScope">SKU Scope</Label>
              <Select
                value={formData.skuScope}
                onValueChange={(value) =>
                  setFormData({ ...formData, skuScope: value as SkuScope })
                }
              >
                <SelectTrigger id="skuScope">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={SkuScope.FU}>FU</SelectItem>
                  <SelectItem value={SkuScope.GU}>GU</SelectItem>
                  <SelectItem value={SkuScope.SKU}>SKU</SelectItem>
                  <SelectItem value={SkuScope.ALL}>ALL</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 4: Taktik ve Mekanik */}
      {currentStep === 4 && (
        <Card>
          <CardContent className="pt-6 space-y-4">
            <div>
              <Label htmlFor="tacticId">Taktik *</Label>
              <Input
                id="tacticId"
                value={formData.tacticId}
                onChange={(e) =>
                  setFormData({ ...formData, tacticId: e.target.value })
                }
                placeholder="Taktik ID (UUID)"
                required
              />
              {errors.tacticId && (
                <p className="text-xs text-red-600 mt-1">{errors.tacticId}</p>
              )}
            </div>
            <div>
              <Label htmlFor="mechanicId">Mekanik *</Label>
              <Input
                id="mechanicId"
                value={formData.mechanicId}
                onChange={(e) =>
                  setFormData({ ...formData, mechanicId: e.target.value })
                }
                placeholder="Mekanik ID (UUID)"
                required
              />
              {errors.mechanicId && (
                <p className="text-xs text-red-600 mt-1">{errors.mechanicId}</p>
              )}
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="mechanicType">Mekanik Tipi</Label>
                <Select
                  value={formData.mechanicType}
                  onValueChange={(value) =>
                    setFormData({
                      ...formData,
                      mechanicType: value as MechanicType,
                    })
                  }
                >
                  <SelectTrigger id="mechanicType">
                    <SelectValue placeholder="Seçiniz" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={MechanicType.AMOUNT}>
                      Sabit (AMOUNT)
                    </SelectItem>
                    <SelectItem value={MechanicType.PERCENT}>
                      Yüzde (PERCENT)
                    </SelectItem>
                    <SelectItem value={MechanicType.AMOUNT_PER_UNIT}>
                      Birim Başına Tutar (AMOUNT_PER_UNIT)
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="mechanicValue">Mekanik Değeri</Label>
                <Input
                  id="mechanicValue"
                  type="number"
                  step="0.01"
                  value={formData.mechanicValue || ''}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      mechanicValue: parseFloat(e.target.value) || undefined,
                    })
                  }
                  placeholder="15.00 veya 10.5"
                />
              </div>
            </div>

            {/* Dynamic Parameters Section */}
            <div className="pt-4 border-t mt-4">
              <Label className="text-base font-semibold">
                Ek Parametreler (Opsiyonel)
              </Label>
              <p className="text-xs text-gray-500 mb-2">
                Taktik için gerekli ek parametreleri buradan ekleyebilirsiniz.
              </p>
              <div className="flex gap-2 mb-2">
                <Input
                  placeholder="Parametre Adı"
                  value={newParamKey}
                  onChange={(e) => setNewParamKey(e.target.value)}
                  className="flex-1"
                />
                <Input
                  placeholder="Değer"
                  value={newParamValue}
                  onChange={(e) => setNewParamValue(e.target.value)}
                  className="flex-1"
                />
                <Button
                  type="button"
                  variant="secondary"
                  onClick={handleAddParam}
                >
                  Ekle
                </Button>
              </div>
              <div className="space-y-2 max-h-40 overflow-y-auto">
                {formData.additionalParams &&
                  Object.entries(formData.additionalParams).map(
                    ([key, value]) => (
                      <div
                        key={key}
                        className="flex justify-between items-center bg-gray-50 p-2 rounded border border-gray-100"
                      >
                        <span className="text-sm font-medium">
                          {key}:{' '}
                          <span className="font-normal text-gray-700">
                            {String(value)}
                          </span>
                        </span>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => handleRemoveParam(key)}
                          className="h-6 w-6 p-0 hover:text-red-600"
                        >
                          <span className="sr-only">Sil</span>
                          &times;
                        </Button>
                      </div>
                    )
                  )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 5: Bütçe ve Tarihler */}
      {currentStep === 5 && (
        <Card>
          <CardContent className="pt-6 space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="capTotalAmount">Bütçe Tavanı *</Label>
                <Input
                  id="capTotalAmount"
                  type="number"
                  step="0.01"
                  min="0.01"
                  value={formData.capTotalAmount}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      capTotalAmount: parseFloat(e.target.value) || 0,
                    })
                  }
                  required
                />
                {toNumberOrZero(formData.capTotalAmount) > 0 && (
                  <p className="text-xs text-gray-500 mt-1">
                    {formatCurrency(toNumberOrZero(formData.capTotalAmount))}
                  </p>
                )}
                {errors.capTotalAmount && (
                  <p className="text-xs text-red-600 mt-1">
                    {errors.capTotalAmount}
                  </p>
                )}
              </div>
              <div>
                <Label htmlFor="spendType">Spend Tipi</Label>
                <Select
                  value={formData.spendType}
                  onValueChange={(value) =>
                    setFormData({ ...formData, spendType: value as SpendType })
                  }
                >
                  <SelectTrigger id="spendType">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={SpendType.OFF_INVOICE}>
                      Off-Invoice
                    </SelectItem>
                    <SelectItem value={SpendType.ON_INVOICE}>
                      On-Invoice
                    </SelectItem>
                    <SelectItem value={SpendType.BOTH}>Both</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="startDate">Başlangıç Tarihi *</Label>
                <Input
                  id="startDate"
                  type="date"
                  value={formData.startDate}
                  onChange={(e) =>
                    setFormData({ ...formData, startDate: e.target.value })
                  }
                  required
                />
                {errors.startDate && (
                  <p className="text-xs text-red-600 mt-1">
                    {errors.startDate}
                  </p>
                )}
              </div>
              <div>
                <Label htmlFor="endDate">Bitiş Tarihi *</Label>
                <Input
                  id="endDate"
                  type="date"
                  value={formData.endDate}
                  onChange={(e) =>
                    setFormData({ ...formData, endDate: e.target.value })
                  }
                  required
                />
                {errors.endDate && (
                  <p className="text-xs text-red-600 mt-1">{errors.endDate}</p>
                )}
              </div>
            </div>
            {formData.agreementType === AgreementType.LTA && (
              <div>
                <Label htmlFor="reconciliationPeriod">Mutabakat Periyodu</Label>
                <Select
                  value={formData.reconciliationPeriod}
                  onValueChange={(value) =>
                    setFormData({
                      ...formData,
                      reconciliationPeriod: value as ReconciliationPeriod,
                    })
                  }
                >
                  <SelectTrigger id="reconciliationPeriod">
                    <SelectValue placeholder="Mutabakat periyodu seçin" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={ReconciliationPeriod.WEEKLY}>
                      Haftalık
                    </SelectItem>
                    <SelectItem value={ReconciliationPeriod.MONTHLY}>
                      Aylık
                    </SelectItem>
                    <SelectItem value={ReconciliationPeriod.QUARTERLY}>
                      Üç Aylık
                    </SelectItem>
                    <SelectItem value={ReconciliationPeriod.YEARLY}>
                      Yıllık
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
            <div>
              <Label htmlFor="currency">Para Birimi</Label>
              <Select
                value={formData.currency}
                onValueChange={(value) =>
                  setFormData({ ...formData, currency: value })
                }
              >
                <SelectTrigger id="currency">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="TRY">TRY</SelectItem>
                  <SelectItem value="USD">USD</SelectItem>
                  <SelectItem value="EUR">EUR</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 6: Gerekçe */}
      {currentStep === 6 && (
        <Card>
          <CardContent className="pt-6 space-y-4">
            <div>
              <Label htmlFor="justification">İş Gerekçesi *</Label>
              <Textarea
                id="justification"
                value={formData.justification}
                onChange={(e) =>
                  setFormData({ ...formData, justification: e.target.value })
                }
                rows={6}
                placeholder="Anlaşmanın iş gerekçesini açıklayın..."
                required
              />
              <p className="text-xs text-gray-500 mt-1">
                En az 10 karakter olmalıdır
              </p>
              {errors.justification && (
                <p className="text-xs text-red-600 mt-1">
                  {errors.justification}
                </p>
              )}
            </div>
            <div>
              <Label htmlFor="notes">Notlar (Opsiyonel)</Label>
              <Textarea
                id="notes"
                value={formData.notes}
                onChange={(e) =>
                  setFormData({ ...formData, notes: e.target.value })
                }
                rows={4}
                placeholder="Onaylayıcı için ek notlar..."
              />
            </div>
          </CardContent>
        </Card>
      )}

      {/* Navigation Buttons */}
      <div className="flex justify-between">
        <div>
          {onCancel && (
            <Button type="button" variant="outline" onClick={onCancel}>
              İptal
            </Button>
          )}
        </div>
        <div className="flex gap-2">
          {currentStep > 1 && (
            <Button type="button" variant="outline" onClick={handlePrevious}>
              <ChevronLeft className="h-4 w-4 mr-2" />
              Önceki
            </Button>
          )}
          {currentStep < STEPS.length ? (
            <Button type="button" onClick={handleNext}>
              Sonraki
              <ChevronRight className="h-4 w-4 ml-2" />
            </Button>
          ) : (
            <Button type="submit" disabled={isLoading}>
              {isLoading ? (
                'Oluşturuluyor...'
              ) : (
                <>
                  <Check className="h-4 w-4 mr-2" />
                  Oluştur
                </>
              )}
            </Button>
          )}
        </div>
      </div>
    </form>
  );
}
