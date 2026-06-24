import { useState, useEffect, useMemo } from 'react';
import { offInvoiceEndpoints } from '@/api/endpoints/off-invoice.endpoints';
import { agreementEndpoints } from '@/api/endpoints/agreements.endpoints';
import { budgetEndpoints } from '@/api/endpoints/budget.endpoints';
import { CreateOffInvoiceTransactionDto } from '@/types/off-invoice.types';
import {
  Agreement,
  AgreementStatus,
  AgreementType,
} from '@/types/agreement.types';
import { BudgetEnvelope } from '@/types/budget.types';
import { useToast } from '@/hooks/useToast';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import { useQuery } from '@tanstack/react-query';
import {
  X,
  Search,
  ChevronRight,
  ChevronLeft,
  Paperclip,
  FileText,
  Save,
  Check,
} from 'lucide-react';
import { toNumber } from '@/utils/numberUtils';

interface OffInvoiceManualEntryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export function OffInvoiceManualEntryModal({
  isOpen,
  onClose,
  onSuccess,
}: OffInvoiceManualEntryModalProps) {
  const toast = useToast();
  const [step, setStep] = useState(1);
  const [selectedAgreement, setSelectedAgreement] = useState<Agreement | null>(
    null
  );
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<'ALL' | 'STA' | 'LTA'>('ALL');
  const [cplFilter, setCplFilter] = useState<string>('ALL');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSavingDraft, setIsSavingDraft] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  // Form data for step 2
  const [formData, setFormData] = useState<CreateOffInvoiceTransactionDto>({
    agreementId: '',
    invoiceNo: '',
    invoiceDate: new Date().toISOString().split('T')[0],
    fiscalPeriod: '',
    amount: 0,
    currency: 'TRY',
    notes: '',
  });

  // Get current agreement total for cap calculation
  const { data: agreementTotal } = useQuery({
    queryKey: ['agreement-total', selectedAgreement?.id],
    queryFn: () =>
      selectedAgreement
        ? offInvoiceEndpoints.getTotalByAgreement(selectedAgreement.id)
        : 0,
    enabled: !!selectedAgreement?.id,
  });

  // Get budget impact for calculation
  const { data: budgetImpact } = useQuery({
    queryKey: ['budget-impact', selectedAgreement?.id, formData.fiscalPeriod],
    queryFn: () => {
      if (!selectedAgreement || !formData.fiscalPeriod) return null;
      return offInvoiceEndpoints.getBudgetImpact(
        selectedAgreement.id,
        formData.fiscalPeriod
      );
    },
    enabled: !!selectedAgreement && !!formData.fiscalPeriod,
  });

  // Fetch agreements (only APPROVED and ACTIVE)
  const { data: agreements, isLoading: isLoadingAgreements } = useQuery({
    queryKey: ['agreements', 'approved-active'],
    queryFn: async () => {
      const response = await agreementEndpoints.getAll();
      const allAgreements = Array.isArray(response.data)
        ? response.data
        : response.data || [];
      return allAgreements.filter(
        (agreement: Agreement) =>
          agreement.status === AgreementStatus.APPROVED ||
          agreement.status === AgreementStatus.ACTIVE
      );
    },
    enabled: isOpen,
  });

  // Fetch CPLs for filter
  const { data: cpls } = useQuery({
    queryKey: ['cpls'],
    queryFn: async () => {
      // TODO: Implement CPL endpoint if not exists
      return [];
    },
    enabled: isOpen,
  });

  // Filter agreements
  const filteredAgreements = useMemo(() => {
    if (!agreements) return [];

    return agreements.filter((agreement: Agreement) => {
      // Search filter
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const matchesCode = agreement.agreementCode
          ?.toLowerCase()
          .includes(query);
        const matchesName = agreement.agreementName
          ?.toLowerCase()
          .includes(query);
        // TODO: Add customer name search when relation is available
        if (!matchesCode && !matchesName) return false;
      }

      // Type filter
      if (typeFilter !== 'ALL') {
        if (agreement.agreementType !== typeFilter) return false;
      }

      // CPL filter
      if (cplFilter !== 'ALL') {
        if (agreement.cplId !== cplFilter) return false;
      }

      return true;
    });
  }, [agreements, searchQuery, typeFilter, cplFilter]);

  // Calculate remaining cap for each agreement
  const getRemainingCap = async (agreement: Agreement): Promise<number> => {
    try {
      const total = await offInvoiceEndpoints.getTotalByAgreement(agreement.id);
      return toNumber(agreement.capTotalAmount) - total;
    } catch {
      return toNumber(agreement.capTotalAmount);
    }
  };

  // Handle agreement selection
  const handleSelectAgreement = async (agreement: Agreement) => {
    setSelectedAgreement(agreement);
    // Derive fiscal period from start date
    let fiscalPeriod = '';
    if (agreement.startDate) {
      const startDate = new Date(agreement.startDate);
      const year = startDate.getFullYear();
      const month = String(startDate.getMonth() + 1).padStart(2, '0');
      fiscalPeriod = `${year}-${month}`;
    }
    setFormData({
      ...formData,
      agreementId: agreement.id,
      fiscalPeriod,
    });
    setStep(2);
  };

  // Generate month/year options for period dropdown
  const generatePeriodOptions = (): Array<{ value: string; label: string }> => {
    const options: Array<{ value: string; label: string }> = [];
    const currentDate = new Date();
    const currentYear = currentDate.getFullYear();
    const currentMonth = currentDate.getMonth();

    // Generate options for current year and next year
    for (let year = currentYear; year <= currentYear + 1; year++) {
      const startMonth = year === currentYear ? currentMonth : 0;
      for (let month = startMonth; month < 12; month++) {
        const monthStr = String(month + 1).padStart(2, '0');
        const periodValue = `${year}-${monthStr}`;
        const monthNames = [
          'Ocak',
          'Şubat',
          'Mart',
          'Nisan',
          'Mayıs',
          'Haziran',
          'Temmuz',
          'Ağustos',
          'Eylül',
          'Ekim',
          'Kasım',
          'Aralık',
        ];
        options.push({
          value: periodValue,
          label: `${monthNames[month]} ${year}`,
        });
      }
    }
    return options;
  };

  const periodOptions = generatePeriodOptions();

  // Calculate agreement cap impact
  const agreementCapImpact = useMemo(() => {
    if (!selectedAgreement || !formData.amount) {
      return null;
    }
    const currentRemaining =
      toNumber(selectedAgreement.capTotalAmount) - (agreementTotal || 0);
    const afterTransaction = currentRemaining - formData.amount;
    return {
      currentRemaining,
      invoiceAmount: formData.amount,
      afterTransaction,
    };
  }, [selectedAgreement, agreementTotal, formData.amount]);

  // Handle file selection
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 10 * 1024 * 1024) {
        toast.error('Dosya boyutu çok büyük. Maksimum 10MB olmalıdır.');
        return;
      }
      setSelectedFile(file);
    }
  };

  // Handle form submission
  const handleSubmit = async (saveAsDraft = false) => {
    if (!selectedAgreement) {
      toast.error('Lütfen bir anlaşma seçin');
      return;
    }

    // Validation (skip for draft)
    if (!saveAsDraft) {
      if (!formData.invoiceNo.trim()) {
        toast.error('Fatura numarası zorunludur');
        return;
      }

      if (!formData.invoiceDate) {
        toast.error('Fatura tarihi zorunludur');
        return;
      }

      if (!formData.fiscalPeriod) {
        toast.error('Dönem seçimi zorunludur');
        return;
      }

      if (!formData.amount || formData.amount <= 0) {
        toast.error('Tutar pozitif bir sayı olmalıdır');
        return;
      }
    }

    if (saveAsDraft) {
      setIsSavingDraft(true);
    } else {
      setIsSubmitting(true);
    }

    try {
      await offInvoiceEndpoints.createTransaction(formData);
      const successMessage = saveAsDraft
        ? 'Taslak kaydedildi'
        : 'Off-Invoice fatura girişi başarıyla oluşturuldu';
      if (toast?.success) {
        toast.success(successMessage);
      }

      // Reset form state
      setStep(1);
      setSelectedAgreement(null);
      setSearchQuery('');
      setTypeFilter('ALL');
      setCplFilter('ALL');
      setFormData({
        agreementId: '',
        invoiceNo: '',
        invoiceDate: new Date().toISOString().split('T')[0],
        fiscalPeriod: '',
        amount: 0,
        currency: 'TRY',
        notes: '',
      });
      setSelectedFile(null);

      // Close modal and refresh data
      if (!saveAsDraft) {
        onSuccess?.();
      }
    } catch (error: any) {
      const errorMessage =
        error?.response?.data?.message ||
        error?.message ||
        'Fatura girişi başarısız oldu';
      if (toast?.error) {
        toast.error(errorMessage);
      } else {
        console.error('Fatura girişi hatası:', errorMessage);
      }
    } finally {
      setIsSubmitting(false);
      setIsSavingDraft(false);
    }
  };

  const handleClose = () => {
    setStep(1);
    setSelectedAgreement(null);
    setSearchQuery('');
    setTypeFilter('ALL');
    setCplFilter('ALL');
    setFormData({
      agreementId: '',
      invoiceNo: '',
      invoiceDate: new Date().toISOString().split('T')[0],
      fiscalPeriod: '',
      amount: 0,
      currency: 'TRY',
      notes: '',
    });
    onClose();
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('tr-TR', {
      style: 'currency',
      currency: 'TRY',
    }).format(amount);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <div>
            <h2 className="text-2xl font-bold">Off-Invoice Fatura Girişi</h2>
            <p className="text-sm text-gray-600 mt-1">ADIM {step}/2</p>
          </div>
          <button
            onClick={handleClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {step === 1 && (
            <div className="space-y-4">
              {/* Search and Filters */}
              <div className="space-y-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                  <input
                    type="text"
                    placeholder="Anlaşma ara (kod, isim, müşteri)..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <select
                    value={typeFilter}
                    onChange={(e) => setTypeFilter(e.target.value as any)}
                    className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="ALL">Tip: Tümü</option>
                    <option value="STA">STA</option>
                    <option value="LTA">LTA</option>
                  </select>
                  <select
                    value={cplFilter}
                    onChange={(e) => setCplFilter(e.target.value)}
                    className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="ALL">CPL: Tümü</option>
                    {/* TODO: Add CPL options */}
                  </select>
                </div>
              </div>

              {/* Agreement List */}
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {isLoadingAgreements ? (
                  <div className="flex items-center justify-center py-8">
                    <LoadingSpinner />
                  </div>
                ) : filteredAgreements.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    Anlaşma bulunamadı
                  </div>
                ) : (
                  filteredAgreements.map((agreement: Agreement) => (
                    <AgreementCard
                      key={agreement.id}
                      agreement={agreement}
                      onSelect={handleSelectAgreement}
                      isSelected={selectedAgreement?.id === agreement.id}
                    />
                  ))
                )}
              </div>
            </div>
          )}

          {step === 2 && selectedAgreement && (
            <div className="space-y-6">
              {/* Selected Agreement */}
              <div className="bg-blue-50 rounded-lg p-4 flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 mb-1">SEÇİLEN ANLAŞMA</p>
                  <p className="font-semibold text-lg">
                    {selectedAgreement.agreementName ||
                      selectedAgreement.agreementNumber ||
                      selectedAgreement.id}
                  </p>
                </div>
                <button
                  onClick={() => setStep(1)}
                  className="px-4 py-2 text-blue-600 border border-blue-600 rounded-lg hover:bg-blue-100"
                >
                  Değiştir
                </button>
              </div>

              {/* Invoice Information */}
              <div className="space-y-4">
                <h3 className="font-semibold text-lg">Fatura Bilgileri</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Fatura No *
                    </label>
                    <input
                      type="text"
                      value={formData.invoiceNo}
                      onChange={(e) =>
                        setFormData({ ...formData, invoiceNo: e.target.value })
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="FF-Q1-001"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Fatura Tarihi *
                    </label>
                    <input
                      type="date"
                      value={formData.invoiceDate}
                      onChange={(e) => {
                        const newDate = e.target.value;
                        setFormData({ ...formData, invoiceDate: newDate });
                        // Auto-update fiscal period if not set
                        if (!formData.fiscalPeriod && newDate) {
                          const date = new Date(newDate);
                          const year = date.getFullYear();
                          const month = String(date.getMonth() + 1).padStart(
                            2,
                            '0'
                          );
                          setFormData((prev) => ({
                            ...prev,
                            fiscalPeriod: `${year}-${month}`,
                          }));
                        }
                      }}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    {formData.invoiceDate && (
                      <p className="text-xs text-gray-500 mt-1">
                        {new Date(formData.invoiceDate).toLocaleDateString(
                          'tr-TR'
                        )}
                      </p>
                    )}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Dönem (Ay/Yıl) *
                    </label>
                    <select
                      value={formData.fiscalPeriod}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          fiscalPeriod: e.target.value,
                        })
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">Dönem seçiniz</option>
                      {periodOptions.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                    <p className="text-xs text-gray-500 mt-1">
                      Bütçe buradan düşülür
                    </p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Tutar (₺) *
                    </label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500">
                        ₺
                      </span>
                      <input
                        type="number"
                        step="0.01"
                        min="0.01"
                        value={formData.amount}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            amount: parseFloat(e.target.value) || 0,
                          })
                        }
                        className="w-full pl-8 pr-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="0.00"
                      />
                    </div>
                  </div>
                  <div className="col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Açıklama
                    </label>
                    <textarea
                      value={formData.notes || ''}
                      onChange={(e) =>
                        setFormData({ ...formData, notes: e.target.value })
                      }
                      rows={3}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Q1 Settlement, Display Fee, etc."
                    />
                  </div>
                  <div className="col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Ek Dosya
                    </label>
                    <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                      <input
                        type="file"
                        id="file-upload"
                        onChange={handleFileSelect}
                        className="hidden"
                        accept=".pdf,.jpg,.jpeg,.png,.xlsx,.xls"
                      />
                      <label
                        htmlFor="file-upload"
                        className="cursor-pointer flex flex-col items-center"
                      >
                        <Paperclip className="w-8 h-8 text-gray-400 mb-2" />
                        <span className="text-sm text-gray-600">
                          Dosya seç veya sürükle (Opsiyonel)
                        </span>
                        {selectedFile && (
                          <span className="text-xs text-blue-600 mt-2">
                            {selectedFile.name}
                          </span>
                        )}
                      </label>
                    </div>
                  </div>
                </div>
              </div>

              {/* Agreement Cap Impact */}
              {agreementCapImpact && (
                <div className="bg-gray-50 rounded-lg p-4 space-y-3">
                  <h3 className="font-semibold text-lg">ANLAŞMA CAP ETKİSİ</h3>
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <p className="text-sm text-gray-600 mb-1">Mevcut Kalan</p>
                      <p className="text-lg font-semibold">
                        {formatCurrency(agreementCapImpact.currentRemaining)}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600 mb-1">
                        Fatura Tutarı
                      </p>
                      <p className="text-lg font-semibold text-blue-600">
                        -{formatCurrency(agreementCapImpact.invoiceAmount)}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600 mb-1">
                        İşlem Sonrası
                      </p>
                      <p
                        className={`text-lg font-semibold ${
                          agreementCapImpact.afterTransaction >= 0
                            ? 'text-green-600'
                            : 'text-red-600'
                        }`}
                      >
                        {formatCurrency(agreementCapImpact.afterTransaction)}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Budget Impact */}
              {budgetImpact &&
                budgetImpact.envelope &&
                formData.fiscalPeriod && (
                  <div className="bg-gray-50 rounded-lg p-4 space-y-3">
                    <h3 className="font-semibold text-lg">BÜTÇE ETKİSİ</h3>
                    <div>
                      <p className="text-sm text-gray-600 mb-2">
                        {budgetImpact.channel || 'N/A'} /{' '}
                        {budgetImpact.category || 'N/A'} (
                        {formData.fiscalPeriod})
                      </p>
                      <div className="flex items-center space-x-4">
                        <div>
                          <p className="text-sm text-gray-600">Available:</p>
                          <div className="flex items-center space-x-2">
                            <span className="line-through text-gray-400">
                              {formatCurrency(budgetImpact.currentAvailable)}
                            </span>
                            <span className="text-green-600 font-semibold">
                              {formatCurrency(
                                budgetImpact.currentAvailable - formData.amount
                              )}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-6 border-t bg-gray-50">
          <div className="text-sm text-gray-600">
            {step === 1 && 'Lütfen anlaşma seçiniz'}
            {step === 2 && 'Fatura bilgilerini kontrol ediniz'}
          </div>
          <div className="flex space-x-3">
            {step === 2 && (
              <button
                onClick={() => setStep(1)}
                className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 flex items-center"
              >
                <ChevronLeft className="w-4 h-4 mr-1" />
                Geri
              </button>
            )}
            <button
              onClick={handleClose}
              className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              İptal
            </button>
            {step === 1 && (
              <button
                onClick={() => {
                  if (selectedAgreement) {
                    setStep(2);
                  } else {
                    toast.error('Lütfen bir anlaşma seçin');
                  }
                }}
                disabled={!selectedAgreement}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center"
              >
                Devam Et <ChevronRight className="w-4 h-4 ml-1" />
              </button>
            )}
            {step === 2 && (
              <>
                <button
                  onClick={() => handleSubmit(true)}
                  disabled={isSavingDraft}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center"
                >
                  {isSavingDraft ? (
                    <>
                      <LoadingSpinner className="w-4 h-4 mr-2" />
                      Kaydediliyor...
                    </>
                  ) : (
                    <>
                      <FileText className="w-4 h-4 mr-2" />
                      Taslak Kaydet
                    </>
                  )}
                </button>
                <button
                  onClick={() => handleSubmit(false)}
                  disabled={isSubmitting}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center"
                >
                  {isSubmitting ? (
                    <>
                      <LoadingSpinner className="w-4 h-4 mr-2" />
                      Kaydediliyor...
                    </>
                  ) : (
                    <>
                      <Check className="w-4 h-4 mr-2" />
                      Kaydet
                    </>
                  )}
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// Agreement Card Component
function AgreementCard({
  agreement,
  onSelect,
  isSelected,
}: {
  agreement: Agreement;
  onSelect: (agreement: Agreement) => void;
  isSelected: boolean;
}) {
  const [remainingCap, setRemainingCap] = useState<number | null>(null);
  const { data: total } = useQuery({
    queryKey: ['agreement-total', agreement.id],
    queryFn: () => offInvoiceEndpoints.getTotalByAgreement(agreement.id),
    enabled: !!agreement.id,
  });

  useEffect(() => {
    if (total !== undefined && agreement.capTotalAmount) {
      setRemainingCap(toNumber(agreement.capTotalAmount) - total);
    }
  }, [total, agreement.capTotalAmount]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('tr-TR', {
      style: 'currency',
      currency: 'TRY',
    }).format(amount);
  };

  return (
    <div
      onClick={() => onSelect(agreement)}
      className={`border rounded-lg p-4 cursor-pointer hover:bg-gray-50 transition-colors ${
        isSelected ? 'border-blue-600 bg-blue-50' : 'border-gray-200'
      }`}
    >
      <div className="flex items-start justify-between">
        <div className="flex items-start space-x-3 flex-1">
          <input
            type="radio"
            checked={isSelected}
            onChange={() => onSelect(agreement)}
            className="mt-1"
          />
          <div className="flex-1">
            <div className="flex items-center space-x-2 mb-1">
              <span className="font-medium text-sm">
                {agreement.agreementType} -{' '}
                {agreement.agreementNumber || agreement.id}
              </span>
            </div>
            <div className="text-sm font-semibold text-gray-900 mb-1">
              {agreement.agreementName || agreement.description || '-'}
            </div>
            <div className="text-xs text-gray-600">
              {agreement.cplName || `CPL: ${agreement.cplId}`}
              {agreement.categoryName && ` • ${agreement.categoryName}`}
            </div>
          </div>
        </div>
        <div className="text-right">
          <div className="text-xs text-gray-600 mb-1">KALAN CAP</div>
          <div className="font-semibold text-blue-600">
            {remainingCap !== null
              ? formatCurrency(remainingCap)
              : formatCurrency(toNumber(agreement.capTotalAmount))}
          </div>
        </div>
      </div>
    </div>
  );
}
