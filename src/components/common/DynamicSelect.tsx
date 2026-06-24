import React from 'react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';

interface DynamicSelectProps {
  label?: string;
  value?: string;
  onChange: (value: string) => void;
  options: Array<{
    id: string;
    code?: string;
    name: string;
    [key: string]: any;
  }>;
  placeholder?: string;
  disabled?: boolean;
  required?: boolean;
  error?: string;
  id?: string;
}

export function DynamicSelect({
  label,
  value,
  onChange,
  options,
  placeholder = 'Seçiniz',
  disabled = false,
  required = false,
  error,
  id,
}: DynamicSelectProps) {
  return (
    <div>
      {label && (
        <Label htmlFor={id}>
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </Label>
      )}
      <Select value={value} onValueChange={onChange} disabled={disabled}>
        <SelectTrigger id={id}>
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent>
          {options.map((option) => (
            <SelectItem key={option.id} value={option.id}>
              {option.name} {option.code && `(${option.code})`}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {error && <p className="text-xs text-red-600 mt-1">{error}</p>}
    </div>
  );
}
