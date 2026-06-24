import React, { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useLedgerEntries } from '@/services/ledger.service';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { LedgerEntry, TransactionType, EntityType } from '@/types/ledger.types';
import { Search, Filter, ChevronRight } from 'lucide-react';
import { useDebounce } from '@/hooks/useDebounce';

export function BudgetLedgerPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const debouncedSearch = useDebounce(searchQuery, 300);

  const filters = useMemo(() => {
    const filter: any = {};
    if (debouncedSearch.trim()) {
      filter.search = debouncedSearch.trim();
    }
    return filter;
  }, [debouncedSearch]);

  const { data: entries, isLoading, error } = useLedgerEntries(filters);

  const formatCurrency = (amount: number, currency: string = 'TRY') => {
    return new Intl.NumberFormat('tr-TR', {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  };

  const formatDateTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString('tr-TR', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getScope = (entry: LedgerEntry): string => {
    if (entry.channel && entry.budgetEnvelope) {
      const period = entry.periodMonth || '';
      return `${entry.channel} > ${entry.budgetEnvelope.name} (${period})`;
    }
    return entry.channel || '-';
  };

  const getReference = (entry: LedgerEntry): string => {
    if (entry.agreement) {
      return `Inv: ${entry.agreement.agreementCode} (${entry.agreement.agreementName || entry.agreement.agreementCode}...)`;
    }
    if (entry.sourceType === 'PLAN') {
      return entry.description || entry.sourceId.substring(0, 20);
    }
    return entry.id.substring(0, 20);
  };

  const getEntityType = (entry: LedgerEntry): EntityType => {
    if (entry.agreement) return EntityType.INV;
    if (entry.sourceType === 'PLAN') return EntityType.PLAN;
    return EntityType.AGREEMENT;
  };

  const getTransactionType = (entry: LedgerEntry): TransactionType => {
    if (entry.entryDirection === 'DEBIT') {
      return TransactionType.CONSUME;
    }
    return TransactionType.RESERVE;
  };

  const getUserName = (entry: LedgerEntry): string => {
    if (entry.createdByUser) {
      const names = entry.createdByUser.fullName.split(' ');
      if (names.length >= 2) {
        return `${names[0][0]} ${names[names.length - 1]}`;
      }
      return entry.createdByUser.fullName;
    }
    return '-';
  };

  const filteredEntries = useMemo(() => {
    if (!entries) return [];
    if (!debouncedSearch.trim()) return entries;

    const searchLower = debouncedSearch.toLowerCase();
    return entries.filter((entry) => {
      const reference = getReference(entry).toLowerCase();
      const user = getUserName(entry).toLowerCase();
      const scope = getScope(entry).toLowerCase();
      return (
        reference.includes(searchLower) ||
        user.includes(searchLower) ||
        scope.includes(searchLower)
      );
    });
  }, [entries, debouncedSearch]);

  if (isLoading) return <LoadingSpinner />;
  if (error) {
    return (
      <div className="text-red-600 p-4">
        Defter kayıtları yüklenirken hata oluştu:{' '}
        {error instanceof Error ? error.message : 'Bilinmeyen hata'}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-gray-500">
        <Link to="/budget" className="hover:text-gray-700">
          Bütçe
        </Link>
        <ChevronRight className="h-4 w-4" />
        <span className="text-gray-700">Ledger (Read Only)</span>
      </div>

      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">Financial Ledger</h1>
        <p className="text-gray-500 mt-2">
          Bütçe hareketleri denetim kaydı (Read Only). Tüm rezervasyon ve
          harcamalar burada listelenir.
        </p>
      </div>

      {/* Search and Filters */}
      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            type="text"
            placeholder="Referans, Kullanıcı veya Kapsam ara..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <Button variant="outline" size="icon">
          <Filter className="h-4 w-4" />
        </Button>
        <div className="text-sm text-gray-500">
          {filteredEntries.length} Kayıt
        </div>
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="text-left p-3 text-xs font-medium text-gray-500 uppercase tracking-wider w-[180px]">
                    TARİH / SAAT
                  </th>
                  <th className="text-left p-3 text-xs font-medium text-gray-500 uppercase tracking-wider w-[250px]">
                    SCOPE (CHANNEL/CAT)
                  </th>
                  <th className="text-left p-3 text-xs font-medium text-gray-500 uppercase tracking-wider w-[120px]">
                    ENTITY TYPE
                  </th>
                  <th className="text-left p-3 text-xs font-medium text-gray-500 uppercase tracking-wider w-[300px]">
                    REFERANS
                  </th>
                  <th className="text-left p-3 text-xs font-medium text-gray-500 uppercase tracking-wider w-[150px]">
                    TRANSACTION
                  </th>
                  <th className="text-right p-3 text-xs font-medium text-gray-500 uppercase tracking-wider w-[150px]">
                    AMOUNT
                  </th>
                  <th className="text-left p-3 text-xs font-medium text-gray-500 uppercase tracking-wider w-[150px]">
                    USER
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filteredEntries.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="text-center py-8 text-gray-500">
                      Kayıt bulunamadı
                    </td>
                  </tr>
                ) : (
                  filteredEntries.map((entry) => (
                    <tr key={entry.id} className="hover:bg-gray-50">
                      <td className="p-3 font-mono text-sm">
                        {formatDateTime(entry.createdAt)}
                      </td>
                      <td className="p-3 text-sm">{getScope(entry)}</td>
                      <td className="p-3">
                        <Badge variant="outline" className="text-xs">
                          {getEntityType(entry)}
                        </Badge>
                      </td>
                      <td className="p-3 text-sm">{getReference(entry)}</td>
                      <td className="p-3">
                        <Badge
                          variant="outline"
                          className="bg-yellow-50 text-yellow-700 border-yellow-300"
                        >
                          {getTransactionType(entry)}
                        </Badge>
                      </td>
                      <td className="p-3 text-right font-medium text-red-600">
                        {formatCurrency(
                          -Math.abs(entry.amount),
                          entry.currency
                        )}
                      </td>
                      <td className="p-3 text-sm">{getUserName(entry)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
