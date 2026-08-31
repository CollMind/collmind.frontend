import { toNumberOrZero } from '@/utils/numberUtils';
import {
  BUDGET_UTILIZATION_NOT_EVALUABLE_LABEL,
  BudgetUtilizationStatus,
  describeBudgetUtilizationGap,
  evaluateBudgetUtilization,
  usedFromAvailable,
} from '@/utils/budgetUtilization';
import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { BudgetEnvelope, BudgetEnvelopeStatus } from '@/types/budget.types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Search, Eye, Download } from 'lucide-react';
import { CustomerChannel } from '@/types/customer.types';
import { BudgetCategory } from '@/types/budget.types';

interface BudgetEnvelopeListProps {
  envelopes: BudgetEnvelope[];
  isLoading?: boolean;
}

// ⛔ YEREL RAG MERDİVENİ KALDIRILDI (2026-08-31). Eşikler (`<80`/`<95`) ve
// `allocated > 0 ? … : 0` sessiz sıfırı artık `utils/budgetUtilization.ts`'te,
// TEK YERDE — backend `budget-threshold.service.ts#toStatus`'un aynası.
// Bu dosyada bir daha eşik SAYISI yazılmaz (`CLAUDE.md §2.3`).
const RAG_DOT_COLOR: Record<BudgetUtilizationStatus, string> = {
  GREEN: 'bg-green-500',
  AMBER: 'bg-yellow-500',
  RED: 'bg-red-500',
};

const RAG_LABEL: Record<BudgetUtilizationStatus, string> = {
  GREEN: 'İyi',
  AMBER: 'Uyarı',
  RED: 'Kritik',
};

const RAG_TEXT_COLOR: Record<BudgetUtilizationStatus, string> = {
  GREEN: 'text-green-600',
  AMBER: 'text-yellow-600',
  RED: 'text-red-600',
};

const RAG_BAR_COLOR: Record<BudgetUtilizationStatus, string> = {
  GREEN: 'bg-green-200',
  AMBER: 'bg-yellow-200',
  RED: 'bg-red-200',
};

