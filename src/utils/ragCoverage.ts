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

export interface RagPresentation {
  /** Gerçek bir renk — yalnız tam kapsamada dolu. */
  ragStatus: RagStatus | null;
  /** 0..1 arası oran; hiç hesaplanmadıysa `null`. */
  coverageRatio: number | null;
  /** `ragStatus !== null` ile eşdeğer — okunabilirlik için. */
  isFullCoverage: boolean;
  /** Ne renk ne oran var — hesaplama hiç çalışmamış. */
  isNeverCalculated: boolean;
}

export function resolveRagPresentation(
  ragStatus: RagStatus | string | null | undefined,
  coverageRatio: number | string | null | undefined
): RagPresentation {
  const status: RagStatus | null =
    ragStatus === 'RED' || ragStatus === 'AMBER' || ragStatus === 'GREEN'
      ? ragStatus
      : null;
  const ratio = toNumber(coverageRatio ?? null);
  return {
    ragStatus: status,
    coverageRatio: ratio,
    isFullCoverage: status !== null,
    isNeverCalculated: status === null && ratio === null,
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
