import { describe, it, expect } from 'vitest';
import {
  RAG_NOT_CALCULATED_LABEL,
  formatCoverageLabel,
  resolveRagPresentation,
} from '@/utils/ragCoverage';

/**
 * `T-342`/`T-343` review `S3` — **BU DOSYA BİR BOŞLUĞU KAPATIYOR.**
 *
 * `resolveRagPresentation` frontend'in RAG sunumundaki **tek karar
 * noktasıdır** ve `T-342` kapanışına kadar **sıfır testi vardı**.
 *
 * CANLI tüketici **DÖRT**: `PlanList` · `GrandTotals` · `grid-cells`
 * (`RAGCell`) · `PlanPerformanceWidget`.
 * ⚠️ `PlanningGrid.tsx` de onu çağırır ama **ÖLÜDÜR**: `PlanDetailPage.tsx`
 * `PlanningGridEnhanced`'i `PlanningGrid` **TAKMA ADIYLA** import ediyor —
 * yani dosya adına bakarak sayılan bir tüketici gerçekte hiç koşmuyor.
 * (İlk yazımda *"beş tüketici"* diyordu; `T-343` review düzeltti.) AC'de yazan *"FE doğrulandı"* o turda bir
 * gözle-bakmaydı; bu dosya onu bir ölçüme çeviriyor.
 *
 * Ölçtüğü ayrım DÖRT DURUMLUDUR ve ikisi de `null` renk taşır:
 * ```
 * renk VAR                                    → RED/AMBER/GREEN
 * renk YOK · sebep YOK · oran YOK              → "hesaplanmadı"
 * renk YOK · sebep YOK · oran VAR (<1)         → "GRİ · %n kapsama"
 * renk YOK · sebep VAR ('LTA_ONLY')            → "değerlendirme dışı"   ⭐ S1
 * ```
 */
