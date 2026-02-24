import React from 'react';
import { AgreementStatus } from '@/types/agreement.types';
import { EnumBadge } from '@/components/common/EnumBadge';

interface AgreementStatusBadgeProps {
  status: AgreementStatus;
  className?: string;
}

const getStatusLabel = (status: AgreementStatus): string => {
  const labels: Record<AgreementStatus, string> = {
    DRAFT: 'Taslak',
    PENDING: 'Beklemede',
    APPROVED: 'Onaylandı',
    ACTIVE: 'Aktif',
    REJECTED: 'Reddedildi',
    CANCELLED: 'İptal Edildi',
  };
  return labels[status] || status;
};

export function AgreementStatusBadge({
  status,
  className,
}: AgreementStatusBadgeProps) {
  return <EnumBadge value={status} type="status" className={className} />;
}
