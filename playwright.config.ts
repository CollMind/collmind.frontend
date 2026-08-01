import { defineConfig, devices } from '@playwright/test';

/**
 * T-016 — Playwright UI E2E config.
 *
 * Scope note (see task): this suite intentionally does NOT re-verify
 * RBAC/state-machine/tenant/budget rules already covered by the backend
 * e2e suite (collmind.backend `npm run test:e2e`, 209 tests). It only
 * covers behaviour that can ONLY be observed through the rendered UI
 * (role-based menu rendering, the 409 conflict dialog, multipart file
 * upload, grid-cell-edit → KPI re-render).
 *
 * `workers: 1` is deliberate, not a performance default: every spec here
 * creates/deletes real rows in the SAME shared dev database used by the
 * backend e2e suite's T-047 row-count invariant (main.plans/plan_fus/
 * plan_skus, main.customers). Running specs in parallel would interleave
 * creates/deletes across workers for no benefit (this suite is small) and
 * makes a failed cleanup harder to attribute to the right spec.
 */
export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: false,
  workers: 1,
  forbidOnly: !!process.env.CI,
  // No retries: a retry that passes on attempt 2 would hide exactly the
  // kind of flake this task was warned against ("keyfi wait YASAK" — see
  // T-016 instructions). A red test must stay red and be diagnosed.
  retries: 0,
  reporter: [['list']],
  timeout: 30_000,
  expect: {
    timeout: 10_000,
  },
  use: {
    baseURL: 'http://localhost:5173',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'off',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  webServer: [
    {
      command: 'npm run dev -- --port 5173 --strictPort',
      url: 'http://localhost:5173',
      reuseExistingServer: true,
      timeout: 60_000,
      stdout: 'pipe',
      stderr: 'pipe',
    },
    {
      command: 'npm run start:dev',
      cwd: '../collmind.backend',
      // NOT /auth/login: Playwright's reuseExistingServer probe only treats
      // a 2xx/3xx GET response as "already up" — a POST-only route (401/404
      // on GET) reads as "not ready" and it spawns a SECOND backend on the
      // same port, which then dies with EADDRINUSE against the one already
      // running (found the hard way in this task — see AppController's bare
      // `GET /` for the only unauthenticated 200 route available).
      url: 'http://localhost:3000/',
      reuseExistingServer: true,
      timeout: 120_000,
      stdout: 'pipe',
      stderr: 'pipe',
    },
  ],
});
