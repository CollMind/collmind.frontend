import { MasterDataManagementPage } from '@/components/common/MasterDataManagementPage';
import { tacticEndpoints } from '@/api/endpoints/master-data.endpoints';

export function TacticManagementPage() {
  return (
    <MasterDataManagementPage
      title="Taktik Yönetimi"
      description="Sistem taktiklerini görüntüleyin, oluşturun ve yönetin"
      entityName="Taktik"
      endpoints={tacticEndpoints}
      fields={[
        { key: 'code', label: 'Kod', type: 'text', required: true },
        { key: 'name', label: 'İsim', type: 'text', required: true },
        { key: 'description', label: 'Açıklama', type: 'textarea' },
        {
          key: 'tacticType',
          label: 'Taktik Tipi',
          type: 'select',
          required: true,
          options: [
            { value: 'DISCOUNT', label: 'İndirim' },
            { value: 'LUMP_SUM', label: 'Toplu Ödeme' },
            { value: 'VOLUME_REBATE', label: 'Hacim İndirimi' },
            { value: 'CO_OP', label: 'Co-op' },
            { value: 'LISTING_FEE', label: 'Listeleme Ücreti' },
            { value: 'OTHER', label: 'Diğer' },
          ],
        },
        {
          key: 'spendType',
          label: 'Harcama Tipi',
          type: 'select',
          options: [
            { value: 'ON_INVOICE', label: 'On-Invoice' },
            { value: 'OFF_INVOICE', label: 'Off-Invoice' },
            { value: 'BOTH', label: 'Her İkisi' },
          ],
        },
        { key: 'isActive', label: 'Aktif', type: 'checkbox' },
      ]}
      getDisplayValue={(item) => `${item.code} - ${item.name}`}
      queryKey={['tactics']}
    />
  );
}
