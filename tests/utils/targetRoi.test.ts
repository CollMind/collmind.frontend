import { describe, it, expect } from 'vitest';
import {
  belowTargetRoiMessage,
  evaluateTargetRoi,
  isBelowTargetRoi,
  resolveBelowTarget,
} from '@/utils/targetRoi';

/**
 * ⚠️ **MIRROR OF: `collmind.backend/src/common/kpi/target-roi.spec` matrisi.**
 * Kural backend'de değişirse burada da değişmeli; sapma kırmızıya döner.
 *
 * `T-344` / `Z73 §3` şart 3 — `B3`'ün öldürdüğü ÜÇ kusurun her biri için
 * bir vaka var, ve hepsi **eski davranışla ZIT** sonuç verir (yani bu
 * dosya `B3`'ün geri gelmesini engelleyen kapıdır, bir tekrar değil).
 */
describe('targetRoi — Target-ROI ekseni (Z71 §1), backend ikizi', () => {
  it('ROI < hedef ⇒ BELOW_TARGET', () => {
    expect(evaluateTargetRoi(10.5, 20)).toEqual({
      kind: 'BELOW_TARGET',
      roi: 10.5,
      threshold: 20,
    });
  });

  it('sınır: ROI === hedef hedefin ALTINDA DEĞİLDİR (`<`, `<=` değil)', () => {
    expect(evaluateTargetRoi(20, 20).kind).toBe('AT_OR_ABOVE_TARGET');
  });

  it("⛔ KUSUR 1 — eşik `pg`'den DİZGE gelir (`\"20.0000\"`) ve okunur", () => {
    const e = evaluateTargetRoi('10.5000', '20.0000');
    expect(e.kind).toBe('BELOW_TARGET');
    // Mesaj SAYISAL biçimlenmiş olmalı — dizge sızarsa "%20.0000" görürdük.
    if (e.kind === 'BELOW_TARGET') {
      expect(belowTargetRoiMessage(e.roi, e.threshold)).toContain('%20.0');
    }
  });

  it('⛔ KUSUR 2 — `null` ROI `0` SAYILMAZ ⇒ NOT_EVALUABLE', () => {
    // Eski `toNumberOrZero(overallRoi) < 20` bu planı "hedefin altında"
    // diye işaretliyordu: "hesaplanamadı" ile "%0 ROI" aynı kefede (`§2.5`).
    expect(evaluateTargetRoi(null, 20)).toEqual({
      kind: 'NOT_EVALUABLE',
      reason: 'ROI_NULL',
    });
    expect(evaluateTargetRoi(undefined, 20).kind).toBe('NOT_EVALUABLE');
    expect(evaluateTargetRoi('abc', 20).kind).toBe('NOT_EVALUABLE');
  });

  it('⛔ eşik yoksa/çözülemezse yargı VERİLMEZ (varsayılan `20` YOK)', () => {
    expect(evaluateTargetRoi(1, null)).toEqual({
      kind: 'NOT_EVALUABLE',
      reason: 'THRESHOLD_NOT_CONFIGURED',
    });
    expect(evaluateTargetRoi(1, 'yirmi').kind).toBe('NOT_EVALUABLE');
    expect(evaluateTargetRoi(1, '').kind).toBe('NOT_EVALUABLE');
  });

  it('⛔ KUSUR 3 — kapı YALNIZ `GREEN`: RED/AMBER/null ÇİFTE SAYILMAZ', () => {
    const below = evaluateTargetRoi(10.5, 20);
    expect(isBelowTargetRoi('GREEN', below)).toBe(true);
    // Eski banner rengi HİÇ okumuyordu ⇒ aşağıdakilerin HEPSİ banner alıyordu.
    expect(isBelowTargetRoi('RED', below)).toBe(false);
    expect(isBelowTargetRoi('AMBER', below)).toBe(false);
    expect(isBelowTargetRoi(null, below)).toBe(false);
    expect(isBelowTargetRoi(undefined, below)).toBe(false);
  });

  it('NOT_EVALUABLE hiçbir renkte banner ÜRETMEZ', () => {
    const notEval = evaluateTargetRoi(null, 20);
    expect(isBelowTargetRoi('GREEN', notEval)).toBe(false);
  });
});

/**
 * ⛔ `T-344` **II. TUR** — `resolveBelowTarget` TEK KARAR NOKTASI.
 *
 * İlk tur *"FE'de `roi < 20|isLowRoi` → 0"* diye kapanmıştı ve **yanlıştı**:
 * desen `roi` kelimesine bağlıydı, `fu` ÖN EKİ onu bozdu (`fuRoi < 20`,
 * `isFuLowRoi`), ve beşinci kopya bir yerel sabitin arkasındaydı
 * (`gpRoi < targetRoi`).
 *
 * > ### **BİR SINIFI ARARKEN, DEĞİŞKEN ADINI DEĞİL, KARARI ARA.**
 *
 * Bu blok o kararın **tek** uygulamasını pinler. Plan seviyesi ve FU
 * seviyesi **aynı fonksiyonu** çağırdığı için aşağıdaki her vaka **ikisi
 * için birden** geçerlidir — girdi farkı, karar farkı değil.
 */
