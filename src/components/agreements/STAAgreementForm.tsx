import React, { useState, useMemo, useEffect } from 'react';
import {
  CreateAgreementDto,
  AgreementType,
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
import { Card, CardContent } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  ChevronRight,
  ChevronLeft,
  Check,
  Calendar,
  Info,
  Plus,
  Trash2,
  Save,
  Send,
  Wallet,
} from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { customerEndpoints } from '@/api/endpoints/customers.endpoints';
import { budgetEndpoints } from '@/api/endpoints/budget.endpoints';
import { agreementEndpoints } from '@/api/endpoints/agreements.endpoints';
import { CustomerChannel } from '@/types/customer.types';
import { CplListItem } from '@/types/customer.types';
import { toNumber } from '@/utils/numberUtils';
import { ChannelSelect } from '@/components/common/ChannelSelect';
import { CategorySelect } from '@/components/common/CategorySelect';
import { CplSelect } from '@/components/common/CplSelect';
import { FuSelect } from '@/components/common/FuSelect';
import { useChannels, useCpls, useCategories } from '@/hooks/useMasterData';
import { MechanicSelect } from '@/components/common/MechanicSelect';
// import { useToast } from '@/hooks/useToast';
// Force rebuild

interface STAAgreementFormProps {
  onSubmit: (data: CreateAgreementDto, saveAsDraft: boolean) => Promise<void>;
  onCancel?: () => void;
  initialData?: Partial<CreateAgreementDto>;
  isLoading?: boolean;
}

interface SelectedTactic {
  id: string;
  name: string;
  code: string;
  mechanicType: 'PERCENT' | 'AMOUNT' | 'AMOUNT_PER_UNIT';
  spendType: 'ON_INVOICE' | 'OFF_INVOICE' | 'BOTH';
  value?: number;
  mechanicId?: string; // Add mechanic ID
}

const STEPS = [
  { id: 1, title: 'Temel Bilgiler' },
  { id: 2, title: 'Müşteri & Kategori' },
  { id: 3, title: 'Taktik & Bütçe' },
  { id: 4, title: 'Özet & Onay' },
];

// Removed hardcoded CHANNELS and CATEGORIES - now using dynamic data from API

