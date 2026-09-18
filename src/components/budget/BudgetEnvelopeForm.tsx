import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  CreateBudgetEnvelopeDto,
  BudgetEnvelopeStatus,
} from '@/types/budget.types';
import {
  categoryEndpoints,
  channelEndpoints,
} from '@/api/endpoints/master-data.endpoints';
import { userEndpoints } from '@/api/endpoints/users.endpoints';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { NumericInput } from '@/components/common/NumericInput';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Card, CardContent } from '@/components/ui/card';
import { Info, AlertCircle, Loader2 } from 'lucide-react';

interface BudgetEnvelopeFormProps {
  onSubmit: (data: CreateBudgetEnvelopeDto) => Promise<void>;
  onCancel?: () => void;
  initialData?: Partial<CreateBudgetEnvelopeDto>;
  isLoading?: boolean;
}

const MONTHS = [
  { value: '01', label: 'Ocak' },
  { value: '02', label: 'Şubat' },
  { value: '03', label: 'Mart' },
  { value: '04', label: 'Nisan' },
  { value: '05', label: 'Mayıs' },
  { value: '06', label: 'Haziran' },
  { value: '07', label: 'Temmuz' },
  { value: '08', label: 'Ağustos' },
  { value: '09', label: 'Eylül' },
  { value: '10', label: 'Ekim' },
  { value: '11', label: 'Kasım' },
  { value: '12', label: 'Aralık' },
];

// Radix `Select` bir `SelectItem`'ın `value=""` taşımasına izin vermez (uyarı fırlatır).
// "Sahip seçilmedi" durumunu temsil etmek için ayrı bir sentinel kullanılır; gönderim
// anında bu sentinel `undefined`'a çevrilir — asla boş string olarak backend'e gitmez.
const NO_OWNER_SENTINEL = '__NO_OWNER__';

