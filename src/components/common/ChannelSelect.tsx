import React from 'react';
import { useChannels } from '@/hooks/useMasterData';
import { DynamicSelect } from './DynamicSelect';

interface ChannelSelectProps {
  value?: string;
  onChange: (value: string) => void;
  label?: string;
  placeholder?: string;
  disabled?: boolean;
  required?: boolean;
  error?: string;
  activeOnly?: boolean;
}

export function ChannelSelect({
  value,
  onChange,
  label = 'Kanal',
  placeholder = 'Kanal seçiniz',
  disabled = false,
  required = false,
  error,
  activeOnly = true,
}: ChannelSelectProps) {
  const { data: channels = [], isLoading } = useChannels(activeOnly);

  return (
    <DynamicSelect
      label={label}
      value={value}
      onChange={onChange}
      options={channels.map((channel) => ({
        id: channel.id,
        code: channel.code,
        name: channel.name,
      }))}
      placeholder={isLoading ? 'Yükleniyor...' : placeholder}
      disabled={disabled || isLoading}
      required={required}
      error={error}
      id="channel-select"
    />
  );
}
