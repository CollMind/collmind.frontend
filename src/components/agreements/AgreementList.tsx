import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Agreement,
  AgreementStatus,
  AgreementType,
} from '@/types/agreement.types';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { AgreementStatusBadge } from './AgreementStatusBadge';
import { Search, Eye, Calendar, ChevronLeft, ChevronRight } from 'lucide-react';
import { toNumber } from '@/utils/numberUtils';

interface AgreementListProps {
  agreements: Agreement[];
  isLoading?: boolean;
}

const formatCurrency = (amount: number, currency: string = 'TRY') => {
  return new Intl.NumberFormat('tr-TR', {
    style: 'currency',
    currency: currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
};

const formatDateRange = (startDate: string, endDate: string): string => {
  const start = new Date(startDate);
  const end = new Date(endDate);
  return `${start.toLocaleDateString('tr-TR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })} - ${end.toLocaleDateString('tr-TR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })}`;
};

export function AgreementList({
  agreements,
  isLoading,
}: AgreementListProps) {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [onlyMine, setOnlyMine] = useState(false);
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [channelFilter, setChannelFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [selectedAgreements, setSelectedAgreements] = useState<Set<string>>(new Set());
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // Filtreleme
  const filteredAgreements = useMemo(() => {
    return agreements.filter((agreement) => {
      const matchesSearch =
        searchTerm === '' ||
        agreement.agreementNumber?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        agreement.agreementName?.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesType = typeFilter === 'all' || agreement.agreementType === typeFilter;
      const matchesChannel =
        channelFilter === 'all' || agreement.channelId === channelFilter || agreement.channelName === channelFilter;
      const matchesStatus = statusFilter === 'all' || agreement.status === statusFilter;
      const matchesCategory =
        categoryFilter === 'all' || agreement.category === categoryFilter;

      return matchesSearch && matchesType && matchesChannel && matchesStatus && matchesCategory;
    });
  }, [agreements, searchTerm, typeFilter, channelFilter, statusFilter, categoryFilter]);

  // Pagination
  const totalPages = Math.ceil(filteredAgreements.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedAgreements = filteredAgreements.slice(startIndex, endIndex);

  // Benzersiz değerler
  const uniqueChannels = useMemo(() => {
    const channels = new Set(agreements.map((a) => a.channelName || a.channelId).filter(Boolean));
    return Array.from(channels).sort();
  }, [agreements]);

  const uniqueCategories = useMemo(() => {
    const categories = new Set(agreements.map((a) => a.category).filter(Boolean));
    return Array.from(categories).sort();
  }, [agreements]);

  const handleResetFilters = () => {
    setSearchTerm('');
    setOnlyMine(false);
    setTypeFilter('all');
    setChannelFilter('all');
    setStatusFilter('all');
    setCategoryFilter('all');
    setCurrentPage(1);
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedAgreements(new Set(paginatedAgreements.map((a) => a.id)));
    } else {
      setSelectedAgreements(new Set());
    }
  };

  const handleSelectAgreement = (id: string, checked: boolean) => {
    const newSelected = new Set(selectedAgreements);
    if (checked) {
      newSelected.add(id);
    } else {
      newSelected.delete(id);
    }
    setSelectedAgreements(newSelected);
  };

  const getUsagePercentage = (agreement: Agreement): number => {
    const capAmount = toNumber(agreement.capTotalAmount);
    if (!capAmount || capAmount === 0) return 0;
    const consumed = agreement.consumedAmount || 0;
    return (consumed / capAmount) * 100;
  };

  const getProgressColor = (percentage: number): string => {
    if (percentage >= 95) return 'bg-red-500';
    if (percentage >= 80) return 'bg-yellow-500';
    if (percentage > 0) return 'bg-yellow-400';
    return 'bg-gray-200';
  };

  if (isLoading) {
    return <div className="text-center py-8">Yükleniyor...</div>;
  }

  return (
    <div className="space-y-4">
      {/* Filtreleme */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-wrap items-center gap-4">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Q Anlaşma ID veya adı ara..."
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setCurrentPage(1);
                }}
                className="pl-10"
              />
            </div>
            <div className="flex items-center gap-2">
              <Checkbox
                id="onlyMine"
                checked={onlyMine}
                onCheckedChange={(checked) => {
                  setOnlyMine(checked as boolean);
                  setCurrentPage(1);
                }}
              />
              <label htmlFor="onlyMine" className="text-sm cursor-pointer">
                Sadece Benim
              </label>
            </div>
            <Select value={typeFilter} onValueChange={(value) => {
              setTypeFilter(value);
              setCurrentPage(1);
            }}>
              <SelectTrigger className="w-[100px]">
                <SelectValue placeholder="Tip" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tip: Tümü</SelectItem>
                <SelectItem value={AgreementType.STA}>STA</SelectItem>
                <SelectItem value={AgreementType.LTA}>LTA</SelectItem>
              </SelectContent>
            </Select>
            <Select value={channelFilter} onValueChange={(value) => {
              setChannelFilter(value);
              setCurrentPage(1);
            }}>
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="Kanal" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Kanal: Tümü</SelectItem>
                {uniqueChannels.map((channel) => (
                  <SelectItem key={channel} value={channel}>
                    {channel}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={(value) => {
              setStatusFilter(value);
              setCurrentPage(1);
            }}>
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="Durum" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Durum: Tümü</SelectItem>
                {Object.values(AgreementStatus).map((status) => (
                  <SelectItem key={status} value={status}>
                    {status}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={categoryFilter} onValueChange={(value) => {
              setCategoryFilter(value);
              setCurrentPage(1);
            }}>
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="Kategori" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Kategori: Tümü</SelectItem>
                {uniqueCategories.map((category) => (
                  <SelectItem key={category || ''} value={category || ''}>
                    {category}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button variant="ghost" onClick={handleResetFilters} className="text-sm text-blue-600 hover:text-blue-700">
              Filtreleri Sıfırla
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Tablo */}
      <Card>
        <CardContent className="p-0">
          {filteredAgreements.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              Anlaşma bulunamadı.
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="text-left p-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                        <Checkbox
                          checked={paginatedAgreements.length > 0 && paginatedAgreements.every((a) => selectedAgreements.has(a.id))}
                          onCheckedChange={handleSelectAll}
                        />
                      </th>
                      <th className="text-left p-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                        ID
                      </th>
                      <th className="text-left p-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Anlaşma Adı
                      </th>
                      <th className="text-left p-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                        CPL
                      </th>
                      <th className="text-left p-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Tip
                      </th>
                      <th className="text-left p-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Durum
                      </th>
                      <th className="text-left p-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Cap / Kullanım
                      </th>
                      <th className="text-left p-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Dönem
                      </th>
                      <th className="text-center p-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Aksiyon
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {paginatedAgreements.map((agreement) => {
                      const usagePercent = getUsagePercentage(agreement);
                      return (
                        <tr
                          key={agreement.id}
                          className="hover:bg-gray-50"
                        >
                          <td className="p-3">
                            <Checkbox
                              checked={selectedAgreements.has(agreement.id)}
                              onCheckedChange={(checked) =>
                                handleSelectAgreement(agreement.id, checked as boolean)
                              }
                            />
                          </td>
                          <td className="p-3 font-medium text-sm">
                            {agreement.agreementNumber}
                          </td>
                          <td className="p-3">
                            <div className="text-sm font-medium text-gray-900">
                              {agreement.agreementName || '-'}
                            </div>
                            {agreement.channelName && agreement.category && (
                              <div className="text-xs text-gray-500">
                                {agreement.channelName} • {agreement.category}
                              </div>
                            )}
                          </td>
                          <td className="p-3 text-sm text-gray-500">
                            {agreement.cplName || agreement.customerName || '-'}
                          </td>
                          <td className="p-3 text-sm text-gray-500">
                            {agreement.agreementType}
                          </td>
                          <td className="p-3">
                            <AgreementStatusBadge status={agreement.status} />
                          </td>
                          <td className="p-3">
                            <div className="space-y-1">
                              <div className="text-sm text-gray-900">
                                {formatCurrency(agreement.consumedAmount || 0, agreement.currency)} /{' '}
                                {formatCurrency(toNumber(agreement.capTotalAmount), agreement.currency)}
                              </div>
                              {toNumber(agreement.capTotalAmount) > 0 && (
                                <div className="relative h-2 w-full overflow-hidden rounded-full bg-gray-200">
                                  <div
                                    className={`h-full transition-all duration-300 ${getProgressColor(usagePercent)}`}
                                    style={{ width: `${Math.min(usagePercent, 100)}%` }}
                                  />
                                </div>
                              )}
                            </div>
                          </td>
                          <td className="p-3 text-sm text-gray-500">
                            <div className="flex items-center gap-1">
                              <Calendar className="h-3 w-3" />
                              {formatDateRange(agreement.startDate, agreement.endDate)}
                            </div>
                          </td>
                          <td className="p-3 text-center">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => navigate(`/agreements/${agreement.id}`)}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between px-6 py-4 border-t">
                  <div className="text-sm text-gray-500">
                    Toplam {filteredAgreements.length} kayıttan {startIndex + 1}-{Math.min(endIndex, filteredAgreements.length)} arası gösteriliyor
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
                      disabled={currentPage === 1}
                    >
                      <ChevronLeft className="h-4 w-4 mr-1" />
                      Önceki
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
                      disabled={currentPage === totalPages}
                    >
                      Sonraki
                      <ChevronRight className="h-4 w-4 ml-1" />
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
