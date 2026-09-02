import { afterEach, beforeAll, afterAll } from 'vitest';
import { cleanup } from '@testing-library/react';

// T-355 — ÇİFT-YÜKLEME KORUMASI (ZORUNLU, §2.5 sessiz sıfır yasağı).
//
// Bir konfigürasyon `vitest.config.ts`'i `mergeConfig` ile genişletip
// `test.setupFiles: ['./tests/setup.ts']` eklerse, `mergeConfig` array
// alanlarını REPLACE değil BİRLEŞTİRİR (concat) — sonuç
// `setupFiles: ['./tests/setup.ts', './tests/setup.ts']`, yani bu dosya
// AYNI çalışan process içinde İKİ KEZ evaluate edilir (ölçüldü, T-355:
// `console.error` ile pid bazlı izlendi — aynı pid'de modül gövdesi iki kez
// çalıştı).
//
// Sonuç sessiz değil, SESSİZCE YANLIŞTIR: her evaluate kendi
// `setupServer(...handlers)` örneğini, kendi `beforeAll`/`afterEach`/
// `afterAll` kancalarını kurar. İkinci `server.listen()` MSW'nin node
// interceptor'ını devraldığı için testin `server.use(...)` ile yaptığı
// override'lar İLK (ve testin import ettiği) `server` nesnesine uygulanır
// ama gerçek isteği KESEN interceptor artık İKİNCİ örneğe ait — override
// hiçbir zaman devreye girmez. Ölçülen belirti: "promise resolved instead
// of rejecting" / bayat (stale) payload, sessizce — hiçbir hata, hiçbir
// uyarı. Reprodüksiyon turunda bu tam olarak 19/120 testi düşürdü (14
// `server.use()` içeren dosya üzerinde; bkz. T-355 QA notu).
//
// Düzeltme: BİR mekanizmanın "belki iki kez çalışır" ihtimaline karşı
// sessizce dayanıklı (idempotent) hâle getirmek YERİNE — ki bu, ikinci
// örneği sessizce yutar ve KENDİSİ yeni bir sessiz-sıfır sınıfı üretirdi —
// bu modülün ASLA iki kez evaluate edilmemesi gerektiğini AÇIKÇA sınıyoruz.
// İkinci evaluate anında process'i loud bir hata ile durdurmak, "her testte
// 1'den fazla server.use() override'ı sessizce ölür" sınıfını, "config
// yanlış, hemen düzelt" sınıfına indirger.
declare global {
  // eslint-disable-next-line no-var
  var __COLLMIND_TESTS_SETUP_LOADED__: boolean | undefined;
}

if (globalThis.__COLLMIND_TESTS_SETUP_LOADED__) {
  throw new Error(
    'tests/setup.ts AYNI vitest process içinde İKİNCİ KEZ yükleniyor (T-355). ' +
      'Bunun tek bilinen sebebi: bir konfigürasyon vitest.config.ts\'i ' +
      '`mergeConfig` ile genişletip `test.setupFiles: ["./tests/setup.ts"]` ' +
      'ekliyor — mergeConfig array alanlarını REPLACE değil BİRLEŞTİRİR, ' +
      'sonuç setupFiles dizisinde bu dosya iki kez geçer. Çift yükleme iki ayrı ' +
      'MSW server örneği kurar; ikinci server.listen() interceptor\'ı devralır ' +
      've testlerin server.use() override\'ları SESSİZCE etkisiz kalır ' +
      '("promise resolved instead of rejecting" / bayat payload). Düzelt: ' +
      'genişleten configde setupFiles\'ı ELLE override et (mergeConfig\'in ' +
      'birleştirdiği sonucu tekilleştir — `[...new Set(merged.test.setupFiles)]` ' +
      '— ya da mergeConfig kullanma).',
  );
}
globalThis.__COLLMIND_TESTS_SETUP_LOADED__ = true;
// `@testing-library/jest-dom/vitest` (not `/matchers`) does two things the
// previous `import * as matchers from '.../matchers'; expect.extend(matchers)`
// pair only did the first of: (1) the runtime `expect.extend` call, and
// (2) a `declare module 'vitest' { interface Assertion ... }` augmentation
// that teaches `tsc` about `toBeInTheDocument`/`toHaveValue`/etc. Without (2),
// every jest-dom matcher call was a type error under `tsc` — invisible while
// `tests/` sat outside tsconfig's `include` (T-116), and the majority
// contributor once it was added in: measured, 173 of 210 `tests/` errors
// were exactly this (`error TS2339: Property 'toBeInTheDocument' does not
// exist on type 'Assertion<...>'`).
import '@testing-library/jest-dom/vitest';
import { setupServer } from 'msw/node';
import { handlers } from './mocks/handlers';

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};

  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => {
      store[key] = value.toString();
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    },
  };
})();

