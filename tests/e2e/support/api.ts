import { APIRequestContext, request as pwRequest } from '@playwright/test';
import { hardDeletePlanFixture } from './db-cleanup';

/**
 * T-016 — direct backend API helpers for Playwright fixture setup/teardown.
 *
 * Why call the backend directly instead of driving the UI to create fixture
 * data: this is UI E2E, not backend E2E (that's `collmind.backend`'s job,
 * already 209 green tests). Fixture creation here is plumbing, not the
 * thing under test — going through the UI for it would only add flakiness
 * risk to setup/teardown, which is exactly what we were told to avoid.
 *
 * Every plan/customer this file creates uses the 'E2E-' prefix so it is
 * visible to the backend's T-047 row-count invariant if cleanup ever fails
 * to run (afterAll not reached) — never rename away from the prefix before
 * cleanup (see T-047 / T-034b task notes for why that's the leak class).
 */

export const BACKEND_URL = 'http://localhost:3000';

export interface SeedCredentials {
  email: string;
  password: string;
}

export const SEED_USERS = {
  ADMIN: { email: 'admin@wella.com', password: 'Collmind2026!' },
  PLANNER: { email: 'planner@wella.com', password: 'Collmind2026!' },
  CATEGORY_MANAGER: {
    email: 'category.manager@wella.com',
    password: 'Collmind2026!',
  },
  FINANCE_MANAGER: {
    email: 'finance.manager@wella.com',
    password: 'Collmind2026!',
  },
} as const satisfies Record<string, SeedCredentials>;

export interface Session {
  accessToken: string;
  tenantId: string;
  userId: string;
  ctx: APIRequestContext;
}

/** Fresh APIRequestContext per login — avoids sharing cookies/state across roles. */
export async function apiLogin(creds: SeedCredentials): Promise<Session> {
  const ctx = await pwRequest.newContext({ baseURL: BACKEND_URL });
  const res = await ctx.post('/auth/login', { data: creds });
  if (!res.ok()) {
    throw new Error(
      `apiLogin(${creds.email}) failed: ${res.status()} ${await res.text()}`
    );
  }
  const body = await res.json();
  return {
    accessToken: body.accessToken,
    tenantId: body.user.tenantId,
    userId: body.user.id,
    ctx,
  };
}

function authHeaders(session: Session) {
  return { Authorization: `Bearer ${session.accessToken}` };
}

/** Resolves a master-data record's id by its `code`, via the same list GET the UI would use. */
export async function resolveMasterDataId(
  session: Session,
  path: 'master-data/cpls' | 'master-data/channels' | 'master-data/categories',
  code: string
): Promise<string> {
  const res = await session.ctx.get(`/${path}`, {
    headers: authHeaders(session),
  });
  if (!res.ok()) {
    throw new Error(`GET /${path} failed: ${res.status()} ${await res.text()}`);
  }
  const list = await res.json();
  const match = list.find((r: { code: string }) => r.code === code);
  if (!match) {
    throw new Error(
      `resolveMasterDataId: no ${path} row with code='${code}' — is npm run seed up to date?`
    );
  }
  return match.id;
}

export async function firstCplId(session: Session): Promise<string> {
  const res = await session.ctx.get('/master-data/cpls', {
    headers: authHeaders(session),
  });
  const list = await res.json();
  if (!list.length) throw new Error('firstCplId: no CPLs seeded');
  return list[0].id;
}

export interface DraftPlanFixture {
  planId: string;
  /** plan_fus row id (structural — used for FU-level version CAS, e.g. tactics). */
  planFuId: string;
  /** master-data forecasting_units id — this is what the volume PATCH URL takes as `:fuId`, NOT planFuId. */
  fuId: string;
  planSkuId: string;
  skuId: string;
  skuCode: string;
  skuName: string;
}