export function BudgetEnvelopeForm({
  onSubmit,
  onCancel,
  initialData,
  isLoading = false,
}: BudgetEnvelopeFormProps) {
  const currentYear = new Date().getFullYear();
  const [fiscalYear, setFiscalYear] = useState(
    initialData?.fiscalYear || currentYear.toString()
  );
  const [month, setMonth] = useState(initialData?.month || '');
  // `Z111 §55` K1 (i) / T-426 — bu state artık KOD değil, seçilen kanal/
  // kategori entity'sinin ID'sidir (backend `channelId`/`categoryId`
  // bekler; kod string'i sunucuda bundan türetilir).
  const [channelId, setChannelId] = useState(initialData?.channelId || '');
  const [categoryId, setCategoryId] = useState(initialData?.categoryId || '');
  const [allocatedAmount, setAllocatedAmount] = useState(
    initialData?.allocatedAmount || 0
  );
  const [currency, setCurrency] = useState<'TRY' | 'USD' | 'EUR'>(
    initialData?.currency || 'TRY'
  );
  // `Z59 §3` — OPSİYONEL alan. Varsayılan: seçilmedi (sentinel). Kullanıcı hiçbir şey
  // seçmezse `budgetOwnerId` istekten hiç GİTMEZ (bkz. `handleSubmit`) — boş string DEĞİL.
  const [budgetOwnerId, setBudgetOwnerId] = useState(
    initialData?.budgetOwnerId || NO_OWNER_SENTINEL
  );

  const [errors, setErrors] = useState<Record<string, string>>({});

  // Fetch categories from API
  const { data: categoriesData, isLoading: categoriesLoading } = useQuery({
    queryKey: ['categories', 'active'],
    queryFn: () => categoryEndpoints.getAll(true),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  const categories = useMemo(() => {
    return categoriesData?.data || [];
  }, [categoriesData]);

  // Fetch channels from API — `Z111 §55` K1 (i) / T-426: kanal seçicisi de
  // id taşır (`master-data/channels`, `CreatePlanForm.tsx`/`EditPlanDialog.tsx`
  // ile AYNI desen). Eski hardcode `CustomerChannel` enum'u kaldırıldı; DB'deki
  // 8 kanal kaydının kodları bu enum'un değerleriyle 1:1 örtüşüyor
  // ([ÖLÇÜLDÜ TL, T-426: psql main.channels] NKA/TRADITIONAL_TRADE/E_COMMERCE/
  // EXPORT/WHOLESALE/RETAIL/HORECA/DISTRIBUTOR) — kullanıcı davranışı değişmez,
  // yalnız taşınan alan kod → id.
  const { data: channelsData, isLoading: channelsLoading } = useQuery({
    queryKey: ['channels', 'active'],
    queryFn: () => channelEndpoints.getAll(true),
    staleTime: 5 * 60 * 1000,
  });

  const channels = useMemo(() => {
    return channelsData?.data || [];
  }, [channelsData]);

  // Fetch users from API (bütçe sahibi seçici) — §7: dedike bir "user picker" bileşeni
  // aranıp bulunamadı (grep: `UserSelect`/`UserPicker`/`UserCombobox` — sıfır sonuç).
  // Bu dosyanın zaten kullandığı desen (Select + useQuery + userEndpoints.getAll)
  // tekrar kullanıldı; yeni bir genel bileşen yazılmadı.
  // ⚠️ `T-323` review (Team Lead, 2026-08-28) — BU SORGU HER ROL İÇİN ÇALIŞMAZ.
  // Ölçüldü (`capabilities.ts`): `GET /users` → `USER_MANAGE` = **yalnız ADMIN**;
  // zarf yaratma → `SHARED_ENVELOPE_WRITE` = ADMIN · FINANCE · PLANNER.
  // ⇒ Zarf yaratabilen ÜÇ rolden İKİSİ bu listeyi ÇEKEMEZ (403).
  // Kilitlenme yok (`|| []`), ama seçici BOŞ ve AÇIKLAMASIZ kalırdı — yani
  // "yetkin yok" ile "hiç kullanıcı yok" AYNI GÖRÜNÜRDÜ. Aşağıda ayrılıyor.
  const {
    data: usersData,
    isLoading: usersLoading,
    isError: usersError,
  } = useQuery({
    queryKey: ['users', 'all'],
    queryFn: () => userEndpoints.getAll(),
    staleTime: 5 * 60 * 1000,
    retry: false,
  });

  const users = useMemo(() => {
    return usersData?.data || [];
  }, [usersData]);

  // Period hesaplama
  const period = useMemo(() => {
    if (fiscalYear && month) {
      return `${fiscalYear}-${month}`;
    }
    return '';
  }, [fiscalYear, month]);

  // Ön izleme — gösterim amaçlı KOD, seçilen id'den çözülür (istekle
  // gönderilen alan değildir, yalnız kullanıcıya önizleme metni içindir).
  const selectedChannelCode = useMemo(() => {
    return channels.find((ch: { id: string; code: string }) => ch.id === channelId)
      ?.code;
  }, [channels, channelId]);

  const selectedCategoryCode = useMemo(() => {
    return categories.find(
      (cat: { id: string; code: string }) => cat.id === categoryId
    )?.code;
  }, [categories, categoryId]);

  const preview = useMemo(() => {
    if (selectedChannelCode && selectedCategoryCode && period) {
      return `${selectedChannelCode}/${selectedCategoryCode}/${period}`;
    }
    return '.../.../...';
  }, [selectedChannelCode, selectedCategoryCode, period]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('tr-TR', {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!fiscalYear) {
      newErrors.fiscalYear = 'Yıl zorunludur';
    }

    if (!month) {
      newErrors.month = 'Ay zorunludur';
    }

    if (!channelId) {
      newErrors.channelId = 'Kanal zorunludur';
    }

    if (!categoryId) {
      newErrors.categoryId = 'Kategori zorunludur';
    }

    if (allocatedAmount <= 0) {
      newErrors.allocatedAmount = "Tahsis edilen tutar 0'dan büyük olmalıdır";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validate()) {
      return;
    }

    try {
      const data: CreateBudgetEnvelopeDto = {
        fiscalYear,
        period,
        month,
        // `Z111 §55` K1 (i) / T-426 — `channel`/`category` KOD string'leri
        // GÖNDERİLMEZ; backend `channelId`/`categoryId`'den kodu türetir
        // (`BudgetService#createEnvelope`, `budget.types.ts` DTO yorumu).
        channelId,
        categoryId,
        allocatedAmount,
        currency,
        status: BudgetEnvelopeStatus.DRAFT,
        // `Z59 §3c` — boş bırakmak meşru-tanımlı bir durumdur. Sentinel ise alan
        // isteğe hiç EKLENMEZ (`undefined`); boş string ASLA gönderilmez (uuid
        // kolonuna boş string 500 üretir — DUR listesi madde 4).
        ...(budgetOwnerId !== NO_OWNER_SENTINEL
          ? { budgetOwnerId }
          : {}),
      };

      await onSubmit(data);
    } catch (error) {
      // Error is handled by parent component
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="fiscalYear">
            Dönem * <span className="text-xs text-gray-500">(Yıl)</span>
          </Label>
          <Select value={fiscalYear} onValueChange={setFiscalYear}>
            <SelectTrigger id="fiscalYear">
              <SelectValue placeholder="Yıl seçin" />
            </SelectTrigger>
            <SelectContent>
              {Array.from({ length: 5 }, (_, i) => currentYear + i).map(
                (year) => (
                  <SelectItem key={year} value={year.toString()}>
                    {year}
                  </SelectItem>
                )
              )}
            </SelectContent>
          </Select>
          {errors.fiscalYear && (
            <p className="text-xs text-red-600 mt-1">{errors.fiscalYear}</p>
          )}
        </div>
        <div>
          <Label htmlFor="month">
            <span className="text-xs text-gray-500">(Ay)</span>
          </Label>
          <Select value={month} onValueChange={setMonth}>
            <SelectTrigger id="month">
              <SelectValue placeholder="Ay seçin" />
            </SelectTrigger>
            <SelectContent>
              {MONTHS.map((m) => (
                <SelectItem key={m.value} value={m.value}>
                  {m.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {errors.month && (
            <p className="text-xs text-red-600 mt-1">{errors.month}</p>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="channel">Kanal *</Label>
          <Select
            value={channelId}
            onValueChange={setChannelId}
            disabled={channelsLoading}
          >
            <SelectTrigger id="channel">
              {channelsLoading ? (
                <div className="flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Yükleniyor...</span>
                </div>
              ) : (
                <SelectValue placeholder="Seçiniz" />
              )}
            </SelectTrigger>
            <SelectContent>
              {channels.map(
                (ch: { id: string; code: string; name: string }) => (
                  <SelectItem key={ch.id} value={ch.id}>
                    {ch.name}
                  </SelectItem>
                )
              )}
            </SelectContent>
          </Select>
          {errors.channelId && (
            <p className="text-xs text-red-600 mt-1">{errors.channelId}</p>
          )}
        </div>
        <div>
          <Label htmlFor="category">Kategori *</Label>
          <Select
            value={categoryId}
            onValueChange={setCategoryId}
            disabled={categoriesLoading}
          >
            <SelectTrigger id="category">
              {categoriesLoading ? (
                <div className="flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Yükleniyor...</span>
                </div>
              ) : (
                <SelectValue placeholder="Seçiniz" />
              )}
            </SelectTrigger>
            <SelectContent>
              {categories.map(
                (cat: { id: string; code: string; name: string }) => (
                  <SelectItem key={cat.id} value={cat.id}>
                    {cat.name}
                  </SelectItem>
                )
              )}
            </SelectContent>
          </Select>
          {errors.categoryId && (
            <p className="text-xs text-red-600 mt-1">{errors.categoryId}</p>
          )}
        </div>
      </div>

      <div>
        <Label htmlFor="allocatedAmount">Tahsis Tutarı *</Label>
        <NumericInput
          id="allocatedAmount"
          value={allocatedAmount}
          onChange={(v) => setAllocatedAmount(v ?? 0)}
          required
        />
        {errors.allocatedAmount && (
          <p className="text-xs text-red-600 mt-1">{errors.allocatedAmount}</p>
        )}
      </div>

      <div>
        <Label htmlFor="budgetOwnerId">
          Bütçe Sahibi{' '}
          <span className="text-xs text-gray-500">(opsiyonel)</span>
        </Label>
        <Select
          value={budgetOwnerId}
          onValueChange={setBudgetOwnerId}
          disabled={usersLoading}
        >
          <SelectTrigger id="budgetOwnerId">
            {usersLoading ? (
              <div className="flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Yükleniyor...</span>
              </div>
            ) : (
              <SelectValue placeholder="Seçilmedi" />
            )}
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={NO_OWNER_SENTINEL}>Seçilmedi</SelectItem>
            {users.map((u) => (
              <SelectItem key={u.id} value={u.id}>
                {u.fullName} ({u.email})
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {usersError && (
          <p className="text-xs text-amber-600 mt-1">
            Kullanıcı listesi görüntülenemiyor (bu yetki yöneticiye aittir) —
            bütçe sahibi atanamaz. Boş bırakıldığında bildirim finans ekibine
            gider.
          </p>
        )}
        <p className="text-xs text-gray-500 mt-1">
          Bütçe eşiği aşımlarında bildirim bu kişiye gider. Boş bırakılırsa
          bildirim finans ekibine yönlendirilir.
        </p>
      </div>

      {/* Ön İzleme */}
      <Card className="bg-blue-50 border-blue-200">
        <CardContent className="pt-4">
          <div className="flex items-start gap-2">
            <Info className="h-5 w-5 text-blue-600 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm text-gray-700">
                <span className="font-medium">{preview}</span> için{' '}
                <span className="font-medium">
                  {formatCurrency(allocatedAmount)}
                </span>{' '}
                tahsis edilecek.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Uyarı */}
      <Card className="bg-yellow-50 border-yellow-200">
        <CardContent className="pt-4">
          <div className="flex items-start gap-2">
            <AlertCircle className="h-5 w-5 text-yellow-600 mt-0.5" />
            <p className="text-sm text-gray-700">
              Bu kombinasyon unique olmalı.
            </p>
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end gap-2">
        {onCancel && (
          <Button type="button" variant="outline" onClick={onCancel}>
            İptal
          </Button>
        )}
        <Button type="submit" disabled={isLoading}>
          {isLoading ? (
            'Oluşturuluyor...'
          ) : (
            <>
              <span className="mr-2">✓</span>
              Oluştur
            </>
          )}
        </Button>
      </div>
    </form>
  );
}
