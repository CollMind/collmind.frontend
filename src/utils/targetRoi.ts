/**
 * TARGET-ROI EKSENİ — frontend tarafı.
 *
 * ⚠️ **TWIN OF: `collmind.backend/src/common/kpi/target-roi.ts`.**
 * Kural orada değişirse burada da değişir; `targetRoi.test.ts` o dosyanın
 * ölçüm matrisini **sınıf sınıf** aynalar — vaka vaka DEĞİL.
 *
 * ⚠️ **Ve fark kayda geçiyor (dürüstlük kalemi):** BE tarafında olup burada
 * karşılığı olmayan vakalar var; en önemlisi *"karşılaştırma SAYISAL yapılır
 * — dizge karşılaştırması olsaydı `"9" < "20.0000"` FALSE derdi"*
 * ayırt edicisi. Bu FE kopyasının kendi `toFiniteDecimal`'i için de tam o
 * ayırt edici gerekiyor. ⛔ *"Vaka vaka aynalar"* demek, ölçülmemiş bir
 * eşitlik iddia etmek olurdu (`DISIPLIN`: *eşitlik, varlığın kanıtı
 * değildir*).
 * (Aynı bilinçli-ikiz deseni `numberUtils.ts` ↔ `numeric-text.ts` için de
 * uygulanıyor — iki repo paket/workspace/path-alias paylaşmıyor.)
 *
 * ── `CLAUDE.md §7`: ARANDI MI, NEREDE, HANGİ TERİMLERLE ─────────────────
 * ```
 * rg -i "below.?target|hedefin alt|NOT_EVALUABLE|targetRoi"  collmind.frontend/src
 * ```
 * ⇒ `targetRoiThreshold` YALNIZCA iki yerde: `kpi.endpoints.ts` (tip) ve
 * `grid-cells.tsx` (tooltip, ve o prop'un üretimde çağıranı yok). Bir
 * DEĞERLENDİRME (`BELOW_TARGET` / `NOT_EVALUABLE`) hiçbir yerde yoktu.
 * Bulunan tek şey `PlanApprovalsPage.tsx`'in **hardcode'lu `< 20`**
 * bannerıydı — ve bu dosya (`T-344` / `Z73 §3` şart 3) onun **yerine**
 * geçiyor, yanına değil.
 *
 * ── ÖLDÜRÜLEN ÜÇ KUSUR ──────────────────────────────────────────────────
 * ```
 * 1  eşik KODDAN (`roi < 20`)          → §2.3 ihlali; artık GET /master-data/kpis
 * 2  toNumberOrZero(overallRoi)        → §2.5: "hesaplanamadı" ≠ "%0 ROI"
 * 3  RAG rengi HİÇ okunmuyordu         → RED/AMBER/LTA planlar da banner alıyordu,
 *                                        yani `Z71 §1`'in ENGELLEMEK için
 *                                        yazdığı ÇİFTE SAYIM canlıydı
 * ```
 */

export type TargetRoiEvaluation =
  | { kind: 'BELOW_TARGET'; roi: number; threshold: number }
  | { kind: 'AT_OR_ABOVE_TARGET'; roi: number; threshold: number }
  | { kind: 'NOT_EVALUABLE'; reason: 'ROI_NULL' | 'THRESHOLD_NOT_CONFIGURED' };

/**
 * ⛔ `decimal` kolonları API'den **DİZGE** gelir (`"20.0000"`, canlı DB'de
 * ölçüldü — `Kpi` entity'sinde transformer YOK). Çözülemeyen bir girdi
 * `0` OLMAZ, `null` olur ve çağıran `NOT_EVALUABLE` görür.
 */
