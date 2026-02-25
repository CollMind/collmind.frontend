import { useMemo } from 'react';
import { DynamicSelect } from './DynamicSelect';
import { useGenericUnits } from '@/hooks/useMasterData';

interface GenericUnitSelectProps {
  value?: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  required?: boolean;
  error?: string;
  id?: string;
  label?: string;
  categoryId?: string;
  brandId?: string;
}

export function GenericUnitSelect({
  value,
  onChange,
  placeholder = 'Generic Unit seçiniz',
  disabled = false,
  required = false,
  error,
  id,
  label,
  categoryId,
  brandId,
}: GenericUnitSelectProps) {
  const { data: genericUnits = [], isLoading } = useGenericUnits(true);

  // Filter by category and brand if provided
  const filteredUnits = useMemo(() => {
    let filtered = genericUnits;
    if (categoryId) {
      filtered = filtered.filter((gu: any) => gu.categoryId === categoryId);
    }
    if (brandId) {
      filtered = filtered.filter((gu: any) => gu.brandId === brandId);
    }
    return filtered;
  }, [genericUnits, categoryId, brandId]);

  return (
    <DynamicSelect
      label={label}
      value={value}
      onChange={onChange}
      options={filteredUnits}
      placeholder={isLoading ? 'Yükleniyor...' : placeholder}
      disabled={disabled || isLoading}
      required={!!required}
      error={error}
      id={id}
    />
  );
}
