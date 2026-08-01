import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  PerformanceMonitor,
  perfMonitor,
  getRecalcWarnThresholdMs,
  extractRecalcHeaders,
  afterPaint,
  startCellEditMeasurement,
  recordCellEditMeasurement,
  RECALC_MS_HEADER,
  RECALC_SKU_COUNT_HEADER,
} from '@/utils/performanceMonitor';

// T-046d — ADR 0003 metriğinin (input change -> UI update) ölçüm
// altyapısı. Task talimatı: "Testlerde SÜREYE assert etme" — bu dosyadaki
// hiçbir test gerçek duvar-saati süresine bağlı değildir. `performance.now`
// deterministik olarak mock'lanır (kontrollü girdi, gerçek zamanlama değil)
// ve assert'ler DAVRANIŞ üzerinedir: ölçüm tetiklendi mi, kırılım doğru
// hesaplandı mı, eşik konfigürasyondan mı okundu, aşımda ne olduu (yalnız
// log, akış kesilmiyor).

describe('getRecalcWarnThresholdMs', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('defaults to 500ms when VITE_PERF_RECALC_WARN_MS is not set', () => {
    vi.stubEnv('VITE_PERF_RECALC_WARN_MS', '');
    // Boş string de "ayarlanmamış" gibi ele alınmalı (Number('') === 0, ki
    // 0 > 0 değil, geçersiz — varsayılana düşer).
    expect(getRecalcWarnThresholdMs()).toBe(500);
  });

  it('reads the threshold from config, not hardcoded', () => {
    vi.stubEnv('VITE_PERF_RECALC_WARN_MS', '750');
    expect(getRecalcWarnThresholdMs()).toBe(750);
  });

  it('falls back to the default for a non-numeric or non-positive override', () => {
    vi.stubEnv('VITE_PERF_RECALC_WARN_MS', 'not-a-number');
    expect(getRecalcWarnThresholdMs()).toBe(500);

    vi.stubEnv('VITE_PERF_RECALC_WARN_MS', '-100');
    expect(getRecalcWarnThresholdMs()).toBe(500);

    vi.stubEnv('VITE_PERF_RECALC_WARN_MS', '0');
    expect(getRecalcWarnThresholdMs()).toBe(500);
  });
});

describe('extractRecalcHeaders', () => {
  it('parses X-Recalc-Ms and X-Recalc-Sku-Count when present (axios lower-cases header keys)', () => {
    const result = extractRecalcHeaders({
      [RECALC_MS_HEADER]: '123.45',
      [RECALC_SKU_COUNT_HEADER]: '52',
    });
    expect(result).toEqual({ backendMs: 123.45, skuCount: 52 });
  });

  it('returns nulls (does not fabricate a value) when headers are missing', () => {
    // T-046d bilinen risk notu: backend `exposedHeaders` ayarlamıyor, bu
    // yüzden gerçek tarayıcıda bu, CORS nedeniyle de olabilir. Fonksiyon her
    // durumda uydurmadan null döner.
    expect(extractRecalcHeaders({})).toEqual({ backendMs: null, skuCount: null });
    expect(extractRecalcHeaders(undefined)).toEqual({ backendMs: null, skuCount: null });
    expect(extractRecalcHeaders(null)).toEqual({ backendMs: null, skuCount: null });
  });

  it('returns null for a non-numeric header value rather than NaN', () => {
    const result = extractRecalcHeaders({ [RECALC_MS_HEADER]: 'not-a-number' });
    expect(result.backendMs).toBeNull();
    expect(Number.isNaN(result.backendMs as unknown as number)).toBe(false);
  });
});

describe('afterPaint', () => {
  it('waits for two animation frames when requestAnimationFrame is available', async () => {
    const calls: FrameRequestCallback[] = [];
    const raf = vi.fn((cb: FrameRequestCallback) => {
      calls.push(cb);
      return calls.length;
    });
    vi.stubGlobal('requestAnimationFrame', raf);

    let resolved = false;
    const promise = afterPaint().then(() => {
      resolved = true;
    });

    // First rAF scheduled synchronously by afterPaint().
    expect(raf).toHaveBeenCalledTimes(1);
    expect(resolved).toBe(false);

    // Fire the first frame -> afterPaint schedules the second rAF.
    calls[0](0);
    expect(raf).toHaveBeenCalledTimes(2);
    expect(resolved).toBe(false);

    // Fire the second frame -> afterPaint resolves (this is "painted").
    calls[1](0);
    await promise;
    expect(resolved).toBe(true);

    vi.unstubAllGlobals();
  });

  it('falls back to a microtask when requestAnimationFrame is unavailable', async () => {
    vi.stubGlobal('requestAnimationFrame', undefined);
    await expect(afterPaint()).resolves.toBeUndefined();
    vi.unstubAllGlobals();
  });
});

