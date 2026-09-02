import { describe, it, expect } from 'vitest';
import {
  getSkuCellValue,
  getFuCellValue,
} from '@/components/features/plans/gridCellValue';
import type { PlanSku, PlanFu } from '@/api/endpoints/plans.endpoints';

/**
 * `T-349` / `Z79 §8` — `baseVolume ?? 0` / `|| 0` (40 vaka,
 * `PlanningGridEnhanced.tsx`) was undoing `Q20`'s backend null-propagation
 * (`Z77`) in the display layer: a row whose `baseVolume` is missing
 * (`NOT_EVALUABLE`) rendered every derived BASE_* column as a real `0`
 * instead of `-`.
 *
 * ⚠️ **Ayırt edicilik şartı (`CLAUDE.md §2.7 #6`):** her `it` bir DOLU ve bir
 * EKSİK satırı AYNI testte karşılaştırır. İkisi aynı çıktıyı verirse test
 * kördür — sadece "değer `null` mi" değil, "dolu satırdan FARKLI mı" ölçülür.
 */

function skuFixture(overrides: Partial<PlanSku> = {}): PlanSku {
  return {
    id: 'sku-1',
    version: 1,
    planFuId: 'fu-1',
    skuId: 'master-sku-1',
    baseVolume: 1000,
    plannedVolume: 1200,
    incrementalVolume: 200,
    plannedTurnover: 0,
    tacticSpend: 0,
    plannedGp: 5000,
    baseLtaOnInvoiceSpend: 100,
    baseLtaOffInvoiceSpend: 50,
    plannedLtaOnInvoiceSpend: 120,
    plannedLtaOffInvoiceSpend: 60,
    promoOnInvoiceSpend: 300,
    promoOffInvoiceSpend: 200,
    sku: { id: 'master-sku-1', name: 'SKU 1', code: 'S1', unitPrice: 10, cogs: 4 },
    ...overrides,
  };
}

function fuFixture(planSkus: PlanSku[]): PlanFu {
  return {
    id: 'fu-1',
    version: 1,
    planId: 'plan-1',
    fuId: 'master-fu-1',
    totalPlannedVolume: planSkus.reduce((s, sk) => s + (sk.plannedVolume ?? 0), 0),
    totalSpend: 0,
    totalGp: 5000,
    gpRoi: null,
    planSkus,
  };
}

describe('PlanningGridEnhanced — SKU: baseVolume eksikliği NOT_EVALUABLE olmalı, sessiz 0 değil', () => {
  const doluSku = skuFixture();
  const eksikSku = skuFixture({ baseVolume: undefined });

  it.each([
    'BASE_GSV',
    'BASE_NIV',
    'BASE_TO',
    'BASE_COGS',
    'BASE_GP',
    'BASE_GM_PCT',
    'INCR_GSV',
    'INCR_NIV',
    'INCR_TO',
    'INCR_GP',
    'INCR_GM_PCT',
    'VOL_UPLIFT_PCT',
    'TO_UPLIFT_PCT',
    'TO_ROI_PCT',
  ])('%s — dolu satır SAYI verir, eksik satır null verir (AYIRT EDİLİYOR)', (col) => {
    const doluValue = getSkuCellValue(doluSku, col);
    const eksikValue = getSkuCellValue(eksikSku, col);

    // Ayırt edicilik: iki satır AYNI çıktıyı vermemeli.
    expect(doluValue).not.toBe(eksikValue);
    expect(doluValue).not.toBeNull();
    expect(typeof doluValue).toBe('number');
    // Sessiz-sıfır regresyonu: eksik satır `0` DEĞİL, `null` olmalı.
    expect(eksikValue).toBeNull();
  });

  it('BASE_VOL kendisi zaten doğruydu (?? null) — regresyon kontrolü', () => {
    expect(getSkuCellValue(doluSku, 'BASE_VOL')).toBe(1000);
    expect(getSkuCellValue(eksikSku, 'BASE_VOL')).toBeNull();
  });

  it('gerçek sıfır taban (baseVolume=0) ile eksik taban (undefined) AYNI null sonucu paylaşır — bilinen sınır, VOL_UPLIFT_PCT paydası her ikisinde de tanımsız', () => {
    const sifirSku = skuFixture({ baseVolume: 0 });
    expect(getSkuCellValue(sifirSku, 'VOL_UPLIFT_PCT')).toBeNull();
    expect(getSkuCellValue(eksikSku, 'VOL_UPLIFT_PCT')).toBeNull();
    // Ama BASE_GSV ekseninde ayrışırlar: gerçek 0 taban → gerçek 0 GSV (sayı),
    // eksik taban → null (hesaplanamadı). Bu ikisinin AYNI şey olmadığının kanıtı.
    expect(getSkuCellValue(sifirSku, 'BASE_GSV')).toBe(0);
    expect(getSkuCellValue(eksikSku, 'BASE_GSV')).toBeNull();
  });
});

describe('PlanningGridEnhanced — FU rollup: KISMİ satır (plannedVolume var, baseVolume yok) tüm agregatı NOT_EVALUABLE yapar (Q20, Z78 §1)', () => {
  const doluFu = fuFixture([skuFixture({ id: 'a' }), skuFixture({ id: 'b', baseVolume: 500 })]);
  const kismiFu = fuFixture([
    skuFixture({ id: 'a' }),
    skuFixture({ id: 'b', baseVolume: undefined }), // plannedVolume dolu, baseVolume yok ⇒ KISMİ
  ]);

  it.each(['BASE_VOL', 'BASE_GSV', 'BASE_NIV', 'BASE_TO', 'BASE_COGS', 'BASE_GP', 'BASE_GM_PCT'])(
    '%s — dolu FU SAYI, kısmi-satırlı FU null (AYIRT EDİLİYOR)',
    (col) => {
      const doluValue = getFuCellValue(doluFu, col);
      const kismiValue = getFuCellValue(kismiFu, col);
      expect(doluValue).not.toBe(kismiValue);
      expect(doluValue).not.toBeNull();
      expect(kismiValue).toBeNull();
    }
  );
});

describe('PlanningGridEnhanced — FU rollup: DOKUNULMAMIŞ satır (baseVolume VE plannedVolume ikisi de yok) aggregate bloklamaz (Q20 "katılmıyor, 0 değil")', () => {
  it('dokunulmamış satır BASE_VOL toplamına dahil edilmez, ama aggregate null olmaz', () => {
    const touched = skuFixture({ id: 'a' }); // baseVolume=1000
    const untouched = skuFixture({
      id: 'b',
      baseVolume: undefined,
      plannedVolume: undefined,
    });
    const fu = fuFixture([touched, untouched]);

    // Yalnız dokunulmuş satır katkı verir — 1000, ikinci satır yok sayılır
    // (0 olarak SAYILMAZ, sadece katılmaz — ki sayısal sonuç aynı olsa da
    // aggregate NOT_EVALUABLE'a düşmez, çünkü satır hiç planlanmamış).
    expect(getFuCellValue(fu, 'BASE_VOL')).toBe(1000);
    expect(getFuCellValue(fu, 'BASE_GSV')).not.toBeNull();
  });
});
