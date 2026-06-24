import React from 'react';
import { useForecastingUnits } from '@/hooks/useMasterData';
import { DynamicSelect } from './DynamicSelect';

interface FuSelectProps {
  value?: string;
  onChange: (value: string) => void;
  label?: string;
  placeholder?: string;
  disabled?: boolean;
  required?: boolean;
  error?: string;
  activeOnly?: boolean;
  guId?: string;
  categoryId?: string;
}

export function FuSelect({
  value,
  onChange,
  label = 'Forecasting Unit',
  placeholder = 'FU seçiniz',
  disabled = false,
  required = false,
  error,
  activeOnly = true,
  guId,
  categoryId,
}: FuSelectProps) {
  const { data: fus = [], isLoading } = useForecastingUnits(
    activeOnly,
    guId,
    categoryId
  );

  return (
    <DynamicSelect
      label={label}
      value={value}
      onChange={onChange}
      options={fus.map((fu: any) => ({
        id: fu.id,
        code: fu.code,
        name: fu.name,
      }))}
      placeholder={isLoading ? 'Yükleniyor...' : placeholder}
      disabled={disabled || isLoading}
      required={required}
      error={error}
      id="fu-select"
    />
  );
}
