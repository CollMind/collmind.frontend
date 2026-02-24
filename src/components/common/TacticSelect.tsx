import { DynamicSelect } from './DynamicSelect';
import { useTactics } from '@/hooks/useMasterData';

interface TacticSelectProps {
  value?: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  required?: boolean;
  error?: string;
  id?: string;
  label?: string;
}

export function TacticSelect({
  value,
  onChange,
  placeholder = 'Taktik seçiniz',
  disabled = false,
  required = false,
  error,
  id,
  label = 'Taktik',
}: TacticSelectProps) {
  const { data: tactics = [], isLoading } = useTactics(true);

  return (
    <DynamicSelect
      label={label}
      value={value}
      onChange={onChange}
      options={tactics}
      placeholder={isLoading ? 'Yükleniyor...' : placeholder}
      disabled={disabled || isLoading}
      required={required}
      error={error}
      id={id}
    />
  );
}
