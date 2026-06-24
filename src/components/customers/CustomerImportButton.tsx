import React, { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { useCustomerImport } from '@/services/customers.service';
import { CustomerImportResults } from './CustomerImportResults';
import { Upload, FileSpreadsheet, FileText, Loader2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';

interface CustomerImportButtonProps {
  onImportSuccess?: () => void;
}

export function CustomerImportButton({
  onImportSuccess,
}: CustomerImportButtonProps = {}) {
  const [isOpen, setIsOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const { importResult, showResults, setShowResults, ...importMutation } =
    useCustomerImport();

  const validateFile = (file: File): { valid: boolean; error?: string } => {
    // Dosya formatı kontrolü
    const allowedExtensions = ['xlsx', 'xls', 'csv'];
    const fileExtension = file.name.split('.').pop()?.toLowerCase();

    if (!fileExtension || !allowedExtensions.includes(fileExtension)) {
      return {
        valid: false,
        error:
          'Sadece Excel (.xlsx, .xls) veya CSV (.csv) dosyaları kabul edilir.',
      };
    }

    // Dosya boyutu kontrolü (10MB)
    const maxSize = 10 * 1024 * 1024;
    if (file.size > maxSize) {
      return {
        valid: false,
        error: "Dosya boyutu 10MB'dan büyük olamaz.",
      };
    }

    return { valid: true };
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const validation = validateFile(file);
      if (!validation.valid) {
        alert(validation.error);
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
        return;
      }

      setSelectedFile(file);
    }
  };

  const handleImport = async () => {
    if (!selectedFile) return;

    try {
      await importMutation.mutateAsync(selectedFile);
      setIsOpen(false);
      setSelectedFile(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      // Import başarılı olduğunda parent'a bildir
      onImportSuccess?.();
    } catch (error) {
      // Error handling hook'ta yapılıyor
    }
  };

  const handleCancel = () => {
    setIsOpen(false);
    setSelectedFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="gap-2">
          <Upload className="h-4 w-4" />
          Toplu İçe Aktar
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Müşteri Toplu İçe Aktarma</DialogTitle>
          <DialogDescription>
            Excel (.xlsx, .xls) veya CSV (.csv) dosyası yükleyerek müşterileri
            toplu olarak ekleyebilirsiniz.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div>
            <label
              htmlFor="file-upload"
              className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors"
            >
              <div className="flex flex-col items-center justify-center pt-5 pb-6">
                {selectedFile ? (
                  <>
                    {selectedFile.name.endsWith('.csv') ? (
                      <FileText className="w-10 h-10 text-blue-500 mb-2" />
                    ) : (
                      <FileSpreadsheet className="w-10 h-10 text-green-500 mb-2" />
                    )}
                    <p className="mb-2 text-sm text-gray-500">
                      <span className="font-semibold">{selectedFile.name}</span>
                    </p>
                    <p className="text-xs text-gray-500">
                      {(selectedFile.size / 1024).toFixed(2)} KB
                    </p>
                  </>
                ) : (
                  <>
                    <Upload className="w-10 h-10 text-gray-400 mb-2" />
                    <p className="mb-2 text-sm text-gray-500">
                      <span className="font-semibold">
                        Dosya seçmek için tıklayın
                      </span>
                    </p>
                    <p className="text-xs text-gray-500">
                      Excel (.xlsx, .xls) veya CSV (.csv)
                    </p>
                  </>
                )}
              </div>
              <input
                id="file-upload"
                ref={fileInputRef}
                type="file"
                className="hidden"
                accept=".xlsx,.xls,.csv"
                onChange={handleFileSelect}
                disabled={importMutation.isPending}
              />
            </label>
          </div>

          {selectedFile && (
            <div className="text-sm text-gray-600 bg-blue-50 p-3 rounded-md">
              <p className="font-medium mb-1">Seçilen dosya:</p>
              <p>{selectedFile.name}</p>
              <p className="text-xs mt-1">
                {(selectedFile.size / 1024).toFixed(2)} KB
              </p>
            </div>
          )}

          <div className="flex justify-end gap-2">
            <Button
              variant="outline"
              onClick={handleCancel}
              disabled={importMutation.isPending}
            >
              İptal
            </Button>
            <Button
              onClick={handleImport}
              disabled={!selectedFile || importMutation.isPending}
            >
              {importMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Yükleniyor...
                </>
              ) : (
                'İçe Aktar'
              )}
            </Button>
          </div>
        </div>
      </DialogContent>

      {/* Import sonuçları modal */}
      {importResult && (
        <CustomerImportResults
          result={importResult}
          isOpen={showResults}
          onClose={() => setShowResults(false)}
        />
      )}
    </Dialog>
  );
}
