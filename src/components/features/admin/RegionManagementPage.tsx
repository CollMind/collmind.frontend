import { MasterDataManagementPage } from '@/components/common/MasterDataManagementPage';
import { regionEndpoints } from '@/api/endpoints/master-data.endpoints';

export function RegionManagementPage() {
  return (
    <MasterDataManagementPage
      title="Bölge Yönetimi"
      description="Sistem bölgelerini görüntüleyin, oluşturun ve yönetin"
      entityName="Bölge"
      endpoints={regionEndpoints}
      fields={[
        { key: 'code', label: 'Kod', type: 'text', required: true },
        { key: 'name', label: 'İsim', type: 'text', required: true },
        { key: 'description', label: 'Açıklama', type: 'textarea' },
        { key: 'isActive', label: 'Aktif', type: 'checkbox' },
      ]}
      getDisplayValue={(item) => `${item.code} - ${item.name}`}
      queryKey={['regions']}
    />
  );
}
