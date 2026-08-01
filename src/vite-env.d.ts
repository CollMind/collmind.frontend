/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_BASE_URL: string;
  readonly VITE_APP_NAME: string;
  readonly VITE_APP_VERSION: string;
  /**
   * T-046d — ADR 0003 "<500ms" (input change -> UI update) uyarı eşiği,
   * ms. Backend'in `PERF_RECALC_WARN_MS` (`ConfigService`) deseniyle
   * simetrik: hardcode edilmez, eşik aşımı yalnızca `console.warn` üretir,
   * hiçbir akışı iptal etmez. Ayarlanmazsa 500ms varsayılan
   * (`performanceMonitor.ts` içindeki `DEFAULT_RECALC_WARN_MS`).
   */
  readonly VITE_PERF_RECALC_WARN_MS?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
