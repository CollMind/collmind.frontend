import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

// T-353 — the suite's own fan-out must stay bounded.
//
// Measured mechanism (see the long comment in vitest.config.ts): this suite
// is memory-bound, not CPU-bound. Left at vitest's default for the `forks`
// pool (`availableParallelism() - 1`), one `vitest run` spawns 7 forked node
// processes each carrying a jsdom window, which on an 8-core / 8 GB machine
// already peaks at ~1.2 GB RSS with ~1.2 GB free. A second concurrent run —
// the normal operating condition of this repo, where agents are launched in
// parallel (CLAUDE.md §4) — doubles that to 18 processes, drives swap up by
// ~1.1 GB, and the resulting multi-second stalls blow the two wall-clock
// budgets in the suite (RTL `asyncUtilTimeout` 1000ms, vitest `testTimeout`
// 5000ms). Result: 5 failed / 606 at 2x concurrency, 18-22 failed at 3x,
// with the failing set changing from run to run and never reproducible in
// isolation — i.e. the test gate stops being a signal at all.
//
// This guard exists because the cap is a single line that looks like a
// tuning knob and reads as removable. It is not: removing it does not make
// the suite fail loudly, it makes the suite answer differently on every run.
//
// Verified by mutation (T-353): deleting `maxForks` from vitest.config.ts
// turns this test red.
//
// NOTE: the config is read as TEXT, not imported. Importing `vitest.config.ts`
// from inside a jsdom test pulls in `vitest/config` -> esbuild, which refuses
// to load under jsdom ("new TextEncoder().encode('') instanceof Uint8Array is
// incorrectly false"). Comments are stripped before matching so that a
// `maxForks` mentioned in prose cannot satisfy this guard.
describe('vitest fan-out is bounded (T-353)', () => {
  const configPath = resolve(
    dirname(fileURLToPath(import.meta.url)),
    '../../vitest.config.ts'
  );

  const stripComments = (src: string) =>
    src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');

  it('caps maxForks so a concurrent second run cannot thrash the machine', () => {
    const source = stripComments(readFileSync(configPath, 'utf-8'));

    expect(source, "pool must still be 'forks'").toMatch(
      /pool\s*:\s*['"]forks['"]/
    );

    const match = source.match(/maxForks\s*:\s*(\d+)/);
    expect(
      match,
      'maxForks must be set explicitly in vitest.config.ts — the vitest ' +
        'default (availableParallelism() - 1) is what T-353 measured as the cause'
    ).not.toBeNull();

    const maxForks = Number(match![1]);
    expect(maxForks).toBeGreaterThanOrEqual(1);
    expect(
      maxForks,
      'a cap above 4 re-enters the measured thrashing regime on an 8-core box'
    ).toBeLessThanOrEqual(4);
  });
});
