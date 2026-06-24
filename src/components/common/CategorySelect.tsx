import React from 'react';
import { useCategories } from '@/hooks/useMasterData';
import { DynamicSelect } from './DynamicSelect';

interface CategorySelectProps {
  value?: string;
  onChange: (value: string) => void;
  label?: string;
  placeholder?: string;
  disabled?: boolean;
  required?: boolean;
  error?: string;
  activeOnly?: boolean;
  id?: string;
}

export function CategorySelect({
  value,
  onChange,
  label,
  placeholder = 'Kategori seçiniz',
  disabled = false,
  required = false,
  error,
  activeOnly = true,
  id,
}: CategorySelectProps) {
  const { data: categories = [], isLoading } = useCategories(activeOnly);

  return (
    <DynamicSelect
      label={label}
      value={value}
      onChange={onChange}
      options={categories.map(
        (category: { id: string; code: string; name: string }) => ({
          id: category.id,
          code: category.code,
          name: category.name,
        })
      )}
      placeholder={isLoading ? 'Yükleniyor...' : placeholder}
      disabled={disabled || isLoading}
      required={required}
      error={error}
      id={id || 'category-select'}
    />
  );
}