/**
 * Creates an E2E-prefixed DRAFT plan for the given PLANNER session, adds
 * `FU-E2E-GRID-SINGLE-SKU`, and returns the ids a test needs to poke cells in
 * the UI or replay a conflicting API write.
 *
 * The FU has exactly one SKU on purpose: the grid stays small enough to locate
 * deterministically in the DOM, and the grand-totals assertions downstream have
 * a single row to add up. The seeded product FUs are the opposite — their SKU
 * counts are whatever the catalogue happens to hold and they change without
 * anyone thinking about this file (measured 2026-08-08: `FU-TUP-BOYA` 52,
 * `FU-WELLA-HC-500ML` 3).
 *
 * T-113 moved this OFF the shared `FU-WELLA-HC-500ML` — see the comment at the
 * lookup below for what that cost and why the name now carries the ownership.
 */
export async function createDraftPlanWithSingleSkuFu(
  planner: Session,
  admin: Session,
  namePrefix: string
): Promise<DraftPlanFixture> {
  const [cplId, channelId, categoryId] = await Promise.all([
    firstCplId(admin),
    resolveMasterDataId(admin, 'master-data/channels', 'NKA'),
    resolveMasterDataId(admin, 'master-data/categories', 'HAIR_CARE'),
  ]);

  const planRes = await planner.ctx.post('/plans', {
    headers: authHeaders(planner),
    data: {
      planName: `E2E-${namePrefix}-${Date.now()}`,
      cplId,
      channelId,
      categoryId,
      startDate: '2026-01-05',
      endDate: '2026-01-31',
    },
  });
  if (!planRes.ok()) {
    throw new Error(
      `POST /plans failed: ${planRes.status()} ${await planRes.text()}`
    );
  }
  const plan = await planRes.json();

  // T-113: from here on the plan EXISTS, so every failure path has to remove it.
  //
  // It did not before, and the cost landed on a different suite: when the
  // single-SKU precondition below started failing, `fixture` was never assigned,
  // `afterAll`'s `deleteDraftPlan(planner, fixture.planId)` threw on `undefined`,
  // and the plan stayed in the database. The NEXT backend `npm run test:e2e` then
  // started with `plans=1` and ended with 0, tripping the T-047 row-count
  // invariant — a red gate in a suite that had done nothing wrong.
  //
  // One broken fixture polluting another suite is worth more than the setup error
  // itself: the invariant is doing its job, and the failure it reports points at
  // the wrong place.
  try {
    return await buildFixture();
  } catch (err) {
    // The cleanup error is REPORTED, not swallowed. It looks like noise next to the
    // real failure, but it is the one message that matters most here: the only way
    // `deleteDraftPlan` throws is `hardDeletePlanFixture`'s post-delete check
    // (`tests/e2e/support/db-cleanup.ts:120` — "still present in ${s}.plans after
    // DELETE") — i.e. EXACTLY the leak this block exists to prevent.
    //
    // Dropping it would keep the diagnosis of THIS run and hand the next backend
    // `npm run test:e2e` a T-047 failure with no trace of where the row came from.
    // Logging rather than rethrowing keeps `err` the thrown one, so the setup
    // failure still reads as the cause.
    try {
      await deleteDraftPlan(planner, plan.id);
    } catch (cleanupErr) {
      console.error(
        `createDraftPlanWithSingleSkuFu: setup failed AND cleanup failed — plan ${plan.id} may still be in the database, which will trip the T-047 row-count invariant on the next backend e2e run.`,
        cleanupErr
      );
    }
    throw err;
  }

  async function buildFixture(): Promise<DraftPlanFixture> {
    const skuListRes = await admin.ctx.get('/master-data/forecasting-units', {
      headers: authHeaders(admin),
    });
    const fus = await skuListRes.json();
    // T-113: a FU that BELONGS to this fixture, and whose name says so.
    //
    // This used to point at `FU-WELLA-HC-500ML`. That is a product name — it does not
    // say whose fixture it is, so nobody adding to it knows what they break. On
    // 2026-08-03 another fixture added `SKU-E2E-LUMPSUM-A/B` to it
    // (`collmind.backend/src/database/seeds/agreement.seed.ts:222,226`), the
    // single-SKU precondition below stopped holding, and both grid specs died in
    // setup — silently, in the sense that nobody was looking at e2e for the grid.
    //
    // The name is the guard: adding a SKU to `FU-E2E-GRID-SINGLE-SKU` announces what
    // it costs.
    const FIXTURE_FU_CODE = 'FU-E2E-GRID-SINGLE-SKU';
    const fu = fus.find((f: { code: string }) => f.code === FIXTURE_FU_CODE);
    if (!fu) {
      throw new Error(
        `createDraftPlanWithSingleSkuFu: ${FIXTURE_FU_CODE} not found — is npm run seed up to date?`
      );
    }

    const addFuRes = await planner.ctx.post(`/plans/${plan.id}/fus`, {
      headers: authHeaders(planner),
      data: { fuId: fu.id, planVersion: plan.version },
    });
    if (!addFuRes.ok()) {
      throw new Error(
        `POST /plans/${plan.id}/fus failed: ${addFuRes.status()} ${await addFuRes.text()}`
      );
    }
    const planFu = await addFuRes.json();

    const skusRes = await admin.ctx.get(`/master-data/skus?fuId=${fu.id}`, {
      headers: authHeaders(admin),
    });
    const skus = await skusRes.json();
    if (skus.length !== 1) {
      throw new Error(
        `createDraftPlanWithSingleSkuFu: expected ${FIXTURE_FU_CODE} to have exactly 1 SKU, found ${skus.length} — someone added a SKU to a FU that exists solely for this fixture. Do not relax this check: the grand-totals assertions downstream assume one SKU, and loosening it would make them read a number nobody verified.`
      );
    }
    const sku = skus[0];

    const planDetailRes = await planner.ctx.get(`/plans/${plan.id}`, {
      headers: authHeaders(planner),
    });
    const planDetail = await planDetailRes.json();
    const planSku = planDetail.planFus[0].planSkus.find(
      (s: { skuId: string }) => s.skuId === sku.id
    );

    return {
      planId: plan.id,
      planFuId: planFu.id,
      fuId: fu.id,
      planSkuId: planSku.id,
      skuId: sku.id,
      skuCode: sku.code,
      skuName: sku.name,
    };
  }
}