describe('startCellEditMeasurement / recordCellEditMeasurement', () => {
  let nowSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    perfMonitor.clear();
    vi.unstubAllEnvs();
    nowSpy = vi.spyOn(performance, 'now');
  });

  afterEach(() => {
    nowSpy.mockRestore();
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });

  it('measures elapsed time from the user commit to the recorded end point (deterministic clock)', () => {
    nowSpy.mockReturnValueOnce(1_000); // startCellEditMeasurement()
    const start = startCellEditMeasurement();
    expect(start).toBe(1_000);

    nowSpy.mockReturnValueOnce(1_150); // recordCellEditMeasurement()'s internal now()
    const measurement = recordCellEditMeasurement({
      label: 'sku-volume-update',
      startTimestamp: start,
      backendMs: 92,
      skuCount: 52,
    });

    expect(measurement.totalMs).toBe(150);
    expect(measurement.backendMs).toBe(92);
    expect(measurement.otherMs).toBeCloseTo(58, 5); // network + refetch + render/paint
    expect(measurement.skuCount).toBe(52);
    expect(measurement.exceededThreshold).toBe(false);
    expect(measurement.thresholdMs).toBe(500);
  });

  it('flags exceededThreshold when total time exceeds the configured threshold and warns (does not throw/block)', () => {
    vi.stubEnv('VITE_PERF_RECALC_WARN_MS', '300');
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

    nowSpy.mockReturnValueOnce(2_000);
    const start = startCellEditMeasurement();
    nowSpy.mockReturnValueOnce(2_467); // T-046a S3 tactic-var-benzeri büyüklük

    const measurement = recordCellEditMeasurement({
      label: 'fu-tactic-update',
      startTimestamp: start,
      backendMs: 370,
      skuCount: 500,
    });

    expect(measurement.exceededThreshold).toBe(true);
    expect(measurement.thresholdMs).toBe(300);
    expect(warnSpy).toHaveBeenCalledTimes(1);
    expect(logSpy).not.toHaveBeenCalled();

    warnSpy.mockRestore();
    logSpy.mockRestore();
  });

  it('logs (not warns) and never throws when within threshold', () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

    nowSpy.mockReturnValueOnce(0);
    const start = startCellEditMeasurement();
    nowSpy.mockReturnValueOnce(120);

    expect(() =>
      recordCellEditMeasurement({
        label: 'sku-volume-update',
        startTimestamp: start,
        backendMs: null,
        skuCount: null,
      })
    ).not.toThrow();

    expect(warnSpy).not.toHaveBeenCalled();
    expect(logSpy).toHaveBeenCalledTimes(1);

    warnSpy.mockRestore();
    logSpy.mockRestore();
  });

  it('reports otherMs as null (never fabricated) when the backend breakdown is unavailable', () => {
    nowSpy.mockReturnValueOnce(0);
    const start = startCellEditMeasurement();
    nowSpy.mockReturnValueOnce(300);

    const measurement = recordCellEditMeasurement({
      label: 'sku-volume-update',
      startTimestamp: start,
      backendMs: null,
      skuCount: null,
    });

    expect(measurement.backendMs).toBeNull();
    expect(measurement.otherMs).toBeNull();
  });

  it('feeds every measurement into perfMonitor so getStats reflects it', () => {
    nowSpy.mockReturnValueOnce(0);
    const start1 = startCellEditMeasurement();
    nowSpy.mockReturnValueOnce(100);
    recordCellEditMeasurement({
      label: 'sku-volume-update',
      startTimestamp: start1,
      backendMs: 50,
      skuCount: 10,
    });

    nowSpy.mockReturnValueOnce(200);
    const start2 = startCellEditMeasurement();
    nowSpy.mockReturnValueOnce(400);
    recordCellEditMeasurement({
      label: 'sku-volume-update',
      startTimestamp: start2,
      backendMs: 60,
      skuCount: 10,
    });

    const stats = perfMonitor.getStats('sku-volume-update');
    expect(stats).not.toBeNull();
    expect(stats?.count).toBe(2);
    expect(stats?.min).toBe(100);
    expect(stats?.max).toBe(200);
    expect(stats?.avg).toBe(150);
  });
});

describe('PerformanceMonitor (BRD reference class)', () => {
  it('startMeasure records a duration retrievable via getStats', () => {
    const monitor = new PerformanceMonitor();
    const nowSpy = vi.spyOn(performance, 'now');
    nowSpy.mockReturnValueOnce(0).mockReturnValueOnce(42);

    const end = monitor.startMeasure('calculateSKU');
    const duration = end();

    expect(duration).toBe(42);
    expect(monitor.getStats('calculateSKU')).toEqual({
      avg: 42,
      min: 42,
      max: 42,
      count: 1,
    });

    nowSpy.mockRestore();
  });

  it('returns null stats for a label with no samples', () => {
    const monitor = new PerformanceMonitor();
    expect(monitor.getStats('never-measured')).toBeNull();
  });

  it('caps stored samples per label so overhead does not grow unbounded (tuzak #2)', () => {
    const monitor = new PerformanceMonitor();
    for (let i = 0; i < 250; i++) {
      monitor.record('sku-volume-update', i);
    }
    const stats = monitor.getStats('sku-volume-update');
    expect(stats?.count).toBe(200);
    // Ring buffer -> keeps the most recent samples (50..249).
    expect(stats?.min).toBe(50);
    expect(stats?.max).toBe(249);
  });

  it('logAllStats does not throw with mixed populated/empty labels', () => {
    const monitor = new PerformanceMonitor();
    monitor.record('a', 10);
    const tableSpy = vi.spyOn(console, 'table').mockImplementation(() => {});
    expect(() => monitor.logAllStats()).not.toThrow();
    expect(tableSpy).toHaveBeenCalledTimes(1);
    tableSpy.mockRestore();
  });

  it('clear() resets a single label or everything', () => {
    const monitor = new PerformanceMonitor();
    monitor.record('a', 1);
    monitor.record('b', 2);
    monitor.clear('a');
    expect(monitor.getStats('a')).toBeNull();
    expect(monitor.getStats('b')).not.toBeNull();

    monitor.clear();
    expect(monitor.getStats('b')).toBeNull();
  });
});
