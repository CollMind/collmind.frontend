import { configDefaults, defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    // T-016: tests/e2e/**/*.spec.ts are Playwright specs (import `test`/
    // `expect` from '@playwright/test', run via `npm run test:e2e`, not
    // Vitest). Vitest's default include glob (`**/*.spec.ts`) would
    // otherwise sweep them into this unit suite too and fail immediately
    // on the incompatible `test`/`expect` globals.
    exclude: [...configDefaults.exclude, 'tests/e2e/**'],
    // jsdom's default document URL is 'about:blank' (empty href, no
    // origin). axios resolves request URLs against window.location.href as
    // a base, and react-router's <Navigate>/useRoutes read
    // window.location.origin — both break without a real URL here. See the
    // long comment in tests/setup.ts (T-040) for what went wrong when this
    // was instead patched by deleting/replacing `window.location` at
    // runtime (a react-router infinite-navigation hang, among other things).
    environmentOptions: {
      jsdom: {
        url: 'http://localhost:3000/',
      },
    },
    setupFiles: ['./tests/setup.ts'],
    css: true,
    // A full `vitest run` reliably OOM'd ("JavaScript heap out of memory")
    // partway through the suite under the default 'threads' pool — memory
    // (jsdom windows / Radix portals / React trees) accumulates across test
    // files within a shared worker heap faster than V8's default old-space
    // limit allows for a suite this size. Using separate OS-process forks
    // gives each worker its own heap, and raising the per-fork heap ceiling
    // gives enough headroom to run the whole suite without crashing (see
    // T-040).
    pool: 'forks',
    poolOptions: {
      forks: {
        execArgv: ['--max-old-space-size=4096'],
        // T-353: bound the fan-out. Vitest's default for the forks pool is
        // `availableParallelism() - 1`, i.e. 7 forked node processes on this
        // 8-core / 8 GB machine, each carrying its own jsdom window. Measured:
        // a single `vitest run` already peaks at ~1.2 GB RSS across 9
        // processes with ~1.2 GB free and ~4.5 GB already swapped. The suite
        // is memory-bound, not CPU-bound, so that fan-out buys almost nothing
        // (capping to 3 costs ~14%: 20.1s -> 22.9s idle) while making the run
        // fall over as soon as anything else runs beside it.
        //
        // What that looked like before the cap (all measured, T-353):
        //
        //   idle, 5 consecutive runs   19-24s    606/606 green, 5/5
        //   +24 CPU hogs (4x oversub)  52s       606/606 green
        //   2 concurrent `vitest run`  113-137s  5 failed / 606
        //   3 concurrent `vitest run`  263s      18-22 failed, set varies
        //
        // Note the third row against the second: 24 busy loops add *more*
        // runnable threads than a second suite does, yet stay green. The
        // trigger is not CPU dilation, it is memory pressure — a second run
        // doubles the process count to 18 and drives swap up by ~1.1 GB, and
        // the resulting multi-second stalls blow the two wall-clock budgets
        // in this suite: RTL's default `asyncUtilTimeout` (1000ms, symptom
        // "expected false to be true" with a wait-for.js frame) and vitest's
        // default `testTimeout` (5000ms). The tests that fail are simply the
        // top of the idle duration distribution, which is why the failing set
        // changed from run to run and was never reproducible in isolation.
        //
        // This is deliberately NOT fixed by raising those budgets. Raising
        // them was run as a *diagnostic* (120s test / 60s waitFor under
        // identical 3x contention) purely to rule out a product race: every
        // assertion failure disappeared, leaving only vitest's own worker RPC
        // timeout. So there is no race here — but a longer timeout would only
        // have hidden the stalls, not removed them.
        //
        // With the cap, against the same reproduction:
        //
        //   2 concurrent runs          60s       606/606 green, both
        //   3 concurrent runs          86s       606/606 green, all three
        //
        // Note it is also ~3x *faster* under contention than the uncapped
        // run it replaces (263s -> 86s at 3x) — the classic thrashing
        // signature, where less parallelism yields more throughput.
        maxForks: 3,
        minForks: 1,
      },
    },
  },
  resolve: {
    alias: [
      // More specific alias must come first: Vite matches alias entries in
      // order and treats them as string prefixes, so with '@' listed before
      // '@/tests' every '@/tests/...' import was being resolved against
      // '@' (-> src/tests/...) instead of the intended './tests' root,
      // causing "Failed to resolve import" for every test file that used
      // '@/tests/utils/test-utils' (see T-040).
      { find: '@/tests', replacement: path.resolve(__dirname, './tests') },
      { find: '@', replacement: path.resolve(__dirname, './src') },
    ],
  },
});

