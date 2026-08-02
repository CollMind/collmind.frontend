import { Client } from 'pg';
import * as path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

/**
 * T-051 — deterministic, exact-id hard-delete for Playwright-created plan
 * fixtures.
 *
 * ROOT CAUSE (measured, not assumed — see T-051 task notes): `deleteDraftPlan`
 * (support/api.ts) previously only called the real `DELETE /plans/:id`
 * endpoint. That endpoint SOFT-deletes DRAFT plans (plan.service.ts
 * `delete()` -> `planRepo.softDeleteVersioned`, BRD-correct: keeps the row
 * for audit). The backend e2e suite's T-047 row-count invariant
 * (collmind.backend test/helpers/e2e-row-count.js) DELIBERATELY counts rows
 * INCLUDING soft-deleted ones (that's the whole point of T-047 — a
 * soft-deleted row that never gets physically removed is exactly the leak
 * class it exists to catch). So a Playwright run's fixtures stayed
 * PHYSICALLY present (deleted_at set, `E2E-` prefix intact) after
 * `npx playwright test` exited — measured directly: 12 such rows
 * accumulated across prior same-day runs, still `E2E-%`-matching and
 * present, when queried immediately after a fresh `npx playwright test`
 * run. There was no in-flight-request-dropped-at-webServer-shutdown race;
 * every per-spec `afterAll` had already completed.
 *
 * The two-suite interaction: when `npm run test:e2e` (backend) runs right
 * after, its globalSetup snapshots main.plans BEFORE any test runs — so it
 * counts whatever Playwright fixtures happen to still be lying around. Then,
 * during the run, the backend's OWN `cleanupTestPlans` helper (test/helpers/
 * seed-e2e.ts) hard-deletes ANY row matching `plan_name LIKE 'E2E-%'` for the
 * fixture tenant — a blanket pattern match, not scoped to what that spec
 * file created — which sweeps up the leftover Playwright rows as a side
 * effect. That's why the suite ends at a clean 0 (no PERMANENT leak) but the
 * start/end snapshot legitimately differs: rows present at globalSetup time
 * are gone by globalTeardown time. The invariant is correct to fail — the
 * bug is that Playwright's own cleanup never made its fixtures physically
 * disappear in the first place.
 *
 * FIX: after calling the real DELETE endpoint (kept — it's the only path
 * that runs state-machine/audit/budget-release logic, so we don't skip it),
 * hard-delete the exact row(s) this fixture created, by id, mirroring
 * collmind.backend/test/helpers/seed-e2e.ts `cleanupTestPlans`'s FK order —
 * then verify with a SELECT that the row is actually gone (deterministic,
 * not a sleep/timeout). Scoped to an exact id (not a `LIKE 'E2E-%'` pattern)
 * so a still-running spec's own in-progress fixture in the same DB can never
 * be collaterally deleted by another spec's cleanup.
 */

// __dirname isn't available under Playwright's ESM-ish test transform;
// derive it from import.meta.url instead.
const here = path.dirname(fileURLToPath(import.meta.url));

// Backend owns the DB connection config (.env lives in collmind.backend/,
// not here) — load it explicitly rather than duplicating/hardcoding values
// that could drift from the backend's own e2e-row-count.js.
dotenv.config({ path: path.resolve(here, '../../../../collmind.backend/.env') });

function envOr(key: string, fallback: string): string {
  const v = process.env[key];
  return v === undefined || v === '' ? fallback : v;
}

function schema(): string {
  return envOr('DB_SCHEMA', 'main');
}

async function connect(): Promise<Client> {
  const client = new Client({
    host: envOr('DB_HOST', 'localhost'),
    port: parseInt(envOr('DB_PORT', '5432'), 10),
    user: envOr('DB_USERNAME', 'postgres'),
    password: envOr('DB_PASSWORD', ''),
    database: envOr('DB_DATABASE', ''),
  });
  await client.connect();
  return client;
}

/**
 * Hard-deletes exactly one plan fixture (by id) and its child rows, then
 * verifies the plan row is physically gone. Safe/idempotent to call even if
 * the row was already removed (e.g. by a prior run of this same function,
 * or because the API-level DELETE never even created it).
 */
export async function hardDeletePlanFixture(planId: string): Promise<void> {
  const s = schema();
  const client = await connect();
  try {
    // Same FK order as collmind.backend test/helpers/seed-e2e.ts
    // cleanupTestPlans: budget/audit traces -> plan children -> plan.
    await client.query(
      `DELETE FROM ${s}.budget_transactions WHERE source_type = 'PLAN' AND source_id = $1`,
      [planId],
    );
    await client.query(
      `DELETE FROM ${s}.plan_approval_history WHERE plan_id = $1`,
      [planId],
    );
    await client.query(
      `DELETE FROM ${s}.plan_mechanic_values
        WHERE plan_fu_id IN (SELECT id FROM ${s}.plan_fus WHERE plan_id = $1)`,
      [planId],
    );
    await client.query(
      `DELETE FROM ${s}.plan_skus
        WHERE plan_fu_id IN (SELECT id FROM ${s}.plan_fus WHERE plan_id = $1)`,
      [planId],
    );
    await client.query(`DELETE FROM ${s}.plan_fus WHERE plan_id = $1`, [planId]);
    await client.query(`DELETE FROM ${s}.plans WHERE id = $1`, [planId]);

    // Deterministic verification — not a wait/sleep. If the row is still
    // there, cleanup itself is broken and the test run must fail loudly
    // rather than silently leaving a fixture behind for the next suite.
    const check = await client.query(
      `SELECT 1 FROM ${s}.plans WHERE id = $1`,
      [planId],
    );
    if ((check.rowCount ?? 0) > 0) {
      throw new Error(
        `hardDeletePlanFixture: plan ${planId} still present in ${s}.plans after DELETE — cleanup did not take effect.`,
      );
    }
  } finally {
    await client.end();
  }
}
