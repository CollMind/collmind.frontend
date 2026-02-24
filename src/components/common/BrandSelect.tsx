import { DynamicSelect } from './DynamicSelect';
import { useBrands } from '@/hooks/useMasterData';

interface BrandSelectProps {
  value?: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  required?: boolean;
  error?: string;
  id?: string;
  label?: string;
}

export function BrandSelect({
  value,
  onChange,
  placeholder = 'Marka seçiniz',
  disabled = false,
  required = false,
  error,
  id,
  label,
}: BrandSelectProps) {
  const { data: brands = [], isLoading } = useBrands(true);

  return (
    <DynamicSelect
      label={label}
      value={value}
      onChange={onChange}
      options={brands}
      placeholder={isLoading ? 'Yükleniyor...' : placeholder}
      disabled={disabled || isLoading}
      required={required}
      error={error}
      id={id}
    />
  );
}
