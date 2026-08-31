import { toNumber } from './numberUtils';

/**
 * `GRİ` sunum durumu — `K-2.4.22a` / `K-2.4.22a1` / `K-2.4.22b` / `K-2.4.22c`.
 *
 * Taşıyıcı `null`'dır (`K-2.4.22a1`). Motor yalnız tam kapsamada
 * (`coverageRatio === 1`) bir renk üretir — `kpi-engine.service.ts`'in
 * `fullCoverage` koruması, T-177. `ragStatus === null` iken kapsama kısmi ya
 * da sıfırdır — ya da hesaplama hiç çalışmamıştır. Bu iki durum
 * `coverageRatio`'nun KENDİSİYLE ayrılır (ölçüldü, 2026-08-14 —
 * `recomputeRatioFromChildren`, `kpi-engine.service.ts`):
 *
 * | `ragStatus`     | `coverageRatio` | anlam                                          |
 * |-----------------|------------------|------------------------------------------------|
 * | RED/AMBER/GREEN | `1` (zorunlu)    | tam kapsama, renk güvenilir                     |
 * | `null`          | `null`           | hiç hesaplanmadı (0 çocuk ya da recalc hiç yok) |
 * | `null`          | `0`..`<1`        | kısmi/sıfır kapsama — GRİ                       |
 *
 * Bir `'GRAY'` DEĞERİ TANIMLANMAZ — üçüncü bir temsil doğururdu, ve ayrımı
 * hiçbir yerde yazılı olmazdı (`K-2.4.22a1`). Sunum kararı bu modülde
 * verilir; taşıyıcıya (`ragStatus`, `coverageRatio`) hiçbir şey sızmaz.
 *
 * `coverageRatio` iki farklı tel üzerinden gelebilir: `plans.coverage_ratio`
 * bir `decimal` KOLONUDUR ve `pg` sürücüsü onu STRING döndürür (ölçüldü,
 * `node -e` ile `numeric(18,4)` → `typeof 'string'`); `plan_fus.calculated_kpis`
 * bir JSONB alanıdır ve içindeki `coverageRatio` gerçek bir JS `number`'dır.
 * `toNumber` ikisini de kabul eder.
 */

export type RagStatus = 'RED' | 'AMBER' | 'GREEN';

/**
 * `T-342` / `Z68 §2` — **TANIMLI-YOKLUK.**
 *
 * `GRİ` bugüne kadar tek bir şeyi anlatıyordu: *"renk GÜVENİLİR DEĞİL"*
 * (kısmi kapsama ya da hiç hesaplanmamış). Kadran indiğiyle **dördüncü**
 * bir gerçek doğdu ve o bir eksiklik değil:
 *
 * ```
 * "değerlendirilemedi"   eksik/kısmi VERİ        → GRİ, kapsama oranıyla
 * "değerlendirme DIŞI"   meşru YOKLUK (LTA-only) → NÖTR rozet + gerekçe
 * ```
 *
 * İkincisini birincisinin içine katlamak, kullanıcıya *"veri eksik"*
 * dedirtir — oysa veri tam, **soru** o plan için tanımsızdır. Sınıfın
 * kaynağı backend'de: `src/common/kpi/rag-quadrant.ts#RagExclusionReason`.
 *
 * 📌 `T-323` UI dersinin RAG hâli: *"yetkin yok" ≠ "kimse yok"* neyse,
 * *"kötü değil" ≠ "değerlendirilmedi"* o.
 */
export type RagExclusionReason = 'LTA_ONLY';

/** Bilinen her dışlama sebebi için kullanıcıya gösterilecek kısa rozet. */
const EXCLUSION_BADGES: Record<RagExclusionReason, string> = {
  LTA_ONLY: 'Değerlendirme dışı — LTA',
};

/** Rozetin yanındaki tek cümlelik gerekçe (tooltip). */
const EXCLUSION_EXPLANATIONS: Record<RagExclusionReason, string> = {
  LTA_ONLY:
    'Bu planda incremental promosyon harcaması yok; RAG bir promosyon ' +
    'değerlendirmesidir ve LTA-only planlar için tanımlı değildir.',
};

function asExclusionReason(
  raw: string | null | undefined
): RagExclusionReason | null {
  // ⛔ Bilinmeyen bir sebep sessizce "dışlama" sayılmaz: backend yeni bir
  // üye eklediğinde bu dosya da güncellenmelidir. Tanınmayan değer
  // `null`'a düşer ⇒ mevcut `GRİ` davranışı korunur, uydurma etiket yok.
  return raw === 'LTA_ONLY' ? 'LTA_ONLY' : null;
}

export interface RagPresentation {
  /** Gerçek bir renk — yalnız tam kapsamada dolu. */
  ragStatus: RagStatus | null;
  /** 0..1 arası oran; hiç hesaplanmadıysa `null`. */
  coverageRatio: number | null;
  /** `ragStatus !== null` ile eşdeğer — okunabilirlik için. */
  isFullCoverage: boolean;
  /**
   * Ne renk ne oran var — hesaplama hiç çalışmamış.
   * ⚠️ Dışlanmış bir sonuçta **her zaman `false`**: dışlama bir eksiklik
   * değildir (`isExcluded` aşağıda).
   */
  isNeverCalculated: boolean;
  /** `T-342`: renk MEŞRU olarak yok — bir eksiklik değil, tanımlı yokluk. */
  isExcluded: boolean;
  /** Dışlama sebebi; yalnız `isExcluded` iken dolu. */
  exclusionReason: RagExclusionReason | null;
  /** Rozet metni (ör. "Değerlendirme dışı — LTA"); yoksa `null`. */
  exclusionLabel: string | null;
  /** Tooltip'te gösterilecek tek cümlelik gerekçe; yoksa `null`. */
  exclusionExplanation: string | null;
}

export function resolveRagPresentation(
  ragStatus: RagStatus | string | null | undefined,
  coverageRatio: number | string | null | undefined,
  ragExclusionReason?: string | null
): RagPresentation {
  const status: RagStatus | null =
    ragStatus === 'RED' || ragStatus === 'AMBER' || ragStatus === 'GREEN'
      ? ragStatus
      : null;
  const ratio = toNumber(coverageRatio ?? null);
  // ⛔ Bir renk varken dışlama OLAMAZ — ikisi aynı anda doluysa taşıyıcı
  // tutarsızdır; sunum katmanı rengi kazandırır ve dışlamayı yok sayar
  // (uydurma bir üçüncü hâl üretmez).
  const reason = status === null ? asExclusionReason(ragExclusionReason) : null;
  return {
    ragStatus: status,
    coverageRatio: ratio,
    isFullCoverage: status !== null,
    isNeverCalculated: status === null && ratio === null && reason === null,
    isExcluded: reason !== null,
    exclusionReason: reason,
    exclusionLabel: reason === null ? null : EXCLUSION_BADGES[reason],
    exclusionExplanation:
      reason === null ? null : EXCLUSION_EXPLANATIONS[reason],
  };
}

/**
 * `K-2.4.22b`: "kapsama oranı" etiketi (ör. `%2 kapsama`).
 * Oranın kendisi bilinmiyorsa (hiç hesaplanmadı) `null` döner — `%NaN` değil.
 */
export function formatCoverageLabel(
  coverageRatio: number | null | undefined
): string | null {
  if (coverageRatio === null || coverageRatio === undefined) return null;
  return `%${Math.round(coverageRatio * 100)} kapsama`;
}

/** `K-2.4.22a`: hiç hesaplanmamış durum için nötr metin — bir risk yargısı değil. */
export const RAG_NOT_CALCULATED_LABEL = 'Hesaplanmadı';
