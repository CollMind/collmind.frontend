import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { offInvoiceEndpoints } from '@/api/endpoints/off-invoice.endpoints';
import { UploadFileResponse, CreateOffInvoiceTransactionDto } from '@/types/off-invoice.types';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import { useToast } from '@/hooks/useToast';

type Step = 'upload' | 'validation' | 'approval';

export function OffInvoiceUploadPage() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [step, setStep] = useState<Step>('upload');
  const [file, setFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [validationResult, setValidationResult] = useState<UploadFileResponse | null>(null);
  const [isImporting, setIsImporting] = useState(false);

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
      const result = await offInvoiceEndpoints.uploadFile(file);
      setValidationResult(result);
      setStep('validation');
      toast.success('Dosya yüklendi ve validasyon tamamlandı');
    } catch (error: any) {
      toast.error(error?.response?.data?.message || 'Dosya yükleme başarısız oldu');
    } finally {
      setIsUploading(false);
    }
  }, [file, toast]);

  const handleImport = useCallback(async () => {
    if (!validationResult || validationResult.validRows.length === 0) {
      toast.error('İçe aktarılacak geçerli satır bulunmuyor');
      return;
    }

    setIsImporting(true);
    try {
      const rows: CreateOffInvoiceTransactionDto[] = validationResult.validRows.map(row => ({
        agreementId: row.agreementId,
        invoiceNo: row.invoiceNo,
        invoiceDate: row.invoiceDate,
        fiscalPeriod: row.fiscalPeriod, // Include fiscal period for budget deduction
        amount: row.amount,
        currency: row.currency || 'TRY',
        notes: row.notes,
      }));

      await offInvoiceEndpoints.validateAndImport(rows);
      toast.success(`${validationResult.validRows.length} satır başarıyla içe aktarıldı`);
      navigate('/off-invoice/transactions');
    } catch (error: any) {
      toast.error(error?.response?.data?.message || 'İçe aktarma başarısız oldu');
    } finally {
      setIsImporting(false);
    }
  }, [validationResult, toast, navigate]);

  const handleDownloadTemplate = useCallback(async (type: 'excel' | 'csv') => {
    try {
      const blob = type === 'excel'
        ? await offInvoiceEndpoints.downloadExcelTemplate()
        : await offInvoiceEndpoints.downloadCSVTemplate();
      
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `off-invoice-template.${type === 'excel' ? 'xlsx' : 'csv'}`;
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
          <h1 className="text-3xl font-bold">Off-Invoice Yükleme</h1>
          <p className="text-gray-600 mt-1">
            Toplu fatura ve dekont işlemlerini sisteme yükleyin.
          </p>
        </div>
      </div>

      {/* Steps */}
      <div className="flex items-center space-x-4 mb-8">
        <div className={`flex items-center ${step === 'upload' ? 'text-blue-600' : step === 'validation' || step === 'approval' ? 'text-green-600' : 'text-gray-400'}`}>
          <div className={`w-10 h-10 rounded-full flex items-center justify-center border-2 ${step === 'upload' ? 'border-blue-600 bg-blue-50' : step === 'validation' || step === 'approval' ? 'border-green-600 bg-green-50' : 'border-gray-300'}`}>
            {step === 'validation' || step === 'approval' ? '✓' : '1'}
          </div>
          <span className="ml-2 font-medium">Dosya Yükleme</span>
        </div>
        <div className={`flex-1 h-0.5 ${step === 'validation' || step === 'approval' ? 'bg-green-600' : 'bg-gray-300'}`} />
        <div className={`flex items-center ${step === 'validation' ? 'text-blue-600' : step === 'approval' ? 'text-green-600' : 'text-gray-400'}`}>
          <div className={`w-10 h-10 rounded-full flex items-center justify-center border-2 ${step === 'validation' ? 'border-blue-600 bg-blue-50' : step === 'approval' ? 'border-green-600 bg-green-50' : 'border-gray-300'}`}>
            {step === 'approval' ? '✓' : '2'}
          </div>
          <span className="ml-2 font-medium">Validasyon</span>
        </div>
        <div className={`flex-1 h-0.5 ${step === 'approval' ? 'bg-green-600' : 'bg-gray-300'}`} />
        <div className={`flex items-center ${step === 'approval' ? 'text-blue-600' : 'text-gray-400'}`}>
          <div className={`w-10 h-10 rounded-full flex items-center justify-center border-2 ${step === 'approval' ? 'border-blue-600 bg-blue-50' : 'border-gray-300'}`}>
            3
          </div>
          <span className="ml-2 font-medium">Onay</span>
        </div>
      </div>

      {/* Step Content */}
      {step === 'upload' && (
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4">Dosya Yükleme</h2>
          
          {/* File Upload Area */}
          <div className="border-2 border-dashed border-gray-300 rounded-lg p-12 text-center mb-6">
            <div className="flex flex-col items-center">
              <svg className="w-16 h-16 text-blue-600 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
              </svg>
              <p className="text-lg font-medium mb-2">
                Dosyayı buraya sürükleyin
              </p>
              <p className="text-gray-600 mb-4">veya dosya seçmek için tıklayın</p>
              <input
                type="file"
                accept=".xlsx,.xls,.csv"
                onChange={(e) => {
                  const selectedFile = e.target.files?.[0];
                  if (selectedFile) {
                    handleFileSelect(selectedFile);
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
            <p>Kabul edilen formatlar: <span className="font-medium">.xlsx, .csv</span></p>
            <p>Maksimum dosya boyutu: <span className="font-medium">10MB</span></p>
          </div>

          {/* Template Download */}
          <div className="border-t pt-4 mt-6">
            <h3 className="font-semibold mb-3 flex items-center">
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              Template İndir
            </h3>
            <div className="flex space-x-4">
              <button
                onClick={() => handleDownloadTemplate('excel')}
                className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 flex items-center"
              >
                <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M4 2a2 2 0 012-2h8a2 2 0 012 2v16a2 2 0 01-2 2H6a2 2 0 01-2-2V2zm8 2H6v16h8V4z" />
                </svg>
                Excel Template
              </button>
              <button
                onClick={() => handleDownloadTemplate('csv')}
                className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 flex items-center"
              >
                <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M4 2a2 2 0 012-2h8a2 2 0 012 2v16a2 2 0 01-2 2H6a2 2 0 01-2-2V2zm8 2H6v16h8V4z" />
                </svg>
                CSV Template
              </button>
            </div>
            <div className="mt-4 text-sm text-gray-600">
              <p className="mb-2">Yükleyeceğiniz dosyanın aşağıdaki kolonları içermesi gerekmektedir:</p>
              <ul className="list-disc list-inside space-y-1">
                <li><span className="font-medium">agreement_id</span> (ZORUNLU): Anlaşma ID'si (örn: STA-2026-001)</li>
                <li><span className="font-medium">invoice_no</span> (ZORUNLU): Fatura numarası</li>
                <li><span className="font-medium">invoice_date</span> (ZORUNLU): YYYY-MM-DD formatında tarih</li>
                <li><span className="font-medium">fiscal_period</span> (ZORUNLU): YYYY-MM formatında dönem (Bütçe buradan düşülür)</li>
                <li><span className="font-medium">amount</span> (ZORUNLU): İşlem tutarı (Pozitif sayı)</li>
                <li><span className="font-medium">description</span> (OPSİYONEL): İşlem açıklaması</li>
              </ul>
            </div>
          </div>

          {/* Upload Button */}
          <div className="mt-6 flex justify-end">
            <button
              onClick={handleFileUpload}
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
      )}

      {step === 'validation' && validationResult && (
        <ValidationStep
          result={validationResult}
          onImport={handleImport}
          isImporting={isImporting}
          onRecheck={() => {
            setStep('upload');
            setFile(null);
            setValidationResult(null);
          }}
        />
      )}
    </div>
  );
}

function ValidationStep({
  result,
  onImport,
  isImporting,
  onRecheck,
}: {
  result: UploadFileResponse;
  onImport: () => void;
  isImporting: boolean;
  onRecheck: () => void;
}) {
  const [activeTab, setActiveTab] = useState<'all' | 'valid' | 'invalid' | 'warning'>('all');

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('tr-TR', {
      style: 'currency',
      currency: 'TRY',
    }).format(amount);
  };

  const allRows = [
    ...result.validRows.map(r => ({ ...r, type: 'valid' as const })),
    ...result.warningRows.map(r => ({ ...r, type: 'warning' as const })),
    ...result.invalidRows.map(r => ({ ...r, type: 'invalid' as const })),
  ].sort((a, b) => a.rowNumber - b.rowNumber);

  const filteredRows = activeTab === 'all' 
    ? allRows 
    : activeTab === 'valid'
    ? result.validRows.map(r => ({ ...r, type: 'valid' as const }))
    : activeTab === 'invalid'
    ? result.invalidRows.map(r => ({ ...r, type: 'invalid' as const }))
    : result.warningRows.map(r => ({ ...r, type: 'warning' as const }));

  return (
    <div className="space-y-6">
      {/* Batch Summary */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold mb-4">
          Batch Özeti: {result.totalRows} satır
        </h2>
        <div className="grid grid-cols-4 gap-4 mb-6">
          <div>
            <p className="text-sm text-gray-600">TOPLAM SATIR</p>
            <p className="text-2xl font-bold">{result.totalRows}</p>
          </div>
          <div>
            <p className="text-sm text-gray-600">GEÇERLİ</p>
            <p className="text-2xl font-bold text-green-600">{result.validCount}</p>
          </div>
          <div>
            <p className="text-sm text-gray-600">HATALI</p>
            <p className="text-2xl font-bold text-red-600">{result.invalidCount}</p>
          </div>
          <div>
            <p className="text-sm text-gray-600">UYARI</p>
            <p className="text-2xl font-bold text-yellow-600">{result.warningCount}</p>
          </div>
        </div>
        <div className="grid grid-cols-3 gap-4">
          <div>
            <p className="text-sm text-gray-600">TOPLAM TUTAR</p>
            <p className="text-xl font-bold">{formatCurrency(result.summary.totalAmount)}</p>
          </div>
          <div>
            <p className="text-sm text-gray-600">ETKİLENEN ANLAŞMA</p>
            <p className="text-xl font-bold">{result.summary.affectedAgreements}</p>
          </div>
          <div>
            <p className="text-sm text-gray-600">UYARI</p>
            <p className="text-xl font-bold text-yellow-600">{result.warningCount}</p>
          </div>
        </div>
        <div className="mt-4">
          <button
            onClick={onRecheck}
            className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            Tekrar Kontrol Et
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-lg shadow">
        <div className="border-b border-gray-200">
          <div className="flex space-x-4 px-6">
            <button
              onClick={() => setActiveTab('all')}
              className={`py-4 px-2 border-b-2 ${
                activeTab === 'all' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-600'
              }`}
            >
              Tümü {result.totalRows}
            </button>
            <button
              onClick={() => setActiveTab('valid')}
              className={`py-4 px-2 border-b-2 ${
                activeTab === 'valid' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-600'
              }`}
            >
              Geçerli {result.validCount}
            </button>
            <button
              onClick={() => setActiveTab('invalid')}
              className={`py-4 px-2 border-b-2 ${
                activeTab === 'invalid' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-600'
              }`}
            >
              Hatalı {result.invalidCount}
            </button>
            <button
              onClick={() => setActiveTab('warning')}
              className={`py-4 px-2 border-b-2 ${
                activeTab === 'warning' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-600'
              }`}
            >
              Uyarı {result.warningCount}
            </button>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">#</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Agreement ID</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Fatura No</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Tarih</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Fiscal</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Tutar</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Durum</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Mesaj</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filteredRows.map((row) => (
                <tr key={row.rowNumber} className={row.type === 'invalid' ? 'bg-red-50' : row.type === 'warning' ? 'bg-yellow-50' : ''}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">{row.rowNumber}</td>
                  <td className={`px-6 py-4 whitespace-nowrap text-sm ${row.type === 'invalid' ? 'text-red-600 font-medium' : ''}`}>
                    {row.agreementId}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">{row.invoiceNo}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">{row.invoiceDate}</td>
                  <td className={`px-6 py-4 whitespace-nowrap text-sm ${row.type === 'invalid' && !row.fiscalPeriod ? 'text-red-600' : ''}`}>
                    {row.fiscalPeriod || '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">{formatCurrency(row.amount)}</td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {row.type === 'valid' ? (
                      <span className="text-green-600">✓</span>
                    ) : row.type === 'warning' ? (
                      <span className="text-yellow-600">⚠</span>
                    ) : (
                      <span className="text-red-600">✗</span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-sm">
                    {row.type === 'invalid' && 'errors' in row && row.errors.length > 0 && (
                      <div>
                        {row.errors.map((err, idx) => (
                          <p key={idx} className="text-red-600">{err.message}</p>
                        ))}
                      </div>
                    )}
                    {row.type === 'warning' && 'warnings' in row && row.warnings.length > 0 && (
                      <div>
                        {row.warnings.map((warn, idx) => (
                          <p key={idx} className="text-yellow-600">{warn.message}</p>
                        ))}
                      </div>
                    )}
                    {row.type === 'valid' && '-'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Actions */}
      <div className="flex justify-end space-x-4">
        <button
          onClick={onRecheck}
          className="px-6 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
        >
          İptal Et
        </button>
        {result.invalidCount > 0 && (
          <button
            className="px-6 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            Hata Raporu
          </button>
        )}
        <button
          onClick={onImport}
          disabled={result.validCount === 0 || isImporting}
          className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center"
        >
          {isImporting ? (
            <>
              <LoadingSpinner className="w-4 h-4 mr-2" />
              İçe Aktarılıyor...
            </>
          ) : (
            `Hataları Düzeltin (${result.invalidCount})`
          )}
        </button>
        {result.validCount > 0 && (
          <button
            onClick={onImport}
            disabled={isImporting}
            className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center"
          >
            {isImporting ? (
              <>
                <LoadingSpinner className="w-4 h-4 mr-2" />
                İçe Aktarılıyor...
              </>
            ) : (
              `Geçerli Satırları İçe Aktar (${result.validCount})`
            )}
          </button>
        )}
      </div>
    </div>
  );
}
