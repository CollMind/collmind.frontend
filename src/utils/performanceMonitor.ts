/**
 * T-046d (docs/analysis/0007-recalc-scale-telemetry.md §4-T3, ADR 0003).
 *
 * ADR 0003 (ürün sahibi kararı): BRD NFR-1.2 "< 500ms" = "Time from input
 * change to UI update" — yani hücre düzenlemesinden güncellenmiş KPI'ların
 * EKRANDA GÖRÜNMESİNE kadar geçen süre. Bu dosyadan önce bu metrik hiç
 * ölçülmüyordu; backend ölçümleri (T-046a/T-046b) ağ + render'ı kapsamaz,
 * yani her zaman alt sınırdır (bkz. 0007 §1.1).
 *
 * Referans tasarım: `.cursor/KPI_Details.docx` "PERFORMANCE MONITORING" —
 * `utils/performanceMonitor.ts`, `PerformanceMonitor` sınıfı, `startMeasure`
 * / `getStats` / eşik aşımında `console.warn`. Bu dosya o deseni birebir
 * uygular ve CollMind'e özgü recalc kırılımı (backend/diğer ayrımı,
 * `X-Recalc-Ms` / `X-Recalc-Sku-Count` başlıkları — T-046b) ile genişletir.
 *
 * Tasarım kararları (bkz. task dosyası T-046d, "Peşinen uyardığım tuzaklar"):
 * 1. Ölçüm noktası: `startCellEditMeasurement()` KULLANICI etkileşiminden
 *    (mutation.mutate() çağrılmadan hemen önce) başlar; `afterPaint()` React
 *    commit + browser paint'in ikisini de bekleyen çift-rAF kullanır — "state
 *    güncellendi" ile "ekranda göründü" arasındaki farkı kapatmak için.
 * 2. Overhead: `performance.now()` çağrıları ucuzdur; metrik geçmişi
 *    label başına sabit boyutlu bir halka tampon (`MAX_SAMPLES_PER_LABEL`)
 *    ile sınırlanır — grid'de sık tetiklenen recalc'larda sınırsız büyümez.
 * 3. Eşik hardcode edilmez: `VITE_PERF_RECALC_WARN_MS` (Vite env), backend'in
 *    `PERF_RECALC_WARN_MS` (`ConfigService`) deseniyle simetrik. Varsayılan
 *    500ms (ADR 0003 ile aynı sayı ama KONFİGÜRE EDİLEBİLİR — RAG eşiği
 *    değildir, KPI config'e girmez).
 * 4. Eşik aşımında yalnızca `console.warn` — hiçbir akış iptal edilmez,
 *    hiçbir işlem timeout'a uğratılmaz (BRD FR-3.2/FR-3.3 doğruluk şartı,
 *    bkz. 0007 §4-T1'in aynı kararı).
 */

const DEFAULT_RECALC_WARN_MS = 500;
const MAX_SAMPLES_PER_LABEL = 200;

/** Backend'in (T-046b) recalc tetikleyen 4 endpoint'e eklediği başlıklar. */
export const RECALC_MS_HEADER = 'x-recalc-ms';
export const RECALC_SKU_COUNT_HEADER = 'x-recalc-sku-count';

export interface RecalcBreakdown {
  /** Backend'in `X-Recalc-Ms` başlığından — yalnız recalc'ın kendi süresi. */
  backendMs: number | null;
  /** Backend'in `X-Recalc-Sku-Count` başlığından. */
  skuCount: number | null;
}

export interface RecalcMeasurement extends RecalcBreakdown {
  label: string;
  /** Kullanıcı etkileşiminden (mutate çağrısından) boyanmış UI'a kadar. */
  totalMs: number;
  /**
   * `totalMs - backendMs` — PATCH ağ RTT'si + (invalidateQueries'in tetiklediği
   * GET refetch'in ağ+DB süresi) + React commit + paint'in TAMAMI. `backendMs`
   * null ise (başlık okunamadıysa, örn. CORS `Access-Control-Expose-Headers`
   * eksikliği — bkz. dosya sonu notu) bu alan da null'dur; UYDURULMAZ.
   */
  otherMs: number | null;
  thresholdMs: number;
  exceededThreshold: boolean;
  timestamp: number;
}

