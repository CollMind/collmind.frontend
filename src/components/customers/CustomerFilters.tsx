import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Card } from '@/components/ui/card';
import { X, Filter } from 'lucide-react';
import {
  CustomerChannel,
  CustomerStatus,
  CustomerFilterDto,
} from '@/types/customer.types';
import { EnumBadge } from '@/components/common/EnumBadge';

interface CustomerFiltersProps {
  filters: CustomerFilterDto;
  onFiltersChange: (filters: CustomerFilterDto) => void;
  onClear: () => void;
}

export function CustomerFilters({
  filters,
  onFiltersChange,
  onClear,
}: CustomerFiltersProps) {
  const [isOpen, setIsOpen] = useState(false);

  const handleFilterChange = (key: keyof CustomerFilterDto, value: any) => {
    onFiltersChange({
      ...filters,
      [key]: value || undefined,
    });
  };

  const hasActiveFilters = Boolean(
    filters.channel ||
    filters.status ||
    filters.city ||
    filters.isVip !== undefined ||
    filters.search
  );

  return (
    <Card className="p-4">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Filter className="h-5 w-5 text-gray-500" />
          <h3 className="font-semibold">Filtreler</h3>
          {hasActiveFilters && (
            <span className="px-2 py-1 text-xs bg-blue-100 text-blue-700 rounded-full">
              Aktif
            </span>
          )}
        </div>
        <div className="flex gap-2">
          {hasActiveFilters && (
            <Button variant="ghost" size="sm" onClick={onClear}>
              <X className="h-4 w-4 mr-1" />
              Temizle
            </Button>
          )}
          <Button variant="ghost" size="sm" onClick={() => setIsOpen(!isOpen)}>
            {isOpen ? 'Gizle' : 'Göster'}
          </Button>
        </div>
      </div>

      {isOpen && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Arama */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Arama
            </label>
            <Input
              placeholder="Ad, kod, email..."
              value={filters.search || ''}
              onChange={(e) => handleFilterChange('search', e.target.value)}
            />
          </div>

          {/* Kanal */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Kanal
            </label>
            <Select
              value={filters.channel || 'all'}
              onValueChange={(value) =>
                handleFilterChange(
                  'channel',
                  value === 'all' ? undefined : value
                )
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Tümü" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tümü</SelectItem>
                {Object.values(CustomerChannel).map((channel) => (
                  <SelectItem key={channel} value={channel}>
                    <EnumBadge value={channel} type="channel" />
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Durum */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Durum
            </label>
            <Select
              value={filters.status || 'all'}
              onValueChange={(value) =>
                handleFilterChange(
                  'status',
                  value === 'all' ? undefined : value
                )
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Tümü" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tümü</SelectItem>
                {Object.values(CustomerStatus).map((status) => (
                  <SelectItem key={status} value={status}>
                    <EnumBadge value={status} type="status" />
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Şehir */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Şehir
            </label>
            <Input
              placeholder="Şehir adı..."
              value={filters.city || ''}
              onChange={(e) => handleFilterChange('city', e.target.value)}
            />
          </div>

          {/* VIP */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              VIP Müşteri
            </label>
            <Select
              value={
                filters.isVip === undefined
                  ? 'all'
                  : filters.isVip
                    ? 'true'
                    : 'false'
              }
              onValueChange={(value) =>
                handleFilterChange(
                  'isVip',
                  value === 'all' ? undefined : value === 'true'
                )
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Tümü" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tümü</SelectItem>
                <SelectItem value="true">Evet</SelectItem>
                <SelectItem value="false">Hayır</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      )}
    </Card>
  );
}
