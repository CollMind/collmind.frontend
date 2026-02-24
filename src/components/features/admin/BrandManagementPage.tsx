import { MasterDataManagementPage } from '@/components/common/MasterDataManagementPage';
import { brandEndpoints } from '@/api/endpoints/master-data.endpoints';

export function BrandManagementPage() {
  return (
    <MasterDataManagementPage
      title="Marka Yönetimi"
      description="Sistem markalarını görüntüleyin, oluşturun ve yönetin"
      entityName="Marka"
      endpoints={brandEndpoints}
      fields={[
        { key: 'code', label: 'Kod', type: 'text', required: true },
        { key: 'name', label: 'İsim', type: 'text', required: true },
        { key: 'description', label: 'Açıklama', type: 'textarea' },
        { key: 'isActive', label: 'Aktif', type: 'checkbox' },
      ]}
      getDisplayValue={(item) => `${item.code} - ${item.name}`}
      queryKey={['brands', false]}
    />
  );
}
