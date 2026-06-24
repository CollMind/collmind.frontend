import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { CustomerImportButton } from '@/components/customers';
import { ArrowLeft, Upload, FileSpreadsheet, Download } from 'lucide-react';

export function CustomerImportPage() {
  const navigate = useNavigate();

  const handleDownloadTemplate = () => {
    // Template dosyasını indir (örnek CSV/Excel)
    const template = `code,name,channel,type,status,city,contactEmail,contactPhone,isVip
CUST001,Örnek Müşteri 1,RETAIL,DIRECT,ACTIVE,İstanbul,ornek1@example.com,02121234567,false
CUST002,Örnek Müşteri 2,WHOLESALE,DISTRIBUTOR,ACTIVE,Ankara,ornek2@example.com,03121234567,true`;

    const blob = new Blob([template], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', 'musteri_template.csv');
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    // Memory leak'i önlemek için URL'i temizle
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" onClick={() => navigate('/customers')}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Geri Dön
          </Button>
          <h1 className="text-3xl font-bold">Müşteri İçe Aktarma</h1>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Template İndirme */}
        <Card className="p-6">
          <div className="flex items-center gap-3 mb-4">
            <FileSpreadsheet className="h-6 w-6 text-blue-500" />
            <h2 className="text-xl font-semibold">Template İndir</h2>
          </div>
          <p className="text-gray-600 mb-4">
            Müşteri verilerini toplu olarak eklemek için örnek template
            dosyasını indirin ve doldurun.
          </p>
          <Button onClick={handleDownloadTemplate} variant="outline">
            <Download className="mr-2 h-4 w-4" />
            Template İndir (CSV)
          </Button>
        </Card>

        {/* İçe Aktarma */}
        <Card className="p-6">
          <div className="flex items-center gap-3 mb-4">
            <Upload className="h-6 w-6 text-green-500" />
            <h2 className="text-xl font-semibold">Dosya Yükle</h2>
          </div>
          <p className="text-gray-600 mb-4">
            Doldurduğunuz Excel (.xlsx, .xls) veya CSV (.csv) dosyasını
            yükleyin. Maksimum dosya boyutu 10MB'dır.
          </p>
          <CustomerImportButton />
        </Card>
      </div>

      {/* Bilgilendirme */}
      <Card className="p-6 bg-blue-50">
        <h3 className="font-semibold mb-2">Önemli Notlar</h3>
        <ul className="list-disc list-inside space-y-1 text-sm text-gray-700">
          <li>Dosya formatı: Excel (.xlsx, .xls) veya CSV (.csv)</li>
          <li>Maksimum dosya boyutu: 10MB</li>
          <li>Zorunlu alanlar: code, name, channel</li>
          <li>Müşteri kodları benzersiz olmalıdır</li>
          <li>Email formatı geçerli olmalıdır</li>
        </ul>
      </Card>
    </div>
  );
}
