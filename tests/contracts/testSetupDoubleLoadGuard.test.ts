import { describe, it, expect, vi } from 'vitest';
import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

// T-355 — `tests/setup.ts` must refuse to be evaluated twice in the same
// process.
//
// Measured mechanism: a config that extends `vitest.config.ts` with
// `mergeConfig` and adds `test.setupFiles: ['./tests/setup.ts']` ends up
// with `setupFiles: ['./tests/setup.ts', './tests/setup.ts']` — mergeConfig
// concatenates array fields, it does not replace them. Vitest evaluates
// each `setupFiles` entry independently (confirmed with a pid-tagged
// `console.error` in the module body: same pid, two evaluations), so this
// module's top-level side effects — `setupServer(...handlers)` and the
// `beforeAll`/`afterEach`/`afterAll` MSW hooks — run twice. The second
// `server.listen()` takes over MSW's node interceptor, so any test's
// `server.use(...)` override (applied to the *first*, and-imported,
// `server` instance) is silently never consulted by the interceptor that
// actually answers requests.
//
// Reproduced with a throwaway mergeConfig-based config against this exact
// suite (T-355 QA note): 19 of 120 tests across the 14 `server.use()`-using
// files failed with "promise resolved ... instead of rejecting" / stale
// payloads — no error, no warning, just wrong test outcomes.
//
// This guard tests the actual runtime protection, not a re-implementation
// of it: it forces a second evaluation of `tests/setup.ts` (via
// `vi.resetModules()` + a fresh dynamic `import`, which bypasses vitest's
// per-file module cache but NOT the `globalThis` flag the guard relies on —
// the first evaluation already happened via this file's own `setupFiles`
// entry) and asserts that the second evaluation throws loudly instead of
// silently standing up a second MSW server.
//
// Verified by mutation (T-355): deleting the `if (globalThis...) { throw }`
// guard block from `tests/setup.ts` turns this test red with an assertion
// failure (the import resolves instead of rejecting) — not a compile error.
describe('tests/setup.ts refuses to load twice in one process (T-355)', () => {
  it('a second evaluation in the same process throws an explicit T-355 error', async () => {
    vi.resetModules();
    await expect(import('../setup')).rejects.toThrow(
      /setup\.ts AYNI vitest process içinde İKİNCİ KEZ yükleniyor/
    );
  });

  it('the guard lives in tests/setup.ts as a loud throw, not a silent early-return', () => {
    const setupPath = resolve(
      dirname(fileURLToPath(import.meta.url)),
      '../setup.ts'
    );
    const source = readFileSync(setupPath, 'utf-8');

    expect(
      source,
      'guard flag must be stored on globalThis — a module-scope flag would ' +
        'be reset by the very re-evaluation it is meant to catch'
    ).toMatch(/globalThis\.__COLLMIND_TESTS_SETUP_LOADED__/);

    expect(
      source,
      'the second-load branch must throw (§2.5 sessiz sıfır yasağı) — a ' +
        '`return`/no-op here would silently stand up a second MSW server ' +
        'instead of failing loudly'
    ).toMatch(/if\s*\(globalThis\.__COLLMIND_TESTS_SETUP_LOADED__\)\s*\{\s*throw/);
  });
});