export function toFiniteDecimal(value: unknown): number | null {
  if (value === null || value === undefined) return null;
  if (typeof value === 'number') return Number.isFinite(value) ? value : null;
  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (trimmed === '') return null;
    const parsed = Number(trimmed);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

/**
 * Bir planın ROI'sini hedefine göre konumlar.
 *
 * ⛔ **Varsayılan eşik YOK** (`§2.5`). Hedef konfigüre edilmemişse cevap
 * *"hedefin altında"* değil, **`NOT_EVALUABLE`**'dır.
 *
 * Sınır: `roi === threshold` **hedefin ALTINDA DEĞİLDİR** (`<`, `<=` değil).
 */
export function evaluateTargetRoi(
  roi: number | string | null | undefined,
  threshold: number | string | null | undefined
): TargetRoiEvaluation {
  const roiNum = toFiniteDecimal(roi);
  if (roiNum === null) return { kind: 'NOT_EVALUABLE', reason: 'ROI_NULL' };
  const thresholdNum = toFiniteDecimal(threshold);
  if (thresholdNum === null) {
    return { kind: 'NOT_EVALUABLE', reason: 'THRESHOLD_NOT_CONFIGURED' };
  }
  return roiNum < thresholdNum
    ? { kind: 'BELOW_TARGET', roi: roiNum, threshold: thresholdNum }
    : { kind: 'AT_OR_ABOVE_TARGET', roi: roiNum, threshold: thresholdNum };
}

/**
 * `Z71 §1`'in kapısı: *"**`GREEN`** ∧ ROI < hedef"*.
 *
 * ⚠️ Neden yalnız `GREEN`: `RED`/`AMBER` planlar **kadran** tarafından zaten
 * konuşuluyor; onlara ikinci bir uyarı eklemek aynı planı iki kez saymak
 * olurdu. Renk `null` ise (kısmi kapsama ya da **değerlendirme dışı**)
 * hiçbir yargı verilmez — `S1`'in bu eksendeki karşılığı.
 */
export function isBelowTargetRoi(
  ragStatus: string | null | undefined,
  evaluation: TargetRoiEvaluation
): boolean {
  return ragStatus === 'GREEN' && evaluation.kind === 'BELOW_TARGET';
}

/** Kullanıcıya gösterilen tek cümle — banner ve rozet AYNI kaynaktan. */
export function belowTargetRoiMessage(roi: number, threshold: number): string {
  return (
    `Hedefin altında: GP ROI %${roi.toFixed(1)}, hedef %${threshold.toFixed(1)}. ` +
    `Plan kâr üretiyor (RAG yeşil) ama hedeflenen getirinin altında.`
  );
}

/**
 * ⛔ **TEK KARAR NOKTASI — `T-344` ikinci tur.**
 *
 * `Z73`'ün kabul ölçütü *"dalga sonunda **BİR** below-target
 * implementasyonu kalır"* diyordu ve ilk tur **karşılamadı**: `§7` taraması
 * `roi < 20|isLowRoi` desenine bağlıydı, ve `fu` ÖN EKİ deseni bozdu —
 * `fuRoi < 20` · `isFuLowRoi` **görünmedi**. Beşinci kopya
 * (`GrandTotals.tsx`) ise `targetRoi` adlı bir **yerel sabitin** arkasındaydı.
 *
 * > ### **BİR SINIFI ARARKEN, O SINIFIN DEĞİŞKEN ADLARINI DEĞİL, KARARINI ARA.**
 * > Desen `roi` kelimesine bağlıydı; karar ise *"bir eşikle karşılaştırma"*.
 *
 * ⇒ `evaluateTargetRoi`/`isBelowTargetRoi` **serbestçe çağrılabilir kalıyor**
 * ama her tüketici artık BUNU çağırır: karar da, `null` politikası da, mesaj
 * da tek yerde. Bir bileşende `< 20` yazmak için bir sebep kalmadı.
 *
 * ⭐ **Plan ve FU seviyesi AYNI fonksiyonu kullanır.** İkisinin ayrı
 * kopyaları olması tam olarak bu turun bulduğu kusurdu; seviye farkı yalnız
 * **girdide** (hangi satırın `ragStatus`/`gpRoi`'si), kararda değil.
 */
export interface BelowTargetDecision {
  readonly evaluation: TargetRoiEvaluation;
  /**
   * Rozet/kırmızı gösterilsin mi. **Kadran-farkında**: `RED`/`AMBER` zaten
   * kadran tarafından konuşuluyor, `null` renk hiçbir yargı taşımaz.
   */
  readonly isBelowTarget: boolean;
  /** Okunabilen ROI ya da `null` (⇒ ekranda `—`). ⛔ **ASLA `0`.** */
  readonly roi: number | null;
  /** Tek cümlelik gerekçe ya da `null`. Uyarı ve rozet AYNI kaynaktan. */
  readonly message: string | null;
}

export function resolveBelowTarget(
  ragStatus: string | null | undefined,
  roi: number | string | null | undefined,
  threshold: number | string | null | undefined
): BelowTargetDecision {
  const evaluation = evaluateTargetRoi(roi, threshold);
  const isBelowTarget =
    evaluation.kind === 'BELOW_TARGET' && isBelowTargetRoi(ragStatus, evaluation);
  return {
    evaluation,
    isBelowTarget,
    roi: evaluation.kind === 'NOT_EVALUABLE' ? toFiniteDecimal(roi) : evaluation.roi,
    message:
      isBelowTarget && evaluation.kind === 'BELOW_TARGET'
        ? belowTargetRoiMessage(evaluation.roi, evaluation.threshold)
        : null,
  };
}