export function STAAgreementForm({
  onSubmit,
  onCancel,
  initialData,
  isLoading = false,
}: STAAgreementFormProps) {
  // const toast = useToast();
  const [currentStep, setCurrentStep] = useState(1);
  
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
    agreementType: AgreementType.STA,
    cplId: extractId(initialData?.cplId),
    channelId: extractId(initialData?.channelId || (initialData as any)?.channel),
    categoryId: extractId(initialData?.categoryId || (initialData as any)?.category),
    fuId: extractId(initialData?.fuId || (initialData as any)?.forecastingUnit),
    startDate: initialData?.startDate || '',
    endDate: initialData?.endDate || '',
    capTotalAmount: initialData?.capTotalAmount || 0,
    justification: initialData?.justification || '',
    notes: initialData?.notes || '',
    currency: initialData?.currency || 'TRY',
    // Required fields
    tacticId: extractId(initialData?.tacticId || (initialData as any)?.tactic),
    mechanicId: extractId(initialData?.mechanicId || (initialData as any)?.mechanic),
  });

  const [selectedTactics, setSelectedTactics] = useState<SelectedTactic[]>([]);
  const [saveAsDraft, setSaveAsDraft] = useState(true);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [showTacticDropdown, setShowTacticDropdown] = useState(false);
  const [tacticsMechanics, setTacticsMechanics] = useState<Record<string, any[]>>({});
  const [pendingTactic, setPendingTactic] = useState<any>(null); // Tactic waiting for mechanic selection

  // Fetch CPL list when channel is selected (using new master data endpoint)
  const { data: channels = [] } = useChannels(true);
  const { data: cplList = [], isLoading: cplLoading } = useCpls(true, formData.channelId);

  // Legacy: Also try old endpoint for backward compatibility
  const { data: legacyCplList } = useQuery({
    queryKey: ['cpl-list-legacy', formData.channelId, formData.categoryId],
    queryFn: () =>
      customerEndpoints.getCplList(formData.channelId, formData.categoryId).then((res) => res.data),
    enabled: !!formData.channelId && cplList.length === 0,
  });

  // Use new CPL list if available, otherwise fall back to legacy
  const finalCplList = cplList.length > 0 ? cplList : (legacyCplList || []);

  // Fetch available tactics
  const { data: availableTactics, isLoading: tacticsLoading } = useQuery({
    queryKey: ['available-tactics', formData.channelId, formData.categoryId],
    queryFn: () =>
      agreementEndpoints.getAvailableTactics(formData.channelId || '', formData.categoryId).then((res) => res.data),
    enabled: !!formData.channelId,
  });

  // Load initial tactic and mechanic if editing
  useEffect(() => {
    if (initialData?.tacticId && initialData?.mechanicId && availableTactics && availableTactics.length > 0) {
      const tactic = availableTactics.find(t => t.id === initialData.tacticId);
      if (tactic) {
        const mechanics = tactic.mechanics || [];
        setTacticsMechanics({ [tactic.id]: mechanics });
        
        const selectedMechanic = mechanics.find((m: any) => m.id === initialData.mechanicId);
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
  }, [initialData?.tacticId, initialData?.mechanicId, initialData?.mechanicValue, availableTactics]);

  // Fetch budget status
  const { data: budgetStatus, isLoading: budgetLoading } = useQuery({
    queryKey: ['budget-status', formData.channelId, formData.categoryId],
    queryFn: () =>
      budgetEndpoints.getBudgetStatus(formData.channelId || '', formData.categoryId).then((res) => res.data),
    enabled: !!formData.channelId && !!formData.categoryId,
  });

  // Calculate period days
  const periodDays = useMemo(() => {
    if (formData.startDate && formData.endDate) {
      const start = new Date(formData.startDate);
      const end = new Date(formData.endDate);
      const diffTime = Math.abs(end.getTime() - start.getTime());
      return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    }
    return 0;
  }, [formData.startDate, formData.endDate]);

  // Update planned amount in budget status
  const updatedBudgetStatus = useMemo(() => {
    if (!budgetStatus) return null;
    return {
      ...budgetStatus,
      planned: formData.capTotalAmount || 0,
    };
  }, [budgetStatus, formData.capTotalAmount]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('tr-TR', {
      style: 'currency',
      currency: formData.currency || 'TRY',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const validateStep = (step: number): boolean => {
    const newErrors: Record<string, string> = {};

    if (step === 1) {
      if (!formData.agreementName?.trim()) {
        newErrors.agreementName = 'Anlaşma adı zorunludur';
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
        const days = periodDays;
        if (days > 90) {
          newErrors.endDate = 'STA anlaşmaları maksimum 90 gün olabilir';
        }
      }
    }

    if (step === 2) {
      if (!formData.channelId) {
        newErrors.channelId = 'Kanal seçimi zorunludur';
      }
      if (!formData.categoryId) {
        newErrors.categoryId = 'Kategori seçimi zorunludur';
      }
      if (!formData.cplId) {
        newErrors.cplId = 'CPL seçimi zorunludur';
      }
    }

    if (step === 3) {
      if (selectedTactics.length === 0) {
        newErrors.tactics = 'En az bir taktik seçilmelidir';
      }
      const capAmount = typeof formData.capTotalAmount === 'number' ? formData.capTotalAmount : toNumber(formData.capTotalAmount);
      if (!capAmount || capAmount <= 0) {
        newErrors.capTotalAmount = 'Cap değeri 0\'dan büyük olmalıdır';
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

  const handleAddTactic = (tactic: any) => {
    if (!selectedTactics.find((t) => t.id === tactic.id)) {
      // Mechanics are already included in the tactic object from getAvailableTactics
      const mechanics = tactic.mechanics || [];
      
      console.log('Adding tactic with mechanics:', { tactic: tactic.name, mechanicsCount: mechanics.length });
      
      // Store mechanics for this tactic
      setTacticsMechanics(prev => ({ ...prev, [tactic.id]: mechanics }));
      
      // If no mechanics, show error
      if (mechanics.length === 0) {
        setErrors({ ...errors, tactics: `"${tactic.name}" taktiği için mekanik bulunamadı. Lütfen admin panelinden bu taktik için mekanik ekleyin.` });
        setShowTacticDropdown(false);
        return;
      }
      
      // If only one mechanic, auto-select it
      if (mechanics.length === 1) {
        const mechanic = mechanics[0];
        const newTactic: SelectedTactic = { 
          id: tactic.id,
          name: tactic.name,
          code: tactic.code,
          spendType: tactic.spendType || 'ON_INVOICE',
          mechanicType: mechanic.mechanicType,
          value: undefined,
          mechanicId: mechanic.id 
        };
        
        setSelectedTactics([...selectedTactics, newTactic]);
        
        // Set first tactic as default
        if (selectedTactics.length === 0) {
          setFormData({ 
            ...formData, 
            tacticId: tactic.id,
            mechanicId: mechanic.id 
          });
        }
        setShowTacticDropdown(false);
      } else {
        // Multiple mechanics - require user selection
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
      mechanicId: selectedMechanic.id 
    };
    
    setSelectedTactics([...selectedTactics, newTactic]);
    
    // Set first tactic as default
    if (selectedTactics.length === 0) {
      setFormData({ 
        ...formData, 
        tacticId: tactic.id,
        mechanicId: selectedMechanic.id 
      });
    }
    
    setPendingTactic(null);
  };

  const handleCancelMechanicSelection = () => {
    setPendingTactic(null);
  };

  const handleRemoveTactic = (tacticId: string) => {
    setSelectedTactics(selectedTactics.filter((t) => t.id !== tacticId));
    // Remove mechanics for this tactic
    setTacticsMechanics(prev => {
      const newMechanics = { ...prev };
      delete newMechanics[tacticId];
      return newMechanics;
    });
    if (formData.tacticId === tacticId) {
      setFormData({ ...formData, tacticId: selectedTactics[0]?.id || '', mechanicId: selectedTactics[0]?.mechanicId || '' });
    }
  };

  const handleTacticValueChange = (tacticId: string, value: number) => {
    setSelectedTactics(
      selectedTactics.map((t) => (t.id === tacticId ? { ...t, value } : t))
    );
  };

  // Helper to convert DD.MM.YYYY to YYYY-MM-DD
  const formatDateForSubmit = (dateStr: string) => {
    if (!dateStr) return '';
    if (dateStr.includes('-')) return dateStr; // Already ISO
    const [day, month, year] = dateStr.split('.');
    if (day && month && year) {
      return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
    }
    return dateStr;
  };

  const handleSubmit = async () => {
    console.log('handleSubmit called', { currentStep, selectedTactics, saveAsDraft, formData });
    
    // Clear previous errors
    setErrors({});
    
    if (!validateStep(currentStep)) {
      console.log('Validation failed', errors);
      return;
    }

    // Validate tactics are selected
    if (selectedTactics.length === 0) {
      console.log('No tactics selected');
      setErrors({ tactics: 'En az bir taktik seçilmelidir' });
      return;
    }

    // Use first selected tactic
    const firstTactic = selectedTactics[0];
    
    // Validate mechanic ID exists
    if (!firstTactic.mechanicId) {
      console.log('No mechanic ID for tactic', firstTactic);
      setErrors({ tactics: 'Lütfen taktik için bir mekanik seçin' });
      return;
    }
    
    try {
      const submitData: CreateAgreementDto = {
        ...formData,
        startDate: formatDateForSubmit(formData.startDate),
        endDate: formatDateForSubmit(formData.endDate),
        tacticId: firstTactic.id,
        mechanicId: firstTactic.mechanicId, // Use actual mechanic ID
        mechanicType: firstTactic.mechanicType as any,
        mechanicValue: firstTactic.value,
        spendType: firstTactic.spendType as any,
        justification: formData.justification || 'STA anlaşması',
      };

      console.log('Submitting agreement:', submitData);
      await onSubmit(submitData, saveAsDraft);
    } catch (error) {
      console.error('Error submitting agreement:', error);
      setErrors({ submit: 'Anlaşma kaydedilirken bir hata oluştu' });
    }
  };

  const getSelectedCpl = () => {
    return cplList?.find((cpl: any) => cpl.id === formData.cplId);
  };

  // Fetch categories for summary
  const { data: categories = [] } = useCategories(true);

  const getSelectedCategory = () => {
    return categories.find((cat: any) => cat.id === formData.categoryId);
  };

  return (
    <div className="space-y-6">
      {/* Progress Indicator */}
      <div className="flex items-center justify-between">
        {STEPS.map((step, index) => (
          <React.Fragment key={step.id}>
            <div className="flex items-center">
              <div
                className={`flex items-center justify-center w-10 h-10 rounded-full border-2 ${currentStep > step.id
                  ? 'bg-green-500 border-green-500 text-white'
                  : currentStep === step.id
                    ? 'bg-blue-500 border-blue-500 text-white'
                    : 'bg-gray-200 border-gray-300 text-gray-500'
                  }`}
              >
                {currentStep > step.id ? (
                  <Check className="h-5 w-5" />
                ) : (
                  <span>{step.id}</span>
                )}
              </div>
              <span
                className={`ml-2 text-sm ${currentStep >= step.id ? 'text-gray-900 font-medium' : 'text-gray-500'
                  }`}
              >
                {step.title}
              </span>
            </div>
            {index < STEPS.length - 1 && (
              <div
                className={`flex-1 h-0.5 mx-4 ${currentStep > step.id ? 'bg-green-500' : 'bg-gray-300'
                  }`}
              />
            )}
          </React.Fragment>
        ))}
      </div>

      <div className="text-sm text-gray-500 text-right">
        Adım {currentStep} / {STEPS.length}
      </div>

      {/* Step 1: Temel Bilgiler */}
      {currentStep === 1 && (
        <Card>
          <CardContent className="pt-6 space-y-4">
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
                placeholder="Örn: Carrefour Ocak Kampanyası"
                className={errors.agreementName ? 'border-red-500' : ''}
              />
              {errors.agreementName && (
                <p className="text-xs text-red-600 mt-1">{errors.agreementName}</p>
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
                placeholder="Kampanya detayları..."
                rows={4}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="startDate">
                  Başlangıç Tarihi * <span className="text-red-500">*</span>
                </Label>
                <div className="relative">
                  <Input
                    id="startDate"
                    type="date"
                    value={formData.startDate}
                    onChange={(e) =>
                      setFormData({ ...formData, startDate: e.target.value })
                    }
                    className={errors.startDate ? 'border-red-500' : ''}
                  />
                  <Calendar className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
                </div>
                {errors.startDate && (
                  <p className="text-xs text-red-600 mt-1">{errors.startDate}</p>
                )}
              </div>
              <div>
                <Label htmlFor="endDate">
                  Bitiş Tarihi * <span className="text-red-500">*</span>
                </Label>
                <div className="relative">
                  <Input
                    id="endDate"
                    type="date"
                    value={formData.endDate}
                    onChange={(e) =>
                      setFormData({ ...formData, endDate: e.target.value })
                    }
                    className={errors.endDate ? 'border-red-500' : ''}
                  />
                  <Calendar className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
                </div>
                {errors.endDate && (
                  <p className="text-xs text-red-600 mt-1">{errors.endDate}</p>
                )}
              </div>
            </div>
            {formData.startDate && formData.endDate && periodDays > 0 && (
              <div className="flex items-start gap-2 p-3 bg-blue-50 rounded-md">
                <Info className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-sm font-medium text-blue-800">Süre Kısıtlaması</p>
                  <p className="text-xs text-blue-700 mt-1">
                    STA (Kısa Vadeli Anlaşma) süresi maksimum 90 gün olabilir. Şu anki süre: {periodDays} gün
                  </p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Step 2: Müşteri & Kategori */}
      {currentStep === 2 && (
        <Card>
          <CardContent className="pt-6 space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <ChannelSelect
                  value={formData.channelId}
                  onChange={(value) => {
                    setFormData({ ...formData, channelId: value, cplId: '', categoryId: '' });
                  }}
                  label="Kanal"
                  required
                  error={errors.channelId}
                />
              </div>
              <div>
                <CategorySelect
                  value={formData.categoryId}
                  onChange={(value) => {
                    setFormData({ ...formData, categoryId: value, cplId: '' });
                  }}
                  label="Kategori"
                  required
                  error={errors.categoryId}
                />
              </div>
            </div>

            {formData.channelId && (
              <>
                <div>
                  <Label>
                    CPL Seçimi * <span className="text-red-500">*</span>
                  </Label>
                {cplLoading ? (
                  <div className="text-center py-4 text-gray-500">Yükleniyor...</div>
                ) : (
                  <div className="grid grid-cols-3 gap-4 mt-2">
                    {finalCplList?.map((cpl: any) => (
                      <Card
                        key={cpl.id}
                        className={`cursor-pointer transition-all ${formData.cplId === cpl.id
                          ? 'border-blue-500 bg-blue-50'
                          : 'border-gray-200 hover:border-gray-300'
                          }`}
                        onClick={() => setFormData({ ...formData, cplId: cpl.id })}
                      >
                        <CardContent className="p-4">
                          <h3 className="font-semibold text-lg mb-2">{cpl.name}</h3>
                          <p className="text-sm text-gray-600">
                            Müşteri Sayısı: {cpl.customerCount}
                          </p>
                          <p className="text-sm text-gray-600">
                            Aktif Anlaşma: {cpl.activeAgreementCount}
                          </p>
                          <p className="text-sm text-gray-500 mt-2">{cpl.code}</p>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
                {errors.cplId && (
                  <p className="text-xs text-red-600 mt-1">{errors.cplId}</p>
                )}
              </div>

              {formData.cplId && (
                <div>
                  <FuSelect
                    value={formData.fuId}
                    onChange={(value) => setFormData({ ...formData, fuId: value })}
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
      )}

      {/* Step 3: Taktik & Bütçe */}
      {currentStep === 3 && (
        <Card>
          <CardContent className="pt-6 space-y-4">
            {/* Budget Status */}
            {updatedBudgetStatus && (
              <Card className="bg-gray-50">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <Wallet className="h-4 w-4 text-gray-600" />
                      <Label className="text-sm font-medium">Bütçe Durumu</Label>
                    </div>
                    <Badge
                      className={
                        updatedBudgetStatus.status === 'GREEN'
                          ? 'bg-green-100 text-green-700'
                          : updatedBudgetStatus.status === 'YELLOW'
                            ? 'bg-yellow-100 text-yellow-700'
                            : 'bg-red-100 text-red-700'
                      }
                    >
                      {updatedBudgetStatus.status}
                    </Badge>
                  </div>
                  <div className="space-y-2">
                    <div>
                      <div className="flex justify-between text-xs text-gray-600 mb-1">
                        <span>Toplam Tahsis</span>
                      </div>
                      <Progress
                        value={
                          updatedBudgetStatus.totalAllocation > 0
                            ? ((updatedBudgetStatus.reserved + updatedBudgetStatus.consumed) /
                              updatedBudgetStatus.totalAllocation) *
                            100
                            : 0
                        }
                        className="h-2"
                      />
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Kullanılabilir</span>
                      <span className="font-medium">{formatCurrency(updatedBudgetStatus.available)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Planlanan (Bu STA)</span>
                      <span className="font-medium">{formatCurrency(toNumber(updatedBudgetStatus.planned))}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Add Tactic */}
            <div className="relative">
              <Button
                type="button"
                variant="outline"
                className="w-full justify-between bg-gray-800 hover:bg-gray-900 text-white border-0"
                onClick={() => setShowTacticDropdown(!showTacticDropdown)}
              >
                <span className="flex items-center gap-2">
                  <Plus className="h-4 w-4" />
                  Taktik Ekle
                </span>
                <ChevronRight
                  className={`h-4 w-4 transition-transform ${showTacticDropdown ? 'rotate-90' : ''
                    }`}
                />
              </Button>
              {showTacticDropdown && availableTactics && (
                <Card className="absolute z-10 w-full mt-2 shadow-lg bg-white border border-gray-200">
                  <CardContent className="p-2 max-h-64 overflow-y-auto">
                    {availableTactics.map((tactic) => (
                      <div
                        key={tactic.id}
                        className="flex items-center justify-between p-3 hover:bg-gray-50 rounded-md cursor-pointer transition-colors"
                        onClick={() => handleAddTactic(tactic)}
                      >
                        <div className="flex items-center gap-3">
                          {selectedTactics.find((t) => t.id === tactic.id) && (
                            <Check className="h-4 w-4 text-green-600" />
                          )}
                          <div>
                            <p className="text-sm font-medium text-gray-900">{tactic.name}</p>
                            <p className="text-xs text-gray-500">{tactic.code}</p>
                          </div>
                        </div>
                        <Badge variant="outline" className="text-xs border-gray-200 text-gray-600 bg-gray-50">
                          {tactic.mechanics?.length || 0} Mekanik
                        </Badge>
                      </div>
                    ))}
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
                        Bu taktik için birden fazla mekanik mevcut. Lütfen birini seçin.
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
                    {(pendingTactic.mechanics || []).map((mechanic: any) => (
                      <Button
                        key={mechanic.id}
                        type="button"
                        variant="outline"
                        className="w-full justify-start text-left"
                        onClick={() => handleSelectMechanic(pendingTactic, mechanic.id)}
                      >
                        <div className="flex items-center justify-between w-full">
                          <div>
                            <p className="text-sm font-medium">{mechanic.name}</p>
                            <p className="text-xs text-gray-500">{mechanic.code} - {mechanic.mechanicType}</p>
                          </div>
                          <Badge variant="outline">{mechanic.mechanicType}</Badge>
                        </div>
                      </Button>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Selected Tactics */}
            {selectedTactics.map((tactic) => {
              const mechanics = tacticsMechanics[tactic.id] || [];
              
              return (
                <Card key={tactic.id} className="bg-white">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <Label className="text-sm font-medium">{tactic.name}</Label>
                        <p className="text-xs text-gray-500">{tactic.spendType}</p>
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
                    
                    {/* Mechanic Selection - Always show for editing */}
                    <div className="mb-3">
                      <MechanicSelect
                        value={tactic.mechanicId}
                        onChange={(mechanicId) => {
                          const selectedMechanic = mechanics.find((m: any) => m.id === mechanicId);
                          setSelectedTactics(
                            selectedTactics.map((t) => 
                              t.id === tactic.id 
                                ? { 
                                    ...t, 
                                    mechanicId,
                                    mechanicType: selectedMechanic?.mechanicType || t.mechanicType
                                  } 
                                : t
                            )
                          );
                          // Update formData if this is the first tactic
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
                          Bu taktik için mekanik bulunamadı. Lütfen admin panelinden mekanik ekleyin.
                        </p>
                      )}
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <Input
                        type="number"
                        placeholder="Değer"
                        value={tactic.value || ''}
                        onChange={(e) =>
                          handleTacticValueChange(tactic.id, parseFloat(e.target.value) || 0)
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
            })}

            {errors.tactics && (
              <p className="text-xs text-red-600">{errors.tactics}</p>
            )}

            {/* Cap */}
            <div>
              <Label htmlFor="capTotalAmount">
                Cap (Maksimum Harcama Limiti) * <span className="text-red-500">*</span>
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
                <p className="text-xs text-red-600 mt-1">{errors.capTotalAmount}</p>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 4: Özet & Onay */}
      {currentStep === 4 && (
        <Card>
          <CardContent className="pt-6 space-y-6">
            <div>
              <h3 className="text-lg font-semibold mb-4">Anlaşma Özeti</h3>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Anlaşma Adı:</span>
                  <span className="font-medium">{formData.agreementName || '-'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Dönem:</span>
                  <span className="font-medium">
                    {formData.startDate && formData.endDate
                      ? `${new Date(formData.startDate).toLocaleDateString('tr-TR')} - ${new Date(formData.endDate).toLocaleDateString('tr-TR')} (${periodDays} gün)`
                      : '-'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Müşteri / CPL:</span>
                  <span className="font-medium">{getSelectedCpl()?.name || '-'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Kanal / Kategori:</span>
                  <span className="font-medium">
                    {channels.find((c: { id: string; name?: string }) => c.id === formData.channelId)?.name || '-'} / {getSelectedCategory()?.name || '-'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Toplam Cap:</span>
                  <span className="font-medium">{formatCurrency(toNumber(formData.capTotalAmount))}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Taktik Sayısı:</span>
                  <span className="font-medium">{selectedTactics.length}</span>
                </div>
                {selectedTactics.length > 0 && (
                  <div className="mt-2 pt-2 border-t">
                    <p className="text-xs text-gray-500 mb-2">SEÇİLEN TAKTİKLER</p>
                    {selectedTactics.map((tactic) => (
                      <div key={tactic.id} className="flex justify-between text-sm">
                        <span>{tactic.name}</span>
                        <span className="font-medium">
                          {tactic.value || 0} {tactic.mechanicType === 'PERCENT' ? '%' : '₺'}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div>
              <Label htmlFor="notes">Onay Notu</Label>
              <Textarea
                id="notes"
                value={formData.notes}
                onChange={(e) =>
                  setFormData({ ...formData, notes: e.target.value })
                }
                placeholder="Onaylayıcı için not ekleyin..."
                rows={4}
                className="bg-gray-100"
              />
            </div>

            <div className="space-y-3">
              <div
                className={`flex items-start gap-3 p-4 border-2 rounded-lg cursor-pointer ${saveAsDraft
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-gray-200 hover:border-gray-300'
                  }`}
                onClick={() => setSaveAsDraft(true)}
              >
                <input
                  type="radio"
                  checked={saveAsDraft}
                  onChange={() => setSaveAsDraft(true)}
                  className="mt-1"
                />
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <Save className="h-4 w-4" />
                    <Label className="font-medium cursor-pointer">Taslak Olarak Kaydet</Label>
                  </div>
                  <p className="text-xs text-gray-600">
                    Daha sonra düzenlemeye devam edebilirsiniz. Onay sürecine girmez.
                  </p>
                </div>
              </div>
              <div
                className={`flex items-start gap-3 p-4 border-2 rounded-lg cursor-pointer ${!saveAsDraft
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-gray-200 hover:border-gray-300'
                  }`}
                onClick={() => setSaveAsDraft(false)}
              >
                <input
                  type="radio"
                  checked={!saveAsDraft}
                  onChange={() => setSaveAsDraft(false)}
                  className="mt-1"
                />
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <Send className="h-4 w-4" />
                    <Label className="font-medium cursor-pointer">Onaya Gönder</Label>
                  </div>
                  <p className="text-xs text-gray-600">
                    İlgili Category Manager onayına sunulur. Bütçe rezervasyonu başlar.
                  </p>
                </div>
              </div>
            </div>
            
            {/* Submit Error Message */}
            {errors.submit && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-md">
                <p className="text-sm text-red-600">{errors.submit}</p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Navigation Buttons */}
      <div className="flex justify-between">
        <div>
          {onCancel && (
            <Button type="button" variant="outline" onClick={onCancel} disabled={isLoading}>
              İptal
            </Button>
          )}
        </div>
        <div className="flex gap-2">
          {currentStep > 1 && (
            <Button type="button" variant="outline" onClick={handlePrevious} disabled={isLoading}>
              <ChevronLeft className="h-4 w-4 mr-2" />
              Geri
            </Button>
          )}
          {currentStep < STEPS.length ? (
            <Button type="button" onClick={handleNext} disabled={isLoading}>
              Devam Et
              <ChevronRight className="h-4 w-4 ml-2" />
            </Button>
          ) : (
            <Button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                console.log('Submit button clicked', { isLoading, currentStep, selectedTactics });
                handleSubmit();
              }}
              disabled={isLoading}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {saveAsDraft ? (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  Taslak Kaydet
                </>
              ) : (
                <>
                  <Send className="h-4 w-4 mr-2" />
                  Onaya Gönder
                </>
              )}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