describe('resolveRagPresentation — dört durum', () => {
  it.each([['RED'], ['AMBER'], ['GREEN']] as const)(
    '%s: renk taşınır, dışlama YOKTUR',
    (color) => {
      const p = resolveRagPresentation(color, 1);
      expect(p.ragStatus).toBe(color);
      expect(p.isFullCoverage).toBe(true);
      expect(p.isExcluded).toBe(false);
      expect(p.exclusionLabel).toBeNull();
      expect(p.isNeverCalculated).toBe(false);
    }
  );

  it('renk + sebep AYNI ANDA gelirse RENK KAZANIR, dışlama yok sayılır', () => {
    // ⛔ Taşıyıcı tutarsızsa sunum katmanı UYDURMA bir üçüncü hâl üretmez.
    const p = resolveRagPresentation('GREEN', 1, 'LTA_ONLY');
    expect(p.ragStatus).toBe('GREEN');
    expect(p.isExcluded).toBe(false);
  });

  it('hiç hesaplanmadı: renk yok · oran yok · sebep yok', () => {
    const p = resolveRagPresentation(null, null);
    expect(p.isNeverCalculated).toBe(true);
    expect(p.isExcluded).toBe(false);
    expect(RAG_NOT_CALCULATED_LABEL).toBe('Hesaplanmadı');
  });

  it('kısmi kapsama: GRİ, ve oran KORUNUR', () => {
    const p = resolveRagPresentation(null, 0.5);
    expect(p.isNeverCalculated).toBe(false);
    expect(p.isExcluded).toBe(false);
    expect(formatCoverageLabel(p.coverageRatio)).toBe('%50 kapsama');
  });

  describe('⭐ `S1` — TANIMLI-YOKLUK', () => {
    it("'LTA_ONLY': dışlanmış, ve `isNeverCalculated` FALSE (eksiklik DEĞİL)", () => {
      const p = resolveRagPresentation(null, null, 'LTA_ONLY');
      expect(p.isExcluded).toBe(true);
      expect(p.exclusionReason).toBe('LTA_ONLY');
      expect(p.exclusionLabel).toBe('Değerlendirme dışı — LTA');
      expect(p.exclusionExplanation).toContain('promosyon');
      // ⛔ AYIRT EDİCİ SATIR: oran da renk de yokken, sebep varsa bu
      // "hesaplanmadı" DEĞİLDİR. İkisi karışırsa kullanıcıya "veri eksik"
      // denir — oysa veri tam, SORU tanımsız.
      expect(p.isNeverCalculated).toBe(false);
    });

    it('tanınmayan bir sebep SESSİZCE dışlama sayılmaz — GRİ davranışı korunur', () => {
      const p = resolveRagPresentation(null, 0.5, 'SOMETHING_NEW');
      expect(p.isExcluded).toBe(false);
      expect(p.exclusionLabel).toBeNull();
    });

    it.each([
      ['null', null],
      ['undefined', undefined],
      ['boş dize', ''],
      ['küçük harf', 'lta_only'],
    ])('sebep %s ⇒ dışlama YOK', (_ad, raw) => {
      expect(resolveRagPresentation(null, 1, raw).isExcluded).toBe(false);
    });
  });

  describe("⭐ `BASELINE_MISSING` — `Z90 §2/§3`, `LTA_ONLY`'den AYRI sınıf", () => {
    it("'BASELINE_MISSING': kendi rozeti + kendi açıklaması, dışlanmış", () => {
      const p = resolveRagPresentation(null, null, 'BASELINE_MISSING');
      expect(p.isExcluded).toBe(true);
      expect(p.exclusionReason).toBe('BASELINE_MISSING');
      expect(p.exclusionLabel).toBe('Baseline eksik');
      expect(p.exclusionExplanation).toContain('baseline');
      // ⛔ AYIRT EDİCİ: "hesaplanmadı" DEĞİL — sebep tanımlı.
      expect(p.isNeverCalculated).toBe(false);
    });

    it("'LTA_ONLY' rozeti/açıklaması BASELINE_MISSING eklenmesinden ETKİLENMEZ (regresyon pini)", () => {
      const p = resolveRagPresentation(null, null, 'LTA_ONLY');
      expect(p.exclusionReason).toBe('LTA_ONLY');
      expect(p.exclusionLabel).toBe('Değerlendirme dışı — LTA');
      expect(p.exclusionExplanation).toContain('promosyon');
    });

    it('BASELINE_MISSING ile LTA_ONLY rozetleri BİRBİRİNDEN FARKLIDIR (kullanıcı eylemi farklı)', () => {
      const baselineMissing = resolveRagPresentation(null, null, 'BASELINE_MISSING');
      const ltaOnly = resolveRagPresentation(null, null, 'LTA_ONLY');
      expect(baselineMissing.exclusionLabel).not.toBe(ltaOnly.exclusionLabel);
      expect(baselineMissing.exclusionExplanation).not.toBe(
        ltaOnly.exclusionExplanation
      );
    });

    it('tanınmayan bir dize (hâlâ) sessizce dışlama sayılmaz — uydurma etiket yok', () => {
      const p = resolveRagPresentation(null, null, 'SOME_FUTURE_REASON');
      expect(p.isExcluded).toBe(false);
      expect(p.exclusionLabel).toBeNull();
      expect(p.exclusionExplanation).toBeNull();
    });
  });

  describe('taşıyıcı biçimleri — `decimal` STRING olarak gelebilir', () => {
    it('coverageRatio string olarak gelirse sayıya çevrilir', () => {
      // `plans.coverage_ratio` bir `numeric` kolonudur ve `pg` sürücüsü
      // onu STRING döndürür (ragCoverage.ts dosya başı notu).
      expect(resolveRagPresentation(null, '0.25').coverageRatio).toBe(0.25);
    });

    it('geçersiz bir renk dizesi renk SAYILMAZ', () => {
      expect(resolveRagPresentation('MAVI', 1).ragStatus).toBeNull();
    });
  });

  describe('formatCoverageLabel — `%NaN` ÜRETMEZ', () => {
    it.each([
      ['null', null],
      ['undefined', undefined],
    ])('%s ⇒ null', (_ad, v) => {
      expect(formatCoverageLabel(v)).toBeNull();
    });

    it('0 kapsama bir SAYIDIR ve gösterilir (null ile karışmaz)', () => {
      expect(formatCoverageLabel(0)).toBe('%0 kapsama');
    });
  });
});
