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

