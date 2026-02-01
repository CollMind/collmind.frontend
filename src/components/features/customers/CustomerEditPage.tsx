import { useParams, useNavigate } from 'react-router-dom';
import { CustomerForm } from '@/components/forms/CustomerForm';
import { Button } from '@/components/ui/button';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import { EmptyState } from '@/components/common/EmptyState';
import { useCustomer } from '@/services/customers.service';
import { ArrowLeft } from 'lucide-react';

export function CustomerEditPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: customer, isLoading, error } = useCustomer(id || '');

  const handleSuccess = () => {
    navigate(`/customers/${id}`);
  };

  const handleCancel = () => {
    navigate(`/customers/${id}`);
  };

  if (isLoading) return <LoadingSpinner />;
  if (error || !customer) {
    return (
      <div className="space-y-4">
        <Button variant="ghost" onClick={() => navigate('/customers')}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Geri Dön
        </Button>
        <EmptyState message="Müşteri bulunamadı" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" onClick={() => navigate(`/customers/${id}`)}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Geri Dön
        </Button>
        <h1 className="text-3xl font-bold">Müşteri Düzenle</h1>
      </div>

      <div className="bg-white rounded-lg shadow p-6">
        <CustomerForm
          customer={customer}
          onSuccess={handleSuccess}
          onCancel={handleCancel}
        />
      </div>
    </div>
  );
}