/**
 * BRD referans deseni (`KPI_Details.docx`): generic ölçüm sınıfı.
 * `startMeasure` etiket başına süre biriktirir, `getStats`/`logAllStats`
 * BRD'nin kendi imzasıyla aynı (`avg`/`min`/`max`/`count`).
 */
export class PerformanceMonitor {
  private metrics: Map<string, number[]> = new Map();

  startMeasure(label: string, thresholdMs: number = DEFAULT_RECALC_WARN_MS): () => number {
    const startTime = performance.now();
    return () => {
      const endTime = performance.now();
      const duration = endTime - startTime;
      this.record(label, duration);
      if (duration > thresholdMs) {
        console.warn(`⚠️ Slow operation: ${label} took ${duration.toFixed(2)}ms`);
      } else {
        console.log(`⏱️ ${label}: ${duration.toFixed(2)}ms`);
      }
      return duration;
    };
  }

  record(label: string, durationMs: number): void {
    const existing = this.metrics.get(label) ?? [];
    existing.push(durationMs);
    // Tuzak #2 (task): ölçüm kendisi grid'i yavaşlatmasın — halka tampon,
    // sınırsız büyümez.
    if (existing.length > MAX_SAMPLES_PER_LABEL) {
      existing.splice(0, existing.length - MAX_SAMPLES_PER_LABEL);
    }
    this.metrics.set(label, existing);
  }

  getStats(
    label: string
  ): { avg: number; min: number; max: number; count: number } | null {
    const values = this.metrics.get(label) ?? [];
    if (values.length === 0) return null;

    const sum = values.reduce((a, b) => a + b, 0);
    const avg = sum / values.length;
    const min = Math.min(...values);
    const max = Math.max(...values);

    return { avg, min, max, count: values.length };
  }

  logAllStats(): void {
    console.table(
      Array.from(this.metrics.keys()).map((label) => ({
        operation: label,
        ...this.getStats(label),
      }))
    );
  }

  /** Test/temizlik amaçlı — üretimde kullanılmaz. */
  clear(label?: string): void {
    if (label) {
      this.metrics.delete(label);
    } else {
      this.metrics.clear();
    }
  }
}

export const perfMonitor = new PerformanceMonitor();

/**
 * Eşik KONFİGÜRASYONDAN okunur, hardcode edilmez (backend'in
 * `PERF_RECALC_WARN_MS` deseniyle simetrik — bkz. dosya başı notu).
 */
export function getRecalcWarnThresholdMs(): number {
  const raw = import.meta.env.VITE_PERF_RECALC_WARN_MS;
  const parsed = raw !== undefined ? Number(raw) : NaN;
  return Number.isFinite(parsed) && parsed > 0 ? parsed : DEFAULT_RECALC_WARN_MS;
}

/**
 * Backend'in `X-Recalc-Ms` / `X-Recalc-Sku-Count` başlıklarını axios yanıt
 * başlıklarından çıkarır. `unknown` alır çünkü axios'un
 * `AxiosResponseHeaders` tipi sürüme göre değişir (bkz. `AxiosHeaders` sınıf
 * karışımı) — burada tek ihtiyacımız olan alt-küme index erişimi, `any`
 * kullanmadan bir kayıt tipine daraltılır. Başlık yoksa (recalc
 * tetiklenmediyse, VEYA — bilinen risk, bkz. dosya sonu notu — CORS
 * `Access-Control-Expose-Headers` eksikse) `null` döner; UYDURULMAZ.
 */
export function extractRecalcHeaders(headers: unknown): RecalcBreakdown {
  const bag = (headers ?? {}) as Record<string, string | number | undefined>;
  const msRaw = bag[RECALC_MS_HEADER];
  const skuRaw = bag[RECALC_SKU_COUNT_HEADER];
  const backendMs = msRaw !== undefined ? Number(msRaw) : NaN;
  const skuCount = skuRaw !== undefined ? Number(skuRaw) : NaN;
  return {
    backendMs: Number.isFinite(backendMs) ? backendMs : null,
    skuCount: Number.isFinite(skuCount) ? skuCount : null,
  };
}