const sessionStorageMock = (() => {
  let store: Record<string, string> = {};

  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => {
      store[key] = value.toString();
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    },
  };
})();

// Setup localStorage and sessionStorage mocks
Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
});

Object.defineProperty(window, 'sessionStorage', {
  value: sessionStorageMock,
});

// jsdom does not implement ResizeObserver. Several Radix UI primitives
// (e.g. Checkbox, used inside LoginForm/CookiePreferencesModal) call it on
// mount, so without a stub every test rendering those components crashed
// with "ReferenceError: ResizeObserver is not defined" (see T-040).
class ResizeObserverMock {
  observe() {}
  unobserve() {}
  disconnect() {}
}
(global as any).ResizeObserver = ResizeObserverMock;

// jsdom does not implement the Pointer Events capture API or scrollIntoView.
// Radix UI's Select/Dropdown/Popover primitives call these during pointer
// interactions (e.g. selecting an option), so without stubs any test that
// exercises those components crashes with
// "target.hasPointerCapture is not a function" (see T-040).
if (!Element.prototype.hasPointerCapture) {
  Element.prototype.hasPointerCapture = () => false;
}
if (!Element.prototype.setPointerCapture) {
  Element.prototype.setPointerCapture = () => {};
}
if (!Element.prototype.releasePointerCapture) {
  Element.prototype.releasePointerCapture = () => {};
}
if (!Element.prototype.scrollIntoView) {
  Element.prototype.scrollIntoView = () => {};
}

// NOTE on window.location (see T-040):
//
// jsdom's XHR/fetch implementation (used under the hood by axios) resolves
// relative/absolute request URLs against `window.location.href` as the
// "base URL". This project's default jsdom document has an empty base URL
// (`about:blank`), which is not parseable as a base, so every axios request
// in tests used to fail with `Invalid base URL: ` regardless of the
// request's own URL — masquerading as a network error in every test that
// exercised `apiClient`.
//
// The fix for that must NOT replace `window.location` with a hand-rolled
// stub object: react-router's internals (`useRoutes`/`encodeLocation`,
// `<Navigate>`) read `window.location.origin` and other standard `Location`
// properties our earlier stub didn't provide, and jsdom's own XHR base-URL
// resolution needs the real `Location` object too. A stub missing `origin`
// caused `useRoutes` to throw outright, and in simpler cases (bare
// `<Navigate>` without a `<Routes>` tree — exactly how
// tests/components/layout/ProtectedRoute.test.tsx renders it) it caused an
// actual infinite re-render/navigation loop that hung the whole worker
// process indefinitely (reproduced consistently; see T-040 report).
//
// The correct fix is to give jsdom a real, valid document URL up front (via
// `test.environmentOptions.jsdom.url` in vitest.config.ts) so the *native*
// `window.location` already has a valid `href`/`origin`/etc., instead of
// deleting and replacing it here.

// Setup MSW server
export const server = setupServer(...handlers);

// Establish API mocking before all tests
beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));

// Reset handlers and storage after each test
afterEach(() => {
  cleanup();
  server.resetHandlers();
  localStorageMock.clear();
  sessionStorageMock.clear();

  // Defensive DOM reset. Radix UI portals (Select/Dialog/DropdownMenu)
  // append nodes directly to `document.body` and toggle
  // `document.body.style.pointerEvents` while open. RTL's cleanup()
  // unmounts React roots but does not guarantee every such side effect
  // unwound cleanly, especially for tests that close a Radix popover via
  // fireEvent instead of a full pointer/keyboard interaction sequence.
  // Left unreset, these accumulate silently across dozens of test files in
  // the same worker and were the leading suspect for an intermittent full
  // suite hang (see T-040) — clearing them here is a low-risk safety net.
  document.body.innerHTML = '';
  document.body.removeAttribute('style');
});

// Clean up after all tests
afterAll(() => server.close());

