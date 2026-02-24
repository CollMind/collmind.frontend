import { DynamicSelect } from './DynamicSelect';
import { useMechanics } from '@/hooks/useMasterData';

interface MechanicSelectProps {
  value?: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  required?: boolean;
  error?: string;
  id?: string;
  label?: string;
  tacticId?: string;
}

export function MechanicSelect({
  value,
  onChange,
  placeholder = 'Mekanik seçiniz',
  disabled = false,
  required = false,
  error,
  id,
  label = 'Mekanik',
  tacticId,
}: MechanicSelectProps) {
  const { data: mechanics = [], isLoading } = useMechanics(true, tacticId);

  return (
    <DynamicSelect
      label={label}
      value={value}
      onChange={onChange}
      options={mechanics}
      placeholder={isLoading ? 'Yükleniyor...' : placeholder}
      disabled={disabled || isLoading}
      required={required}
      error={error}
      id={id}
    />
  );
}