/**
 * Deletes a DRAFT plan fixture created by this suite.
 *
 * Two steps, both required (see T-051 for why one alone isn't enough):
 *  1. The real `DELETE /plans/:id` endpoint (if the plan still exists) —
 *     this is the only path that runs the app's state-machine/audit-trail/
 *     budget-release logic. It is a SOFT delete (BRD: DRAFT plans keep
 *     their row for audit), so the row stays physically present afterwards.
 *  2. `hardDeletePlanFixture` — physically removes that exact row (and its
 *     children), scoped by id, and verifies it's gone. Without this step
 *     the row survives indefinitely (soft-delete never expires) and
 *     inflates main.plans for whoever runs the backend e2e T-047 row-count
 *     invariant next — that inflation, not a request dropped at webServer
 *     shutdown, was the measured cause of T-051's flake.
 *
 * Step 2 runs unconditionally (even when the plan was already gone / step 1
 * was skipped) so cleanup never depends on the API call succeeding — this
 * is what makes it deterministic rather than best-effort.
 */
export async function deleteDraftPlan(
  planner: Session,
  planId: string
): Promise<void> {
  const getRes = await planner.ctx.get(`/plans/${planId}`, {
    headers: authHeaders(planner),
  });
  if (getRes.ok()) {
    const plan = await getRes.json();
    await planner.ctx.delete(`/plans/${planId}`, {
      headers: authHeaders(planner),
      data: { version: plan.version },
    });
  }
  await hardDeletePlanFixture(planId);
}

/**
 * Directly PATCHes a plan_sku's volume as a given session — used to simulate
 * "another user" bumping the version out from under the UI (T-034f 409
 * scenario). Mirrors `planEndpoints.updateSkuVolume` in
 * src/api/endpoints/plans.endpoints.ts.
 */
export async function patchSkuVolume(
  session: Session,
  fixture: DraftPlanFixture,
  plannedVolume: number,
  version: number
) {
  return session.ctx.patch(
    `/plans/${fixture.planId}/fus/${fixture.fuId}/skus/${fixture.skuId}/volume`,
    {
      headers: authHeaders(session),
      data: { plannedVolume, version },
    }
  );
}

export async function closeSession(session: Session): Promise<void> {
  await session.ctx.dispose();
}
