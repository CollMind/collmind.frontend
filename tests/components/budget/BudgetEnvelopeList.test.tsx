import { describe, it, expect } from 'vitest';
import { render, screen, within } from '../../utils/test-utils';
import { BudgetEnvelopeList } from '@/components/budget/BudgetEnvelopeList';
import { BudgetEnvelope, BudgetEnvelopeStatus } from '@/types/budget.types';

/**
 * `ŞERİT A'` ikinci tur — **GÖRSEL DOĞRULAMANIN DOM KARŞILIĞI.**
 *
 * `npm run build` exit 0 bir DÜZEN kanıtı DEĞİLDİR: `grid-cols-4 → 3` ve
 * kaldırılan kart/kolon ancak render edilerek görülür. Bu dosya
 * `BudgetEnvelopeList`'i GERÇEKTEN render eder (bileşen saf sunumdur —
 * `envelopes` prop'u alır, kendi isteğini yapmaz) ve şunları pinler:
 *
 * ```
 * 1  "RESERVED" özet kartı YOK        (değeri HER ZAMAN ₺0 idi — kolon yok)
 * 2  "Reserved" tablo kolonu YOK
 * 3  özet grid'i ÜÇ kolon
 * 4  rezervasyon ORANA GİRİYOR        (allocated − available özdeşliği)
 * 5  okunamayan tahsis ⇒ "—" + "Değerlendirilemedi", RENK YOK
 * ```
 *
 * `5` bu turun `§2.5` kapısıdır: eskiden aynı zarf **%0 / yeşil "İyi"**
 * görünüyordu.
 */
const base: BudgetEnvelope = {
  id: 'e1',
  code: 'NKA/HAIR/2026-01',
  name: 'NKA Hair Ocak',
  fiscalYear: '2026',
  period: '2026-01',
  allocatedAmount: 1000,
  consumedAmount: 500,
  availableAmount: 100, // ⇒ 400 rezerve; kullanılan = 1000 − 100 = 900 ⇒ %90
  currency: 'TRY',
  status: 'ACTIVE' as BudgetEnvelopeStatus,
  channel: 'NKA',
  category: 'HAIR_CARE',
};

describe("BudgetEnvelopeList — Q18/Q19 turu, /budget ekranının DOM'u", () => {
  it('"RESERVED" özet kartı ve "Reserved" tablo kolonu KALDIRILDI', () => {
    render(<BudgetEnvelopeList envelopes={[base]} />);
    expect(screen.queryByText('RESERVED')).toBeNull();
    expect(screen.queryByRole('columnheader', { name: 'Reserved' })).toBeNull();
    // poz. kontrol: kardeş kolonlar DURUYOR — sorgu körlemesine null dönmüyor
    expect(screen.getByRole('columnheader', { name: 'Consumed' })).toBeTruthy();
    expect(screen.getByRole('columnheader', { name: 'Available' })).toBeTruthy();
    expect(screen.getByRole('columnheader', { name: 'Utilization' })).toBeTruthy();
  });

  it('özet grid ÜÇ kolon (dört karttan biri öldü)', () => {
    const { container } = render(<BudgetEnvelopeList envelopes={[base]} />);
    expect(container.querySelector('.md\\:grid-cols-3')).toBeTruthy();
    expect(container.querySelector('.md\\:grid-cols-4')).toBeNull();
    expect(screen.getByText('TOPLAM TAHSİS')).toBeTruthy();
    expect(screen.getByText('CONSUMED')).toBeTruthy();
    expect(screen.getByText('AVAILABLE')).toBeTruthy();
  });

  it('⛔ REZERVASYON ORANA GİRİYOR: %90 ⇒ "Uyarı" (eskiden %50 ⇒ "İyi")', () => {
    render(<BudgetEnvelopeList envelopes={[base]} />);
    // ⚠️ Kapsam SATIRA daraltıldı: `%50.0` özet kartında MEŞRU olarak var
    // (CONSUMED = 500/1000). İlk yazımda kapsam geniş bırakılmıştı ve test
    // kırmızı döndü — yani ölçüm, kendi kapsam hatasını yakaladı.
    const row = screen.getByRole('row', { name: /HAIR_CARE/ });
    expect(within(row).getByText('%90.0')).toBeTruthy();
    expect(within(row).queryByText('%50.0')).toBeNull();
    expect(within(row).getByText('Uyarı')).toBeTruthy();
  });

  it('⛔ §2.5: okunamayan tahsis ⇒ "—" + "Değerlendirilemedi", YEŞİL DEĞİL', () => {
    const broken = {
      ...base,
      id: 'e2',
      allocatedAmount: undefined as unknown as number,
    };
    render(<BudgetEnvelopeList envelopes={[broken]} />);
    const row = screen.getByRole('row', { name: /HAIR_CARE/ });
    expect(within(row).getByText('—')).toBeTruthy();
    expect(within(row).getByText('Değerlendirilemedi')).toBeTruthy();
    expect(within(row).queryByText('İyi')).toBeNull();
    expect(within(row).queryByText('%0.0')).toBeNull();
  });

  it('RAG filtresinde "Değerlendirilemedi" AYRI bir kova olarak var', () => {
    render(<BudgetEnvelopeList envelopes={[base]} />);
    // Radix Select kapalıyken seçenekler DOM'da değil; tetikleyicinin
    // varlığı + `utils/budgetUtilization` kovası birim testte pinli.
    expect(screen.getByText('RAG: Tümü')).toBeTruthy();
  });
});