const formatCurrency = (amount: number, currency: string = 'TRY') => {
  return new Intl.NumberFormat('tr-TR', {
    style: 'currency',
    currency: currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
};

export function BudgetEnvelopeList({
  envelopes,
  isLoading,
}: BudgetEnvelopeListProps) {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [periodFilter, setPeriodFilter] = useState<string>('all');
  const [channelFilter, setChannelFilter] = useState<string>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [ragFilter, setRagFilter] = useState<string>('all');

  // T-106: one parser, shared with every other reader. This was a local copy
  // of `replace(/,/g,'') + parseFloat` — the pair that truncates "1.234.567,89"
  // to 1.234 instead of failing. `toNumberOrZero` names the zero it falls back to.
  const safeNumber = toNumberOrZero;

  // Özet hesaplamaları - Backend'den gelen decimal değerleri güvenli şekilde number'a dönüştür
  const summary = useMemo(() => {
    const totalAllocated = envelopes.reduce(
      (sum, env) => sum + safeNumber(env.allocatedAmount),
      0
    );
    const totalConsumed = envelopes.reduce(
      (sum, env) => sum + safeNumber(env.consumedAmount),
      0
    );
    // ⛔ `totalAvailable` ARTIK TÜRETİLMİYOR, KANONİK ALANDAN TOPLANIYOR.
    // Eskisi `totalAllocated − totalReserved − totalConsumed` idi ve
    // `totalReserved` HER ZAMAN 0 olduğu için (aşağı) rezervasyonları
    // görmezden geliyordu. `availableAmount` `v_budget_summary`'den geliyor
    // (`budget.service.ts#findAllEnvelopes`) — ledger türevli ve canlı.
    const totalAvailable = envelopes.reduce(
      (sum, env) => sum + safeNumber(env.availableAmount),
      0
    );
    // ⛔ `totalReserved` KALDIRILDI, ve bu bir eksiklik değil bir ÖLÇÜM:
    // `budget_envelopes` tablosunda `reserved_amount` KOLONU YOK
    // (`budget-envelope.entity.ts`, ölçüldü 2026-08-31), yani
    // `GET /budget/envelopes` yanıtında `reservedAmount` alanı HİÇ GELMİYOR.
    // `safeNumber(undefined) === 0` bunu sessizce "₺0 rezerve" diye
    // ekrana basıyordu — canlı bir finansal ekranda UYDURULMUŞ bir sayı.
    // Zarf başına rezerve tutarı `GET /budget/envelopes/:id/reserved`
    // veriyor (tek zarf), toplu listede karşılığı YOK. Alan backend'de
    // doğduğu gün kart da geri gelir (iki-repo kalemi).
    const percentOf = (part: number): number | null =>
      totalAllocated > 0 ? (part / totalAllocated) * 100 : null;

    return {
      totalAllocated,
      totalConsumed,
      totalAvailable,
      consumedPercentage: percentOf(totalConsumed),
      availablePercentage: percentOf(totalAvailable),
    };
  }, [envelopes]);

  // Filtreleme
  const filteredEnvelopes = useMemo(() => {
    return envelopes.filter((envelope) => {
      // Arama
      const matchesSearch =
        searchTerm === '' ||
        envelope.code?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        envelope.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        envelope.channel?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        envelope.category?.toLowerCase().includes(searchTerm.toLowerCase());

      // Dönem
      const matchesPeriod =
        periodFilter === 'all' || envelope.period === periodFilter;

      // Kanal
      const matchesChannel =
        channelFilter === 'all' || envelope.channel === channelFilter;

      // Kategori
      const matchesCategory =
        categoryFilter === 'all' || envelope.category === categoryFilter;

      // RAG — ⛔ tek karar noktası (`utils/budgetUtilization.ts`).
      // Eskiden okunamayan tahsis `%0` ⇒ `good` sayılıyordu, yani bir ÖLÇÜM
      // YOKLUĞU "İyi" filtresine DÜŞÜYORDU. Artık ayrı bir kova var
      // (`not-evaluable`); hiçbir renk kovası onu sessizce yutmaz.
      let matchesRAG = true;
      if (ragFilter !== 'all') {
        const evaluation = evaluateBudgetUtilization(
          envelope.allocatedAmount,
          usedFromAvailable(envelope.allocatedAmount, envelope.availableAmount)
        );
        matchesRAG =
          evaluation.kind === 'EVALUATED'
            ? ragFilter === evaluation.status
            : ragFilter === 'not-evaluable';
      }

      return (
        matchesSearch &&
        matchesPeriod &&
        matchesChannel &&
        matchesCategory &&
        matchesRAG
      );
    });
  }, [
    envelopes,
    searchTerm,
    periodFilter,
    channelFilter,
    categoryFilter,
    ragFilter,
  ]);

  // Benzersiz değerler
  const uniquePeriods = useMemo(() => {
    const periods = new Set(envelopes.map((e) => e.period).filter(Boolean));
    return Array.from(periods).sort();
  }, [envelopes]);

  const uniqueChannels = useMemo(() => {
    const channels = new Set(envelopes.map((e) => e.channel).filter(Boolean));
    return Array.from(channels).sort();
  }, [envelopes]);

  const uniqueCategories = useMemo(() => {
    const categories = new Set(
      envelopes.map((e) => e.category).filter(Boolean)
    );
    return Array.from(categories).sort();
  }, [envelopes]);

  if (isLoading) {
    return <div className="text-center py-8">Yükleniyor...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Özet Kartları */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-600">
              TOPLAM TAHSİS
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">
              {formatCurrency(summary.totalAllocated)}
            </p>
          </CardContent>
        </Card>

        {/* ⛔ "RESERVED" KARTI KALDIRILDI (2026-08-31) — değeri her zaman
            ₺0 / %0.0 idi, çünkü `GET /budget/envelopes` `reservedAmount`
            alanını HİÇ döndürmüyor (kolon yok). Gerekçe ve iki-repo kalemi
            için yukarıdaki `summary` bloğunun yorumuna bak. */}

        <Card className="bg-blue-50 border-blue-200">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-700">
              CONSUMED
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-blue-700">
              {formatCurrency(summary.totalConsumed)}
            </p>
            <p className="text-xs text-gray-600 mt-1">
              {summary.consumedPercentage === null
                ? BUDGET_UTILIZATION_NOT_EVALUABLE_LABEL
                : `%${summary.consumedPercentage.toFixed(1)}`}
            </p>
          </CardContent>
        </Card>

        <Card className="bg-green-50 border-green-200">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-700">
              AVAILABLE
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-green-700">
              {formatCurrency(summary.totalAvailable)}
            </p>
            <p className="text-xs text-gray-600 mt-1">
              {summary.availablePercentage === null
                ? BUDGET_UTILIZATION_NOT_EVALUABLE_LABEL
                : `%${summary.availablePercentage.toFixed(1)}`}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Filtreleme */}
      <Card>
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Kanal veya Kategori ara..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={periodFilter} onValueChange={setPeriodFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Dönem: Tümü" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Dönem: Tümü</SelectItem>
                {uniquePeriods.map((period) => (
                  <SelectItem key={period} value={period}>
                    {period}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={channelFilter} onValueChange={setChannelFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Kanal: Tümü" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Kanal: Tümü</SelectItem>
                {uniqueChannels.map((channel) => (
                  <SelectItem key={channel || ''} value={channel || ''}>
                    {channel}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Kategori: Tümü" />
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
            <Select value={ragFilter} onValueChange={setRagFilter}>
              <SelectTrigger>
                <SelectValue placeholder="RAG: Tümü" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">RAG: Tümü</SelectItem>
                <SelectItem value="GREEN">İyi</SelectItem>
                <SelectItem value="AMBER">Uyarı</SelectItem>
                <SelectItem value="RED">Kritik</SelectItem>
                <SelectItem value="not-evaluable">
                  Değerlendirilemedi
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Tablo */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle>Bütçe Envelopes</CardTitle>
            <Button variant="outline" size="sm" className="gap-2">
              <Download className="h-4 w-4" />
              Excel
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {filteredEnvelopes.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              Bütçe zarfı bulunamadı.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left p-3 text-sm font-semibold text-gray-700">
                      Kanal
                    </th>
                    <th className="text-left p-3 text-sm font-semibold text-gray-700">
                      Kategori
                    </th>
                    <th className="text-left p-3 text-sm font-semibold text-gray-700">
                      Dönem
                    </th>
                    <th className="text-right p-3 text-sm font-semibold text-gray-700">
                      Tahsis
                    </th>
                    <th className="text-right p-3 text-sm font-semibold text-gray-700">
                      Consumed
                    </th>
                    <th className="text-right p-3 text-sm font-semibold text-gray-700">
                      Available
                    </th>
                    <th className="text-center p-3 text-sm font-semibold text-gray-700">
                      Utilization
                    </th>
                    <th className="text-center p-3 text-sm font-semibold text-gray-700">
                      RAG
                    </th>
                    <th className="text-center p-3 text-sm font-semibold text-gray-700">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {filteredEnvelopes.map((envelope) => {
                    const allocated = safeNumber(envelope.allocatedAmount);
                    const consumed = safeNumber(envelope.consumedAmount);
                    const available = safeNumber(envelope.availableAmount);
                    const utilization = evaluateBudgetUtilization(
                      envelope.allocatedAmount,
                      usedFromAvailable(
                        envelope.allocatedAmount,
                        envelope.availableAmount
                      )
                    );

                    return (
                      <tr
                        key={envelope.id}
                        className="border-b hover:bg-gray-50"
                      >
                        <td className="p-3">{envelope.channel || '-'}</td>
                        <td className="p-3">{envelope.category || '-'}</td>
                        <td className="p-3">{envelope.period}</td>
                        <td className="p-3 text-right">
                          {formatCurrency(allocated, envelope.currency)}
                        </td>
                        <td className="p-3 text-right">
                          {formatCurrency(consumed, envelope.currency)}
                        </td>
                        <td className="p-3 text-right text-green-600 font-medium">
                          {formatCurrency(available, envelope.currency)}
                        </td>
                        <td className="p-3">
                          {utilization.kind === 'EVALUATED' ? (
                            <div className="flex items-center gap-2">
                              <span
                                className={`text-sm font-medium ${RAG_TEXT_COLOR[utilization.status]}`}
                              >
                                %{utilization.percent.toFixed(1)}
                              </span>
                              <Progress
                                value={utilization.percent}
                                className={`flex-1 ${RAG_BAR_COLOR[utilization.status]}`}
                              />
                            </div>
                          ) : (
                            <span
                              className="text-sm text-gray-400"
                              title={describeBudgetUtilizationGap(
                                utilization.reason
                              )}
                            >
                              {BUDGET_UTILIZATION_NOT_EVALUABLE_LABEL}
                            </span>
                          )}
                        </td>
                        <td className="p-3 text-center">
                          {utilization.kind === 'EVALUATED' ? (
                            <div className="flex items-center justify-center gap-1">
                              <div
                                className={`w-2 h-2 rounded-full ${RAG_DOT_COLOR[utilization.status]}`}
                              />
                              <span className="text-sm">
                                {RAG_LABEL[utilization.status]}
                              </span>
                            </div>
                          ) : (
                            <span
                              className="text-sm text-gray-400"
                              title={describeBudgetUtilizationGap(
                                utilization.reason
                              )}
                            >
                              Değerlendirilemedi
                            </span>
                          )}
                        </td>
                        <td className="p-3 text-center">
                          <div className="flex justify-center gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => navigate(`/budget/${envelope.id}`)}
                              title="Detay"
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            {/* "Rezerve Et" butonu KALDIRILDI (T-289, `Z38`,
                                `K6(c)`, 2026-08-26) — backend `POST
                                /budget/reserve` ile birlikte. */}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
