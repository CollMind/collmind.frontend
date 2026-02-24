import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { onInvoiceEndpoints } from '@/api/endpoints/on-invoice.endpoints';
import { UploadFileResponse, ValidationResponseDto, CompletionResponseDto } from '@/types/on-invoice.types';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import { useToast } from '@/hooks/useToast';

type Step = 'upload' | 'validation' | 'completed';

export function OnInvoiceUploadPage() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [step, setStep] = useState<Step>('upload');
  const [file, setFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [batchId, setBatchId] = useState<string | null>(null);
  const [validationResult, setValidationResult] = useState<ValidationResponseDto | null>(null);
  const [completionResult, setCompletionResult] = useState<CompletionResponseDto | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const handleFileSelect = useCallback((selectedFile: File) => {
    const fileExtension = selectedFile.name.split('.').pop()?.toLowerCase();
    if (!['xlsx', 'xls', 'csv'].includes(fileExtension || '')) {
      toast.error('Desteklenmeyen dosya formatı. Sadece Excel (.xlsx, .xls) veya CSV (.csv) dosyaları kabul edilir.');
      return;
    }

    if (selectedFile.size > 10 * 1024 * 1024) {
      toast.error('Dosya boyutu çok büyük. Maksimum 10MB olmalıdır.');
      return;
    }

    setFile(selectedFile);
  }, [toast]);

  const handleFileUpload = useCallback(async () => {
    if (!file) {
      toast.error('Lütfen bir dosya seçin');
      return;
    }

    setIsUploading(true);
    try {
      const result = await onInvoiceEndpoints.uploadFile(file);
      setBatchId(result.batchId);
      setValidationResult(result.validation);
      setStep('validation');
      toast.success('Dosya yüklendi ve validasyon tamamlandı');
    } catch (error: any) {
      // API client interceptor zaten toast gösteriyor, burada sadece log yapıyoruz
      console.error('Upload error:', error);
      // Eğer error mesajı yoksa veya toast gösterilmemişse, genel bir mesaj göster
      if (error && !error.isNetworkError && !error.response) {
        toast.error('Dosya yükleme başarısız oldu');
      }
    } finally {
      setIsUploading(false);
    }
  }, [file, toast]);

  const handleProcess = useCallback(async () => {
    if (!batchId) {
      toast.error('Batch ID bulunamadı');
      return;
    }

    setIsProcessing(true);
    try {
      const result = await onInvoiceEndpoints.processBatch(batchId);
      setCompletionResult(result);
      setStep('completed');
      toast.success('On-Invoice yükleme başarıyla tamamlandı');
    } catch (error: any) {
      // API client interceptor zaten toast gösteriyor, burada sadece log yapıyoruz
      console.error('Process error:', error);
      // Eğer error mesajı yoksa veya toast gösterilmemişse, genel bir mesaj göster
      if (error && !error.isNetworkError && !error.response) {
        toast.error('İşleme başarısız oldu');
      }
    } finally {
      setIsProcessing(false);
    }
  }, [batchId, toast]);

  const handleDownloadTemplate = useCallback(async (type: 'excel' | 'csv') => {
    try {
      const blob = type === 'excel'
        ? await onInvoiceEndpoints.downloadExcelTemplate()
        : await onInvoiceEndpoints.downloadCSVTemplate();
      
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `on-invoice-template.${type === 'excel' ? 'xlsx' : 'csv'}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
      toast.success('Template indirildi');
    } catch (error: any) {
      toast.error('Template indirme başarısız oldu');
    }
  }, [toast]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <button
            onClick={() => navigate(-1)}
            className="text-gray-600 hover:text-gray-900 mb-2"
          >
            ← Geri
          </button>
          <h1 className="text-3xl font-bold">On-Invoice Yükleme</h1>
          <p className="text-gray-600 mt-1">
            Fatura üstü indirimlerin toplu aktarımı
          </p>
        </div>
      </div>

      {/* Steps */}
      <div className="flex items-center space-x-4 mb-8">
        <div className={`flex items-center ${step === 'upload' ? 'text-blue-600' : step === 'validation' || step === 'completed' ? 'text-green-600' : 'text-gray-400'}`}>
          <div className={`w-10 h-10 rounded-full flex items-center justify-center border-2 ${step === 'upload' ? 'border-blue-600 bg-blue-50' : step === 'validation' || step === 'completed' ? 'border-green-600 bg-green-50' : 'border-gray-300'}`}>
            {step === 'validation' || step === 'completed' ? '✓' : '1'}
          </div>
          <span className="ml-2 font-medium">DOSYA YÜKLE</span>
        </div>
        <div className={`flex-1 h-0.5 ${step === 'validation' || step === 'completed' ? 'bg-green-600' : 'bg-gray-300'}`} />
        <div className={`flex items-center ${step === 'validation' ? 'text-blue-600' : step === 'completed' ? 'text-green-600' : 'text-gray-400'}`}>
          <div className={`w-10 h-10 rounded-full flex items-center justify-center border-2 ${step === 'validation' ? 'border-blue-600 bg-blue-50' : step === 'completed' ? 'border-green-600 bg-green-50' : 'border-gray-300'}`}>
            {step === 'completed' ? '✓' : '2'}
          </div>
          <span className="ml-2 font-medium">VALİDASYON</span>
        </div>
        <div className={`flex-1 h-0.5 ${step === 'completed' ? 'bg-green-600' : 'bg-gray-300'}`} />
        <div className={`flex items-center ${step === 'completed' ? 'text-blue-600' : 'text-gray-400'}`}>
          <div className={`w-10 h-10 rounded-full flex items-center justify-center border-2 ${step === 'completed' ? 'border-blue-600 bg-blue-50' : 'border-gray-300'}`}>
            3
          </div>
          <span className="ml-2 font-medium">TAMAMLANDI</span>
        </div>
      </div>

      {/* Step Content */}
      {step === 'upload' && (
        <UploadStep
          file={file}
          onFileSelect={handleFileSelect}
          onUpload={handleFileUpload}
          isUploading={isUploading}
          onDownloadTemplate={handleDownloadTemplate}
        />
      )}

      {step === 'validation' && validationResult && (
        <ValidationStep
          result={validationResult}
          onProcess={handleProcess}
          isProcessing={isProcessing}
          onCancel={() => {
            setStep('upload');
            setFile(null);
            setBatchId(null);
            setValidationResult(null);
          }}
        />
      )}

      {step === 'completed' && completionResult && (
        <CompletionStep
          result={completionResult}
          onNewUpload={() => {
            setStep('upload');
            setFile(null);
            setBatchId(null);
            setValidationResult(null);
            setCompletionResult(null);
          }}
          onGoToReport={() => {
            // TODO: Navigate to report page
            navigate('/on-invoice/reports');
          }}
        />
      )}
    </div>
  );
}

// Adım 1: Dosya Yükleme
function UploadStep({
  file,
  onFileSelect,
  onUpload,
  isUploading,
  onDownloadTemplate,
}: {
  file: File | null;
  onFileSelect: (file: File) => void;
  onUpload: () => void;
  isUploading: boolean;
  onDownloadTemplate: (type: 'excel' | 'csv') => void;
}) {
  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h2 className="text-xl font-semibold mb-4">Dosya Yükleme</h2>
      
      {/* On-Invoice Nedir? */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
        <div className="flex items-start">
          <svg className="w-5 h-5 text-blue-600 mt-0.5 mr-3 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
          </svg>
          <div>
            <h3 className="font-semibold text-blue-900 mb-2">On-Invoice Nedir?</h3>
            <p className="text-sm text-blue-800 mb-3">
              On-Invoice harcamalar, müşteri faturasında doğrudan uygulanan indirimlerdir. Bu veriler genellikle ERP veya satış sisteminden gelir ve bütçeden düşülmesi gerekir.
            </p>
            <div className="mb-3">
              <p className="text-sm font-semibold text-blue-900 mb-1">ÖRNEKLER:</p>
              <ul className="text-sm text-blue-800 list-disc list-inside space-y-1">
                <li>CPP On-Invoice %</li>
                <li>LTA Fatura Altı İskonto</li>
                <li>Anında Fiyat İndirimi</li>
              </ul>
            </div>
            <div className="bg-yellow-50 border border-yellow-200 rounded p-2 mt-3">
              <p className="text-xs text-yellow-800">
                <strong>▲ DİKKAT:</strong> Off-Invoice'dan farkı: On-Invoice müşterinin gördüğü faturada zaten düşülmüştür. Ayrı ödeme yapılmaz.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* File Upload Area */}
      <div className="border-2 border-dashed border-gray-300 rounded-lg p-12 text-center mb-6">
        <div className="flex flex-col items-center">
          <svg className="w-16 h-16 text-blue-600 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
          </svg>
          <p className="text-lg font-medium mb-2">
            Excel veya CSV dosyasını sürükleyin
          </p>
          <p className="text-gray-600 mb-4">veya dosya seçmek için tıklayın</p>
          <input
            type="file"
            accept=".xlsx,.xls,.csv"
            onChange={(e) => {
              const selectedFile = e.target.files?.[0];
              if (selectedFile) {
                onFileSelect(selectedFile);
              }
            }}
            className="hidden"
            id="file-upload"
          />
          <label
            htmlFor="file-upload"
            className="px-4 py-2 bg-blue-600 text-white rounded-lg cursor-pointer hover:bg-blue-700"
          >
            Dosya Seç
          </label>
          {file && (
            <p className="mt-4 text-sm text-gray-600">
              Seçilen dosya: <span className="font-medium">{file.name}</span>
            </p>
          )}
        </div>
      </div>

      <div className="text-sm text-gray-600 mb-4">
        <p>Kabul edilen formatlar: <span className="font-medium">.xlsx, .xls, .csv</span></p>
        <p>Maksimum dosya boyutu: <span className="font-medium">10MB</span></p>
      </div>

      {/* Template Yapısı */}
      <div className="border-t pt-4 mt-6">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold flex items-center">
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            Template Yapısı
          </h3>
          <button
            onClick={() => onDownloadTemplate('excel')}
            className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 flex items-center text-sm"
          >
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            Örnek Template İndir
          </button>
        </div>
        
        <div className="bg-gray-50 rounded-lg p-4 mb-4">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-2 px-3 font-semibold">CUSTOMER_CODE</th>
                  <th className="text-left py-2 px-3 font-semibold">INVOICE_NO</th>
                  <th className="text-left py-2 px-3 font-semibold">INVOICE_DATE</th>
                  <th className="text-left py-2 px-3 font-semibold">FISCAL_PERIOD</th>
                  <th className="text-left py-2 px-3 font-semibold">SKU_CODE</th>
                  <th className="text-left py-2 px-3 font-semibold">QUANTITY</th>
                  <th className="text-left py-2 px-3 font-semibold">LIST_PRICE</th>
                  <th className="text-left py-2 px-3 font-semibold">ACTUAL_PRICE</th>
                  <th className="text-left py-2 px-3 font-semibold">DISCOUNT</th>
                  <th className="text-left py-2 px-3 font-semibold">DISCOUNT_TYPE</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td className="py-2 px-3">CUST-CF-001</td>
                  <td className="py-2 px-3">INV-50001</td>
                  <td className="py-2 px-3">2026-01-15</td>
                  <td className="py-2 px-3">2026-01</td>
                  <td className="py-2 px-3">WEL-HC-001</td>
                  <td className="py-2 px-3">100</td>
                  <td className="py-2 px-3">185.00</td>
                  <td className="py-2 px-3">162.80</td>
                  <td className="py-2 px-3">2,220.00</td>
                  <td className="py-2 px-3">CPP_ON</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <div className="text-xs text-gray-600 space-y-1">
          <p><code className="bg-gray-100 px-1 rounded">customer_code</code>: CPL ile eşleşen müşteri kodu</p>
          <p><code className="bg-gray-100 px-1 rounded">invoice_no</code>: ERP fatura numarası</p>
          <p><code className="bg-gray-100 px-1 rounded">fiscal_period</code>: Bütçe dönemi (YYYY-MM)</p>
          <p><code className="bg-gray-100 px-1 rounded">discount_type</code>: İndirim tipi (CPP_ON, LTA_ON, PROMO_DISCOUNT)</p>
          <p><code className="bg-gray-100 px-1 rounded">discount_amount</code>: Satır bazlı toplam indirim (₺)</p>
          <p><code className="bg-gray-100 px-1 rounded">actual_price</code>: İndirimli birim fiyat</p>
          <p className="mt-2">* Ondalık ayracı olarak nokta (.) kullanılmalıdır.</p>
        </div>
      </div>

      {/* Upload Button */}
      <div className="mt-6 flex justify-end">
        <button
          onClick={onUpload}
          disabled={!file || isUploading}
          className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center"
        >
          {isUploading ? (
            <>
              <LoadingSpinner className="w-4 h-4 mr-2" />
              Yükleniyor...
            </>
          ) : (
            'Yükle ve Validasyon Yap'
          )}
        </button>
      </div>
    </div>
  );
}

// Adım 2: Validasyon
function ValidationStep({
  result,
  onProcess,
  isProcessing,
  onCancel,
}: {
  result: ValidationResponseDto;
  onProcess: () => void;
  isProcessing: boolean;
  onCancel: () => void;
}) {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('tr-TR', {
      style: 'currency',
      currency: 'TRY',
      minimumFractionDigits: 2,
    }).format(amount);
  };

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-3 gap-4">
        {/* Satır Analizi */}
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-sm font-semibold text-gray-600 mb-3">SATIR ANALİZİ</h3>
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-gray-600">Toplam</span>
              <span className="font-bold text-lg">{result.lineAnalysis.total}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Geçerli</span>
              <span className="font-bold text-lg text-green-600">{result.lineAnalysis.valid}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Hatalı</span>
              <span className="font-bold text-lg text-red-600">× {result.lineAnalysis.errors}</span>
            </div>
          </div>
        </div>

        {/* Finansal Özet */}
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-sm font-semibold text-gray-600 mb-3">FİNANSAL ÖZET</h3>
          <div className="text-3xl font-bold text-blue-600 mb-2">
            {formatCurrency(result.financialSummary.totalDiscount)}
          </div>
          <p className="text-sm text-gray-600">Toplam İndirim Tutarı</p>
        </div>

        {/* İndirim Dağılımı */}
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-sm font-semibold text-gray-600 mb-3">İNDİRİM DAĞILIMI</h3>
          <div className="space-y-2">
            {result.discountDistribution.cppOnInvoice && (
              <div>
                <div className="flex justify-between text-sm">
                  <span>CPP On-Invoice:</span>
                  <span className="font-semibold">{formatCurrency(result.discountDistribution.cppOnInvoice.amount)}</span>
                </div>
                <div className="text-xs text-gray-500">({result.discountDistribution.cppOnInvoice.percentage.toFixed(0)}%)</div>
              </div>
            )}
            {result.discountDistribution.ltaOnInvoice && (
              <div>
                <div className="flex justify-between text-sm">
                  <span>LTA On-Invoice:</span>
                  <span className="font-semibold">{formatCurrency(result.discountDistribution.ltaOnInvoice.amount)}</span>
                </div>
                <div className="text-xs text-gray-500">({result.discountDistribution.ltaOnInvoice.percentage.toFixed(0)}%)</div>
              </div>
            )}
            {result.discountDistribution.promoDiscount && (
              <div>
                <div className="flex justify-between text-sm">
                  <span>Promo Discount:</span>
                  <span className="font-semibold">{formatCurrency(result.discountDistribution.promoDiscount.amount)}</span>
                </div>
                <div className="text-xs text-gray-500">({result.discountDistribution.promoDiscount.percentage.toFixed(0)}%)</div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Bütçe Etkisi ve Hatalar */}
      <div className="grid grid-cols-2 gap-6">
        {/* Bütçe Etkisi */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold">Bütçe Etkisi</h3>
            <button className="px-3 py-1 text-sm border border-gray-300 rounded-lg hover:bg-gray-50">
              SİMÜLASYON
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-2 px-3 font-semibold">ENVELOPE</th>
                  <th className="text-right py-2 px-3 font-semibold">MEVCUT</th>
                  <th className="text-right py-2 px-3 font-semibold">BU YÜKLEME</th>
                  <th className="text-right py-2 px-3 font-semibold">SONRASI</th>
                </tr>
              </thead>
              <tbody>
                {result.budgetImpact.map((impact, idx) => (
                  <tr key={idx} className="border-b">
                    <td className="py-2 px-3">{impact.envelopeCode}</td>
                    <td className="py-2 px-3 text-right">{formatCurrency(impact.current)}</td>
                    <td className={`py-2 px-3 text-right ${impact.thisUpload < 0 ? 'text-blue-600' : ''}`}>
                      {formatCurrency(impact.thisUpload)}
                    </td>
                    <td className={`py-2 px-3 text-right ${
                      impact.status === 'RED' ? 'text-red-600' : 
                      impact.status === 'YELLOW' ? 'text-yellow-600' : 
                      'text-green-600'
                    }`}>
                      {formatCurrency(impact.after)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {result.criticalEnvelopesCount > 0 && (
            <div className="mt-4 bg-red-50 border border-red-200 rounded p-3">
              <p className="text-sm text-red-800">
                Dikkat: {result.criticalEnvelopesCount} envelope kritik seviyeye (RED) düşecek.
              </p>
            </div>
          )}
        </div>

        {/* Hatalar */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold">Hatalar ({result.errors.length})</h3>
            <button className="px-3 py-1 text-sm border border-gray-300 rounded-lg hover:bg-gray-50">
              Rapor İndir
            </button>
          </div>
          <div className="max-h-96 overflow-y-auto">
            <div className="space-y-2">
              {result.errors.slice(0, 10).map((error, idx) => (
                <div key={idx} className="text-sm border-l-4 border-red-500 pl-3 py-1">
                  <span className="font-semibold">Satır {error.rowNumber}:</span>{' '}
                  <span className="text-gray-700">{error.message}</span>
                </div>
              ))}
              {result.errors.length > 10 && (
                <p className="text-sm text-gray-500 italic">
                  ...ve {result.errors.length - 10} hata daha
                </p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="flex justify-end space-x-4">
        <button
          onClick={onCancel}
          className="px-6 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
        >
          İptal
        </button>
        {result.lineAnalysis.valid > 0 && (
          <button
            onClick={onProcess}
            disabled={isProcessing}
            className="px-6 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center"
          >
            {isProcessing ? (
              <>
                <LoadingSpinner className="w-4 h-4 mr-2" />
                İşleniyor...
              </>
            ) : (
              <>
                Hataları Atla ve Devam Et ({result.lineAnalysis.valid})
              </>
            )}
          </button>
        )}
      </div>
    </div>
  );
}

// Adım 3: Tamamlandı
function CompletionStep({
  result,
  onNewUpload,
  onGoToReport,
}: {
  result: CompletionResponseDto;
  onNewUpload: () => void;
  onGoToReport: () => void;
}) {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('tr-TR', {
      style: 'currency',
      currency: 'TRY',
      minimumFractionDigits: 2,
    }).format(amount);
  };

  return (
    <div className="bg-white rounded-lg shadow p-12 text-center">
      <div className="flex flex-col items-center">
        {/* Success Icon */}
        <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mb-6">
          <svg className="w-12 h-12 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>

        <h2 className="text-2xl font-bold text-green-600 mb-2">On-Invoice Yükleme Başarılı!</h2>
        <p className="text-gray-600 mb-8">
          İşlem başarıyla tamamlandı. Kayıtlar ilgili bütçe dönemlerine işlendi.
        </p>

        {/* Summary Box */}
        <div className="bg-gray-50 rounded-lg p-6 mb-8 w-full max-w-md">
          <div className="space-y-4 text-left">
            <div>
              <p className="text-sm text-gray-600">BATCH ID</p>
              <p className="font-semibold">{result.batchId}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">YÜKLENEN KAYIT</p>
              <p className="font-semibold">{result.uploadedRecords} satır</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">TOPLAM İNDİRİM</p>
              <p className="font-semibold text-lg">{formatCurrency(result.totalDiscount)}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">ETKİLENEN ENVELOPE</p>
              <p className="font-semibold">{result.affectedEnvelopes}</p>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex space-x-4">
          <button
            onClick={onGoToReport}
            className="px-6 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 flex items-center"
          >
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
            Rapora Git
          </button>
          <button
            onClick={onNewUpload}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center"
          >
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            Yeni Yükleme
          </button>
        </div>
      </div>
    </div>
  );
}
