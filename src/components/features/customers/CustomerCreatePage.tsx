import { useNavigate } from 'react-router-dom';
import { CustomerForm } from '@/components/forms/CustomerForm';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';

export function CustomerCreatePage() {
  const navigate = useNavigate();

  const handleSuccess = () => {
    navigate('/customers');
  };

  const handleCancel = () => {
    navigate('/customers');
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" onClick={() => navigate('/customers')}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Geri Dön
        </Button>
        <h1 className="text-3xl font-bold">Yeni Müşteri</h1>
      </div>

      <div className="bg-white rounded-lg shadow p-6">
        <CustomerForm onSuccess={handleSuccess} onCancel={handleCancel} />
      </div>
    </div>
  );
}
