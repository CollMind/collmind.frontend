import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { ImportResult, ImportErrorType } from '@/types/customer.types';
import { CheckCircle2, XCircle, AlertCircle, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';

// Dynamic import for xlsx to handle cases where it's not installed
let XLSX: any;
try {
  XLSX = require('xlsx');
} catch (e) {
  console.warn(
    'xlsx package not installed. Error report download will not work.'
  );
}

interface CustomerImportResultsProps {
  result: ImportResult;
  isOpen: boolean;
  onClose: () => void;
}

const getErrorTypeLabel = (type: ImportErrorType): string => {
  const labels: Record<ImportErrorType, string> = {
    MISSING_FIELD: 'Eksik Alan',
    INVALID_DATE: 'Geçersiz Tarih',
    INVALID_AMOUNT: 'Geçersiz Tutar',
    ALREADY_EXISTS: 'Zaten Mevcut',
    DUPLICATE_IN_FILE: 'Dosyada Tekrar',
    DATABASE_ERROR: 'Veritabanı Hatası',
    INVALID_EMAIL: 'Geçersiz Email',
  };
  return labels[type] || type;
};

const getErrorTypeColor = (type: ImportErrorType): string => {
  const colors: Record<ImportErrorType, string> = {
    MISSING_FIELD: 'text-yellow-600 bg-yellow-50',
    INVALID_DATE: 'text-orange-600 bg-orange-50',
    INVALID_AMOUNT: 'text-orange-600 bg-orange-50',
    ALREADY_EXISTS: 'text-blue-600 bg-blue-50',
    DUPLICATE_IN_FILE: 'text-purple-600 bg-purple-50',
    DATABASE_ERROR: 'text-red-600 bg-red-50',
    INVALID_EMAIL: 'text-pink-600 bg-pink-50',
  };
  return colors[type] || 'text-gray-600 bg-gray-50';
};

export function CustomerImportResults({
  result,
  isOpen,
  onClose,
}: CustomerImportResultsProps) {
  const { total, created, skipped, errors } = result;
  const successRate = total > 0 ? ((created / total) * 100).toFixed(1) : '0';

  const downloadErrorReport = () => {
    if (!XLSX) {
      alert(
        'xlsx paketi yüklü değil. Lütfen "npm install xlsx" komutunu çalıştırın.'
      );
      return;
    }

    const errorData = errors.map((error) => ({
      Satır: error.row,
      Kod: error.code,
      'Hata Tipi': getErrorTypeLabel(error.error_type),
      'Hata Mesajı': error.error_message,
      ...error.original_row_data,
    }));

    const ws = XLSX.utils.json_to_sheet(errorData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Hatalar');
    XLSX.writeFile(
      wb,
      `import_hatalari_${new Date().toISOString().split('T')[0]}.xlsx`
    );
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[700px] max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>İçe Aktarma Sonuçları</DialogTitle>
          <DialogDescription>
            Toplu içe aktarma işlemi tamamlandı
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Özet İstatistikler */}
          <div className="grid grid-cols-3 gap-4">
            <div className="text-center p-4 bg-blue-50 rounded-lg">
              <p className="text-2xl font-bold text-blue-600">{total}</p>
              <p className="text-sm text-gray-600">Toplam</p>
            </div>
            <div className="text-center p-4 bg-green-50 rounded-lg">
              <p className="text-2xl font-bold text-green-600">{created}</p>
              <p className="text-sm text-gray-600">Başarılı</p>
            </div>
            <div className="text-center p-4 bg-red-50 rounded-lg">
              <p className="text-2xl font-bold text-red-600">{skipped}</p>
              <p className="text-sm text-gray-600">Atlandı</p>
            </div>
          </div>

          {/* Başarı Oranı */}
          <div className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg">
            {parseFloat(successRate) === 100 ? (
              <CheckCircle2 className="h-5 w-5 text-green-500" />
            ) : parseFloat(successRate) > 50 ? (
              <AlertCircle className="h-5 w-5 text-yellow-500" />
            ) : (
              <XCircle className="h-5 w-5 text-red-500" />
            )}
            <span className="text-sm font-medium">
              Başarı Oranı: %{successRate}
            </span>
          </div>

          {/* Hatalar Listesi */}
          {errors.length > 0 && (
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <h4 className="font-medium text-sm text-gray-700">
                  Hatalar ({errors.length})
                </h4>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={downloadErrorReport}
                  className="gap-2"
                >
                  <Download className="h-4 w-4" />
                  Hata Raporunu İndir
                </Button>
              </div>
              <div className="max-h-60 overflow-y-auto border rounded-lg">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 sticky top-0">
                    <tr>
                      <th className="px-3 py-2 text-left">Satır</th>
                      <th className="px-3 py-2 text-left">Kod</th>
                      <th className="px-3 py-2 text-left">Hata Tipi</th>
                      <th className="px-3 py-2 text-left">Hata Mesajı</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {errors.map((error, index) => (
                      <tr key={index} className="hover:bg-gray-50">
                        <td className="px-3 py-2">{error.row}</td>
                        <td className="px-3 py-2 font-mono text-xs">
                          {error.code}
                        </td>
                        <td className="px-3 py-2">
                          <span
                            className={`px-2 py-1 rounded text-xs font-medium ${getErrorTypeColor(
                              error.error_type
                            )}`}
                          >
                            {getErrorTypeLabel(error.error_type)}
                          </span>
                        </td>
                        <td className="px-3 py-2 text-red-600">
                          {error.error_message}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={onClose}>
              Kapat
            </Button>
            {errors.length > 0 && (
              <Button onClick={downloadErrorReport} className="gap-2">
                <Download className="h-4 w-4" />
                Hata Raporunu İndir
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
