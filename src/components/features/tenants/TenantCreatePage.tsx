import { useNavigate } from 'react-router-dom';
import { TenantForm } from '@/components/forms/TenantForm';
import { useToast } from '@/hooks/useToast';

export function TenantCreatePage() {
  const navigate = useNavigate();
  const toast = useToast();

  const handleSuccess = () => {
    toast.success('Kiracı başarıyla oluşturuldu');
    navigate('/tenants');
  };

  const handleCancel = () => {
    navigate('/tenants');
  };

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Yeni Kiracı Oluştur</h1>
        <p className="text-gray-600 mt-2">Sisteme yeni bir kiracı ekleyin</p>
      </div>

      <div className="bg-white rounded-lg shadow p-6">
        <TenantForm onSuccess={handleSuccess} onCancel={handleCancel} />
      </div>
    </div>
  );
}
