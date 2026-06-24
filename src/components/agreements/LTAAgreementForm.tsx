import React, { useState, useMemo, useEffect } from 'react';
import {
  CreateAgreementDto,
  AgreementType,
  ReconciliationPeriod,
} from '@/types/agreement.types';
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
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  ArrowLeft,
  Plus,
  Save,
  Send,
  Info,
  Check,
  ChevronRight,
  Trash2,
} from 'lucide-react';
import { toNumber } from '@/utils/numberUtils';
import { ChannelSelect } from '@/components/common/ChannelSelect';
import { CategorySelect } from '@/components/common/CategorySelect';
import { CplSelect } from '@/components/common/CplSelect';
import { FuSelect } from '@/components/common/FuSelect';
import { MechanicSelect } from '@/components/common/MechanicSelect';
import { useQuery } from '@tanstack/react-query';
import { agreementEndpoints } from '@/api/endpoints/agreements.endpoints';

interface LTAAgreementFormProps {
  onSubmit: (data: CreateAgreementDto) => Promise<void>;
  onCancel?: () => void;
  initialData?: Partial<CreateAgreementDto>;
  isLoading?: boolean;
}

export function LTAAgreementForm({
  onSubmit,
  onCancel,
  initialData,
  isLoading = false,
}: LTAAgreementFormProps) {
  // Helper function to extract ID from initialData (handles both string and object)
  const extractId = (value: any): string => {
    if (!value) return '';
    if (typeof value === 'string') return value;
    if (typeof value === 'object' && value.id) return value.id;
    return '';
  };

  const [formData, setFormData] = useState<CreateAgreementDto>({
    agreementName: initialData?.agreementName || '',
    description: initialData?.description || '',
    agreementType: AgreementType.LTA,
    cplId: extractId(initialData?.cplId),
    channelId: extractId(
      initialData?.channelId || (initialData as any)?.channel
    ),
    categoryId: extractId(
      initialData?.categoryId || (initialData as any)?.category
    ),
    startDate: initialData?.startDate || '',
    endDate: initialData?.endDate || '',
    reconciliationPeriod:
      initialData?.reconciliationPeriod || ReconciliationPeriod.MONTHLY,
    capTotalAmount: initialData?.capTotalAmount || 0,
    notes: initialData?.notes || '',
    justification: initialData?.justification || '',
    currency: initialData?.currency || 'TRY',
    // Required fields with defaults
    fuId: extractId(initialData?.fuId || (initialData as any)?.forecastingUnit),
    tacticId: extractId(initialData?.tacticId || (initialData as any)?.tactic),
    mechanicId: extractId(
      initialData?.mechanicId || (initialData as any)?.mechanic
    ),
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  // Tactic selection state
  interface SelectedTactic {
    id: string;
    name: string;
    code: string;
    spendType: 'ON_INVOICE' | 'OFF_INVOICE' | 'BOTH';
    mechanicType: 'PERCENT' | 'AMOUNT' | 'AMOUNT_PER_UNIT';
    mechanicId?: string;
    value?: number;
  }

  const [selectedTactics, setSelectedTactics] = useState<SelectedTactic[]>([]);
  const [showTacticDropdown, setShowTacticDropdown] = useState(false);
  const [tacticsMechanics, setTacticsMechanics] = useState<
    Record<string, any[]>
  >({});
  const [pendingTactic, setPendingTactic] = useState<any>(null);

  // Fetch available tactics when channel and category are selected
  const { data: availableTactics, isLoading: tacticsLoading } = useQuery({
    queryKey: [
      'available-tactics-lta',
      formData.channelId,
      formData.categoryId,
    ],
    queryFn: () =>
      agreementEndpoints
        .getAvailableTactics(formData.channelId || '', formData.categoryId)
        .then((res) => res.data),
    enabled: !!formData.channelId && !!formData.categoryId,
  });

  // Load initial tactic and mechanic if editing
  useEffect(() => {
    if (
      initialData?.tacticId &&
      initialData?.mechanicId &&
      availableTactics &&
      availableTactics.length > 0
    ) {
      const tactic = availableTactics.find(
        (t) => t.id === initialData.tacticId
      );
      if (tactic) {
        const mechanics = tactic.mechanics || [];
        setTacticsMechanics({ [tactic.id]: mechanics });

        const selectedMechanic = mechanics.find(
          (m: any) => m.id === initialData.mechanicId
        );
        const selectedTactic: SelectedTactic = {
          id: tactic.id,
          name: tactic.name,
          code: tactic.code,
          spendType: tactic.spendType,
          mechanicType: selectedMechanic?.mechanicType || 'PERCENT',
          mechanicId: initialData.mechanicId,
          value: initialData.mechanicValue,
        };

        setSelectedTactics([selectedTactic]);
      }
    }
  }, [
    initialData?.tacticId,
    initialData?.mechanicId,
    initialData?.mechanicValue,
    availableTactics,
  ]);

  // Calculate period days
  const periodDays = useMemo(() => {
    if (formData.startDate && formData.endDate) {
      const start = new Date(formData.startDate);
      const end = new Date(formData.endDate);
      const diffTime = Math.abs(end.getTime() - start.getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      return diffDays;
    }
    return 0;
  }, [formData.startDate, formData.endDate]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('tr-TR', {
      style: 'currency',
      currency: formData.currency || 'TRY',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  };

  const getReconciliationPeriodLabel = (period: ReconciliationPeriod) => {
    const labels = {
      [ReconciliationPeriod.WEEKLY]: 'Haftalık',
      [ReconciliationPeriod.MONTHLY]: 'Aylık',
      [ReconciliationPeriod.QUARTERLY]: 'Üç Aylık',
      [ReconciliationPeriod.YEARLY]: 'Yıllık',
    };
    return labels[period] || period;
  };

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.agreementName?.trim()) {
      newErrors.agreementName = 'Anlaşma adı zorunludur';
    }

    if (!formData.channelId) {
      newErrors.channelId = 'Kanal seçimi zorunludur';
    }

    if (!formData.categoryId) {
      newErrors.categoryId = 'Kategori seçimi zorunludur';
    }

    if (!formData.cplId) {
      newErrors.cplId = 'CPL seçimi zorunludur';
    }

    if (!formData.fuId) {
      newErrors.fuId = 'Forecasting Unit (FU) seçimi zorunludur';
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
        newErrors.endDate = 'Bitiş tarihi başlangıç tarihinden sonra olmalıdır';
      }
    }

    const capAmount =
      typeof formData.capTotalAmount === 'number'
        ? formData.capTotalAmount
        : toNumber(formData.capTotalAmount);
    if (!capAmount || capAmount <= 0) {
      newErrors.capTotalAmount = "Bütçe cap değeri 0'dan büyük olmalıdır";
    }

    if (selectedTactics.length === 0) {
      newErrors.tactics = 'En az bir taktik seçilmelidir';
    }

    if (!formData.justification?.trim()) {
      newErrors.justification = 'Gerekçe zorunludur';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleAddTactic = (tactic: any) => {
    if (!selectedTactics.find((t) => t.id === tactic.id)) {
      const mechanics = tactic.mechanics || [];

      setTacticsMechanics((prev) => ({ ...prev, [tactic.id]: mechanics }));

      if (mechanics.length === 0) {
        setErrors({
          ...errors,
          tactics: `"${tactic.name}" taktiği için mekanik bulunamadı. Lütfen admin panelinden bu taktik için mekanik ekleyin.`,
        });
        setShowTacticDropdown(false);
        return;
      }

      if (mechanics.length === 1) {
        const mechanic = mechanics[0];
        const newTactic: SelectedTactic = {
          id: tactic.id,
          name: tactic.name,
          code: tactic.code,
          spendType: tactic.spendType || 'ON_INVOICE',
          mechanicType: mechanic.mechanicType,
          value: undefined,
          mechanicId: mechanic.id,
        };

        setSelectedTactics([...selectedTactics, newTactic]);

        if (selectedTactics.length === 0) {
          setFormData({
            ...formData,
            tacticId: tactic.id,
            mechanicId: mechanic.id,
          });
        }
        setShowTacticDropdown(false);
      } else {
        setPendingTactic(tactic);
        setShowTacticDropdown(false);
      }
    } else {
      setShowTacticDropdown(false);
    }
  };

  const handleSelectMechanic = (tactic: any, mechanicId: string) => {
    const mechanics = tacticsMechanics[tactic.id] || tactic.mechanics || [];
    const selectedMechanic = mechanics.find((m: any) => m.id === mechanicId);

    if (!selectedMechanic) {
      setErrors({ ...errors, tactics: 'Seçilen mekanik bulunamadı' });
      return;
    }

    const newTactic: SelectedTactic = {
      id: tactic.id,
      name: tactic.name,
      code: tactic.code,
      spendType: tactic.spendType || 'ON_INVOICE',
      mechanicType: selectedMechanic.mechanicType,
      value: undefined,
      mechanicId: selectedMechanic.id,
    };

    setSelectedTactics([...selectedTactics, newTactic]);

    if (selectedTactics.length === 0) {
      setFormData({
        ...formData,
        tacticId: tactic.id,
        mechanicId: selectedMechanic.id,
      });
    }

    setPendingTactic(null);
  };

  const handleCancelMechanicSelection = () => {
    setPendingTactic(null);
  };

  const handleRemoveTactic = (tacticId: string) => {
    setSelectedTactics(selectedTactics.filter((t) => t.id !== tacticId));
    setTacticsMechanics((prev) => {
      const newMechanics = { ...prev };
      delete newMechanics[tacticId];
      return newMechanics;
    });
    if (formData.tacticId === tacticId) {
      setFormData({
        ...formData,
        tacticId: selectedTactics[0]?.id || '',
        mechanicId: selectedTactics[0]?.mechanicId || '',
      });
    }
  };

  const handleTacticValueChange = (tacticId: string, value: number) => {
    setSelectedTactics(
      selectedTactics.map((t) => (t.id === tacticId ? { ...t, value } : t))
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) {
      return;
    }

    // Validate tactics are selected
    if (selectedTactics.length === 0) {
      setErrors({ tactics: 'En az bir taktik seçilmelidir' });
      return;
    }

    // Use first selected tactic
    const firstTactic = selectedTactics[0];

    if (!firstTactic.mechanicId) {
      setErrors({ tactics: 'Lütfen taktik için bir mekanik seçin' });
      return;
    }

    const submitData: CreateAgreementDto = {
      ...formData,
      channelId: formData.channelId, // Ensure channelId is set
      tacticId: firstTactic.id,
      mechanicId: firstTactic.mechanicId,
      mechanicType: firstTactic.mechanicType as any,
      mechanicValue: firstTactic.value,
      spendType: firstTactic.spendType as any,
      justification: formData.justification || '', // Ensure justification is set
    };

    // Remove channel property if it exists (should not be sent to backend)
    delete (submitData as any).channel;

    await onSubmit(submitData);
  };

  const handleSaveDraft = async () => {
    // Save as draft - validation not required
    await onSubmit(formData);
  };

  return (
    <div className="flex gap-6">
      {/* Main Form */}
      <div className="flex-1 space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          {onCancel && (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={onCancel}
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
          )}
          <div>
            <h1 className="text-2xl font-bold">Yeni LTA Anlaşması</h1>
            <p className="text-sm text-gray-500">
              Uzun vadeli (yıllık/dönemsel) anlaşma oluşturma
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Section 1: Temel Bilgiler */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">1. Temel Bilgiler</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="agreementName">
                  Anlaşma Adı * <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="agreementName"
                  value={formData.agreementName}
                  onChange={(e) =>
                    setFormData({ ...formData, agreementName: e.target.value })
                  }
                  placeholder="Örn: Carrefour 2026 Yıllık Çerçeve"
                  className={errors.agreementName ? 'border-red-500' : ''}
                />
                {errors.agreementName && (
                  <p className="text-xs text-red-600 mt-1">
                    {errors.agreementName}
                  </p>
                )}
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
            </CardContent>
          </Card>

          {/* Section 2: Dönem ve Mutabakat */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">2. Dönem ve Mutabakat</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="startDate">
                    Başlangıç * <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="startDate"
                    type="date"
                    value={formData.startDate}
                    onChange={(e) =>
                      setFormData({ ...formData, startDate: e.target.value })
                    }
                    className={errors.startDate ? 'border-red-500' : ''}
                  />
                  {errors.startDate && (
                    <p className="text-xs text-red-600 mt-1">
                      {errors.startDate}
                    </p>
                  )}
                </div>
                <div>
                  <Label htmlFor="endDate">
                    Bitiş * <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="endDate"
                    type="date"
                    value={formData.endDate}
                    onChange={(e) =>
                      setFormData({ ...formData, endDate: e.target.value })
                    }
                    className={errors.endDate ? 'border-red-500' : ''}
                  />
                  {errors.endDate && (
                    <p className="text-xs text-red-600 mt-1">
                      {errors.endDate}
                    </p>
                  )}
                </div>
              </div>
              <div>
                <Label>Mutabakat Periyodu</Label>
                <div className="flex gap-4 mt-2">
                  <label className="flex items-center space-x-2 cursor-pointer">
                    <input
                      type="radio"
                      name="reconciliationPeriod"
                      value={ReconciliationPeriod.MONTHLY}
                      checked={
                        formData.reconciliationPeriod ===
                        ReconciliationPeriod.MONTHLY
                      }
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          reconciliationPeriod: e.target
                            .value as ReconciliationPeriod,
                        })
                      }
                      className="w-4 h-4 text-purple-600"
                    />
                    <span className="text-sm">Aylık</span>
                  </label>
                  <label className="flex items-center space-x-2 cursor-pointer">
                    <input
                      type="radio"
                      name="reconciliationPeriod"
                      value={ReconciliationPeriod.WEEKLY}
                      checked={
                        formData.reconciliationPeriod ===
                        ReconciliationPeriod.WEEKLY
                      }
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          reconciliationPeriod: e.target
                            .value as ReconciliationPeriod,
                        })
                      }
                      className="w-4 h-4 text-purple-600"
                    />
                    <span className="text-sm">Haftalık</span>
                  </label>
                  <label className="flex items-center space-x-2 cursor-pointer">
                    <input
                      type="radio"
                      name="reconciliationPeriod"
                      value={ReconciliationPeriod.QUARTERLY}
                      checked={
                        formData.reconciliationPeriod ===
                        ReconciliationPeriod.QUARTERLY
                      }
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          reconciliationPeriod: e.target
                            .value as ReconciliationPeriod,
                        })
                      }
                      className="w-4 h-4 text-purple-600"
                    />
                    <span className="text-sm">Üç Aylık</span>
                  </label>
                </div>
                <div className="flex items-start gap-2 mt-3 p-3 bg-blue-50 rounded-md">
                  <Info className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
                  <p className="text-xs text-blue-800">
                    Uzun Vadeli Anlaşma (LTA) için 90 gün süre kısıtlaması
                    yoktur. Genellikle 1 yıllık çerçeve anlaşmalar için
                    kullanılır.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Section 3: Kanal ve Müşteri Seçimi */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">
                3. Kanal ve Müşteri Seçimi
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <ChannelSelect
                    value={formData.channelId}
                    onChange={(value) => {
                      setFormData({
                        ...formData,
                        channelId: value,
                        categoryId: '',
                        cplId: '',
                      });
                    }}
                    required
                    error={errors.channelId}
                  />
                </div>
                <div>
                  <CategorySelect
                    value={formData.categoryId}
                    onChange={(value) => {
                      setFormData({
                        ...formData,
                        categoryId: value,
                        cplId: '',
                      });
                    }}
                    required
                    error={errors.categoryId}
                  />
                </div>
              </div>

              {formData.channelId && formData.categoryId && (
                <>
                  <div>
                    <Label>
                      CPL Seçimi * <span className="text-red-500">*</span>
                    </Label>
                    <div className="mt-2">
                      <CplSelect
                        value={formData.cplId}
                        onChange={(value) =>
                          setFormData({ ...formData, cplId: value })
                        }
                        channelId={formData.channelId}
                        activeOnly={true}
                        required
                        error={errors.cplId}
                      />
                    </div>
                  </div>

                  {formData.cplId && (
                    <div>
                      <FuSelect
                        value={formData.fuId}
                        onChange={(value) =>
                          setFormData({ ...formData, fuId: value })
                        }
                        label="Forecasting Unit (FU)"
                        required
                        error={errors.fuId}
                        categoryId={formData.categoryId}
                      />
                    </div>
                  )}
                </>
              )}
            </CardContent>
          </Card>

          {/* Section 4: Taktikler */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">4. Taktikler</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {!formData.channelId || !formData.categoryId ? (
                <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-md">
                  <p className="text-sm text-yellow-800">
                    Taktik seçmek için önce Kanal ve Kategori seçmelisiniz.
                  </p>
                </div>
              ) : (
                <>
                  {/* Add Tactic */}
                  <div className="relative">
                    <Button
                      type="button"
                      variant="outline"
                      className="w-full justify-between bg-gray-800 hover:bg-gray-900 text-white border-0"
                      onClick={() => setShowTacticDropdown(!showTacticDropdown)}
                      disabled={tacticsLoading}
                    >
                      <span className="flex items-center gap-2">
                        <Plus className="h-4 w-4" />
                        Taktik Ekle
                      </span>
                      <ChevronRight
                        className={`h-4 w-4 transition-transform ${showTacticDropdown ? 'rotate-90' : ''}`}
                      />
                    </Button>
                    {showTacticDropdown && availableTactics && (
                      <Card className="absolute z-10 w-full mt-2 shadow-lg bg-white border border-gray-200">
                        <CardContent className="p-2 max-h-64 overflow-y-auto">
                          {availableTactics.length === 0 ? (
                            <p className="text-sm text-gray-500 p-3 text-center">
                              Bu kanal ve kategori için taktik bulunamadı.
                            </p>
                          ) : (
                            availableTactics.map((tactic) => (
                              <div
                                key={tactic.id}
                                className="flex items-center justify-between p-3 hover:bg-gray-50 rounded-md cursor-pointer transition-colors"
                                onClick={() => handleAddTactic(tactic)}
                              >
                                <div className="flex items-center gap-3">
                                  {selectedTactics.find(
                                    (t) => t.id === tactic.id
                                  ) && (
                                    <Check className="h-4 w-4 text-green-600" />
                                  )}
                                  <div>
                                    <p className="text-sm font-medium text-gray-900">
                                      {tactic.name}
                                    </p>
                                    <p className="text-xs text-gray-500">
                                      {tactic.code}
                                    </p>
                                  </div>
                                </div>
                                <Badge
                                  variant="outline"
                                  className="text-xs border-gray-200 text-gray-600 bg-gray-50"
                                >
                                  {tactic.mechanics?.length || 0} Mekanik
                                </Badge>
                              </div>
                            ))
                          )}
                        </CardContent>
                      </Card>
                    )}
                  </div>

                  {/* Mechanic Selection Modal (when multiple mechanics available) */}
                  {pendingTactic && (
                    <Card className="bg-blue-50 border-blue-200">
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between mb-3">
                          <div>
                            <Label className="text-sm font-medium text-blue-900">
                              {pendingTactic.name} için Mekanik Seçin
                            </Label>
                            <p className="text-xs text-blue-700 mt-1">
                              Bu taktik için birden fazla mekanik mevcut. Lütfen
                              birini seçin.
                            </p>
                          </div>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={handleCancelMechanicSelection}
                          >
                            ✕
                          </Button>
                        </div>

                        <div className="space-y-2">
                          {(pendingTactic.mechanics || []).map(
                            (mechanic: any) => (
                              <Button
                                key={mechanic.id}
                                type="button"
                                variant="outline"
                                className="w-full justify-start text-left"
                                onClick={() =>
                                  handleSelectMechanic(
                                    pendingTactic,
                                    mechanic.id
                                  )
                                }
                              >
                                <div className="flex items-center justify-between w-full">
                                  <div>
                                    <p className="text-sm font-medium">
                                      {mechanic.name}
                                    </p>
                                    <p className="text-xs text-gray-500">
                                      {mechanic.code} - {mechanic.mechanicType}
                                    </p>
                                  </div>
                                  <Badge variant="outline">
                                    {mechanic.mechanicType}
                                  </Badge>
                                </div>
                              </Button>
                            )
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  )}

                  {/* Selected Tactics */}
                  {selectedTactics.length === 0 ? (
                    <div className="mt-4 p-8 border-2 border-dashed border-gray-300 rounded-md text-center text-gray-500">
                      Henüz taktik eklenmedi.
                    </div>
                  ) : (
                    selectedTactics.map((tactic) => {
                      const mechanics = tacticsMechanics[tactic.id] || [];

                      return (
                        <Card key={tactic.id} className="bg-white">
                          <CardContent className="p-4">
                            <div className="flex items-start justify-between mb-3">
                              <div>
                                <Label className="text-sm font-medium">
                                  {tactic.name}
                                </Label>
                                <p className="text-xs text-gray-500">
                                  {tactic.spendType}
                                </p>
                              </div>
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => handleRemoveTactic(tactic.id)}
                              >
                                <Trash2 className="h-4 w-4 text-red-600" />
                              </Button>
                            </div>

                            {/* Mechanic Selection */}
                            <div className="mb-3">
                              <MechanicSelect
                                value={tactic.mechanicId}
                                onChange={(mechanicId) => {
                                  const selectedMechanic = mechanics.find(
                                    (m: any) => m.id === mechanicId
                                  );
                                  setSelectedTactics(
                                    selectedTactics.map((t) =>
                                      t.id === tactic.id
                                        ? {
                                            ...t,
                                            mechanicId,
                                            mechanicType:
                                              selectedMechanic?.mechanicType ||
                                              t.mechanicType,
                                          }
                                        : t
                                    )
                                  );
                                  if (selectedTactics[0]?.id === tactic.id) {
                                    setFormData({ ...formData, mechanicId });
                                  }
                                }}
                                tacticId={tactic.id}
                                label="Mekanik"
                                required
                                placeholder="Mekanik seçiniz"
                              />
                              {!tactic.mechanicId && mechanics.length === 0 && (
                                <p className="text-xs text-amber-600 mt-1">
                                  Bu taktik için mekanik bulunamadı. Lütfen
                                  admin panelinden mekanik ekleyin.
                                </p>
                              )}
                            </div>

                            <div className="flex items-center gap-2">
                              <Input
                                type="number"
                                placeholder="Değer"
                                value={tactic.value || ''}
                                onChange={(e) =>
                                  handleTacticValueChange(
                                    tactic.id,
                                    parseFloat(e.target.value) || 0
                                  )
                                }
                                className="flex-1"
                              />
                              <span className="text-sm text-gray-600">
                                {tactic.mechanicType === 'PERCENT' ? '%' : '₺'}
                              </span>
                            </div>
                          </CardContent>
                        </Card>
                      );
                    })
                  )}

                  {errors.tactics && (
                    <p className="text-xs text-red-600">{errors.tactics}</p>
                  )}
                </>
              )}
            </CardContent>
          </Card>

          {/* Section 5: Bütçe */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">5. Bütçe</CardTitle>
            </CardHeader>
            <CardContent>
              <div>
                <Label htmlFor="capTotalAmount">
                  Yıllık / Dönemsel Cap *{' '}
                  <span className="text-red-500">*</span>
                </Label>
                <div className="relative mt-2">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">
                    ₺
                  </span>
                  <Input
                    id="capTotalAmount"
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.capTotalAmount || ''}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        capTotalAmount: parseFloat(e.target.value) || 0,
                      })
                    }
                    className={`pl-8 ${errors.capTotalAmount ? 'border-red-500' : ''}`}
                    placeholder="0.00"
                  />
                </div>
                {errors.capTotalAmount && (
                  <p className="text-xs text-red-600 mt-1">
                    {errors.capTotalAmount}
                  </p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Section 6: Gerekçe */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">6. Gerekçe</CardTitle>
            </CardHeader>
            <CardContent>
              <div>
                <Label htmlFor="justification">
                  İş Gerekçesi * <span className="text-red-500">*</span>
                </Label>
                <Textarea
                  id="justification"
                  value={formData.justification}
                  onChange={(e) =>
                    setFormData({ ...formData, justification: e.target.value })
                  }
                  placeholder="Bu anlaşmanın iş gerekçesini açıklayın..."
                  rows={4}
                  className={errors.justification ? 'border-red-500' : ''}
                  required
                />
                {errors.justification && (
                  <p className="text-xs text-red-600 mt-1">
                    {errors.justification}
                  </p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Section 7: Notlar */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">7. Notlar</CardTitle>
            </CardHeader>
            <CardContent>
              <Textarea
                id="notes"
                value={formData.notes}
                onChange={(e) =>
                  setFormData({ ...formData, notes: e.target.value })
                }
                placeholder="Onaylayıcı için ek notlar..."
                rows={6}
                className="bg-gray-100"
              />
            </CardContent>
          </Card>

          {/* Action Buttons */}
          <div className="flex justify-between gap-4 pb-6">
            <Button
              type="button"
              variant="outline"
              onClick={onCancel}
              disabled={isLoading}
            >
              İptal
            </Button>
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={handleSaveDraft}
                disabled={isLoading}
                className="bg-purple-50 text-purple-700 hover:bg-purple-100 border-purple-300"
              >
                <Save className="h-4 w-4 mr-2" />
                Taslak Kaydet
              </Button>
              <Button
                type="submit"
                disabled={isLoading}
                className="bg-purple-600 hover:bg-purple-700 text-white"
              >
                <Send className="h-4 w-4 mr-2" />
                Onaya Gönder
              </Button>
            </div>
          </div>
        </form>
      </div>

      {/* Agreement Summary Card */}
      <div className="w-80 flex-shrink-0">
        <Card className="sticky top-4">
          <CardHeader>
            <div className="flex justify-between items-start">
              <CardTitle className="text-lg">Anlaşma Özeti</CardTitle>
              <span className="px-2 py-1 bg-purple-100 text-purple-700 text-xs font-semibold rounded">
                LTA
              </span>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label className="text-xs text-gray-500">CPL / Müşteri</Label>
              <p className="text-sm font-medium mt-1">
                {formData.cplId ? 'Seçildi' : '-'}
              </p>
            </div>
            <div>
              <Label className="text-xs text-gray-500">Kanal</Label>
              <p className="text-sm font-medium mt-1">
                {formData.channelId ? 'Seçildi' : '-'}
              </p>
            </div>
            <div>
              <Label className="text-xs text-gray-500">Kategori</Label>
              <p className="text-sm font-medium mt-1">
                {formData.categoryId ? 'Seçildi' : '-'}
              </p>
            </div>
            <div>
              <Label className="text-xs text-gray-500">Dönem</Label>
              <div className="mt-1">
                {formData.startDate && formData.endDate ? (
                  <div>
                    <p className="text-sm font-medium">
                      {new Date(formData.startDate).toLocaleDateString('tr-TR')}{' '}
                      - {new Date(formData.endDate).toLocaleDateString('tr-TR')}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      {periodDays} gün •{' '}
                      {getReconciliationPeriodLabel(
                        formData.reconciliationPeriod ||
                          ReconciliationPeriod.MONTHLY
                      )}{' '}
                      Mutabakat
                    </p>
                  </div>
                ) : (
                  <p className="text-sm font-medium">-</p>
                )}
              </div>
            </div>
            <div>
              <Label className="text-xs text-gray-500">
                Taktikler ({selectedTactics.length})
              </Label>
              {selectedTactics.length === 0 ? (
                <p className="text-sm font-medium mt-1">-</p>
              ) : (
                <div className="mt-2 space-y-1">
                  {selectedTactics.map((tactic) => (
                    <div
                      key={tactic.id}
                      className="flex justify-between text-sm"
                    >
                      <span className="text-gray-700">{tactic.name}</span>
                      <span className="font-medium text-purple-600">
                        {tactic.value !== undefined && tactic.value !== null
                          ? `${tactic.value} ${tactic.mechanicType === 'PERCENT' ? '%' : '₺'}`
                          : '-'}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div className="pt-4 border-t">
              <Label className="text-xs text-gray-500">Toplam Cap</Label>
              <p className="text-2xl font-bold text-purple-600 mt-1">
                {formatCurrency(toNumber(formData.capTotalAmount))}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
