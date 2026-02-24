import React from 'react';
import { useCpls } from '@/hooks/useMasterData';
import { DynamicSelect } from './DynamicSelect';

interface CplSelectProps {
  value?: string;
  onChange: (value: string) => void;
  label?: string;
  placeholder?: string;
  disabled?: boolean;
  required?: boolean;
  error?: string;
  activeOnly?: boolean;
  channelId?: string;
}

export function CplSelect({
  value,
  onChange,
  label = 'CPL',
  placeholder = 'CPL seçiniz',
  disabled = false,
  required = false,
  error,
  activeOnly = true,
  channelId,
}: CplSelectProps) {
  const { data: cpls = [], isLoading } = useCpls(activeOnly, channelId);

  return (
    <DynamicSelect
      label={label}
      value={value}
      onChange={onChange}
      options={cpls.map((cpl) => ({
        id: cpl.id,
        code: cpl.code,
        name: cpl.name,
      }))}
      placeholder={isLoading ? 'Yükleniyor...' : placeholder}
      disabled={disabled || isLoading}
      required={required}
      error={error}
      id="cpl-select"
    />
  );
}