/**
 * React commit'in TAMAMLANDIĞINI değil, TARAYICININ BOYADIĞINI bekler.
 * Tek `requestAnimationFrame` yalnızca "bir sonraki boyama öncesi" çalışır —
 * o an DOM güncel olabilir ama henüz ekrana basılmamış olabilir. Çift rAF,
 * ilk rAF'ın içindeki callback'in bir SONRAKİ frame'de çalışmasını bekleyerek
 * ilk frame'in gerçekten boyandığını garanti eden standart teknik.
 */
export function afterPaint(): Promise<void> {
  return new Promise((resolve) => {
    if (typeof requestAnimationFrame !== 'function') {
      // jsdom / eski ortam fallback'i — testlerde rAF polyfill'i yoksa akışı
      // kilitlememek için mikro-görev kuyruğuna düş.
      Promise.resolve().then(resolve);
      return;
    }
    requestAnimationFrame(() => {
      requestAnimationFrame(() => resolve());
    });
  });
}

/** Hücre düzenleme ölçümünün başlangıcı — kullanıcının değeri COMMIT ettiği an. */
export function startCellEditMeasurement(): number {
  return performance.now();
}

/**
 * Ölçümü tamamlar: toplam süre + backend kırılımı + eşik aşım kaydı.
 * Çağıran, `afterPaint()`'i bekledikten SONRA bunu çağırmalı — aksi halde
 * "UI update" değil "mutation yanıtı" ölçülür (tuzak #1, task dosyası).
 */
export function recordCellEditMeasurement(params: {
  label: string;
  startTimestamp: number;
  backendMs: number | null;
  skuCount: number | null;
}): RecalcMeasurement {
  const totalMs = performance.now() - params.startTimestamp;
  const thresholdMs = getRecalcWarnThresholdMs();
  const exceededThreshold = totalMs > thresholdMs;
  const otherMs = params.backendMs !== null ? totalMs - params.backendMs : null;

  perfMonitor.record(params.label, totalMs);

  const measurement: RecalcMeasurement = {
    label: params.label,
    totalMs,
    backendMs: params.backendMs,
    otherMs,
    skuCount: params.skuCount,
    thresholdMs,
    exceededThreshold,
    timestamp: Date.now(),
  };

  if (exceededThreshold) {
    console.warn(
      `⚠️ Slow recalc: ${params.label} took ${totalMs.toFixed(2)}ms ` +
        `(threshold ${thresholdMs}ms, backend ${
          params.backendMs !== null ? `${params.backendMs.toFixed(2)}ms` : 'n/a'
        }, sku count ${params.skuCount ?? 'n/a'})`
    );
  } else {
    console.log(
      `⏱️ ${params.label}: ${totalMs.toFixed(2)}ms ` +
        `(backend ${
          params.backendMs !== null ? `${params.backendMs.toFixed(2)}ms` : 'n/a'
        })`
    );
  }

  return measurement;
}

/**
 * BİLİNEN RİSK (uygulama sırasında bulundu, backend'e dokunulmadığı için
 * düzeltilmedi — bkz. T-046d raporu):
 *
 * Frontend (localhost:5173) ile backend (localhost:3000/8080) farklı origin.
 * Backend `main.ts` `app.enableCors({ allowedHeaders: [...] })` çağırıyor
 * ama `exposedHeaders` AYARLAMIYOR. Fetch/XHR standardına göre, CORS'lu bir
 * yanıtta `Access-Control-Expose-Headers` ile açıkça izin verilmeyen özel
 * başlıklar (yalnızca "simple response header" listesi hariç — ki
 * `X-Recalc-Ms` bunda değil) tarayıcı JS'ine GÖRÜNMEZ; `response.headers`
 * içinde bulunmaz. Yani bugünkü backend konfigürasyonuyla, GERÇEK bir
 * tarayıcıda çalışan bu kod `extractRecalcHeaders` çağrısında muhtemelen
 * `{ backendMs: null, skuCount: null }` alacaktır — Vitest/MSW ortamı bu
 * kısıtlamayı uygulamadığı için testlerde görünmez.
 *
 * Bu dosya bunu KIRILMADAN ele alır (null → "n/a", uydurma yok) ama kırılım
 * ancak backend `exposedHeaders: [RECALC_MS_HEADER, RECALC_SKU_COUNT_HEADER]`
 * eklerse gerçek tarayıcıda çalışır. Backend'e dokunulmadı (görev kapsamı
 * dışı) — bu, ölçüm raporunda ayrı bir bulgu olarak işaretlendi.
 */