describe('resolveBelowTarget — plan VE FU seviyesinin TEK kararı (T-344 II)', () => {
  it('GREEN ∧ ROI < hedef ⇒ rozet + mesaj + okunabilir ROI', () => {
    const d = resolveBelowTarget('GREEN', 10.5, 20);
    expect(d.isBelowTarget).toBe(true);
    expect(d.roi).toBe(10.5);
    expect(d.message).toContain('hedef %20.0');
  });

  it('⭐ AYIRT EDİCİ — eşik 5 ⇒ ROI 10.5 rozet YOK (hardcode `20` olsaydı VARDI)', () => {
    const d = resolveBelowTarget('GREEN', 10.5, 5);
    expect(d.isBelowTarget).toBe(false);
    expect(d.message).toBeNull();
    // ⛔ Ama ROI yine OKUNUR — rozet yokluğu "değer yok" demek değil.
    expect(d.roi).toBe(10.5);
  });

  it('⭐ AYIRT EDİCİ — eşik 15 ⇒ mesaj `%15` der, `%20` DEĞİL', () => {
    expect(resolveBelowTarget('GREEN', 10.5, 15).message).toContain('hedef %15.0');
  });

  it('⛔ FU KUSURU 1 — `null` gpRoi `0` SAYILMAZ: rozet YOK, ROI `null` (⇒ ekranda `—`)', () => {
    // Eski FU satırı: `toNumberOrZero(planFu.gpRoi)` ⇒ 0 ⇒ `0 < 20` ⇒
    // KIRMIZI rozet + `%0,0`. İkisi de uydurmaydı.
    const d = resolveBelowTarget('GREEN', null, 20);
    expect(d.isBelowTarget).toBe(false);
    expect(d.roi).toBeNull();
    expect(d.evaluation.kind).toBe('NOT_EVALUABLE');
  });

  it('⛔ FU KUSURU 2 — RED/AMBER FU rozet ALMAZ (kadran konuşuyor, çifte sayım yok)', () => {
    for (const rag of ['RED', 'AMBER']) {
      expect(resolveBelowTarget(rag, 1, 20).isBelowTarget).toBe(false);
    }
  });

  it('⛔ FU KUSURU 3 — renk YOKSA (LTA / kısmi kapsama) rozet ALMAZ', () => {
    expect(resolveBelowTarget(null, 1, 20).isBelowTarget).toBe(false);
    expect(resolveBelowTarget(undefined, 1, 20).isBelowTarget).toBe(false);
  });

  it('⛔ eşik konfigüre DEĞİLSE hiçbir yargı yok — ama ROI yine okunur', () => {
    const d = resolveBelowTarget('GREEN', 10.5, null);
    expect(d.isBelowTarget).toBe(false);
    expect(d.message).toBeNull();
    expect(d.roi).toBe(10.5); // ⛔ `null` DEĞİL: eşiğin yokluğu ROI'yi silmez
  });

  it("dizge girdiler (pg `numeric`) her iki eksende de okunur", () => {
    const d = resolveBelowTarget('GREEN', '10.5000', '20.0000');
    expect(d.isBelowTarget).toBe(true);
    expect(d.roi).toBe(10.5);
  });
});

/**
 * 🟢 **DÜRÜSTLÜK KALEMİ — eksik dört ayırt edici, adıyla kapatılıyor.**
 *
 * Dosya başlığı *"vaka vaka aynalar"* diyordu ve bu **abartılıydı**: BE
 * matrisinde olup burada olmayan vakalar vardı. Biri kritik — bu kopyanın
 * KENDİ `toFiniteDecimal`'i için gereken ayırt edici.
 */
describe('targetRoi — BE matrisinden eksik kalan ayırt ediciler (🟢)', () => {
  it('⛔ karşılaştırma SAYISAL — DİZGE karşılaştırması olsaydı bu satır KIRILIRDI', () => {
    // `"9" < "20.0000"` bir DİZGE karşılaştırmasında **FALSE**'tur
    // (`'9' > '2'`). Sayısal karşılaştırmada `9 < 20` ⇒ TRUE.
    // Normalizasyon düşerse tam bu satır kırmızıya döner.
    expect(evaluateTargetRoi('9', '20.0000').kind).toBe('BELOW_TARGET');
  });

  it('boş/whitespace dizge ⇒ NOT_EVALUABLE (`0` değil)', () => {
    expect(evaluateTargetRoi('   ', 20).kind).toBe('NOT_EVALUABLE');
    expect(evaluateTargetRoi(20, '   ').kind).toBe('NOT_EVALUABLE');
  });

  it('sonlu-olmayan sayılar ⇒ NOT_EVALUABLE', () => {
    expect(evaluateTargetRoi(Number.NaN, 20).kind).toBe('NOT_EVALUABLE');
    expect(evaluateTargetRoi(Number.POSITIVE_INFINITY, 20).kind).toBe(
      'NOT_EVALUABLE'
    );
    expect(evaluateTargetRoi(10, Number.NaN).kind).toBe('NOT_EVALUABLE');
  });

  it('NEGATİF ROI geçerlidir ve hedefin altındadır (`§2.3` edge case)', () => {
    const e = evaluateTargetRoi(-15.25, 20);
    expect(e.kind).toBe('BELOW_TARGET');
    if (e.kind === 'BELOW_TARGET') expect(e.roi).toBe(-15.25);
  });
});
