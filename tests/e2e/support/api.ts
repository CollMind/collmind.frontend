import { APIRequestContext, request as pwRequest } from '@playwright/test';

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
  const res = await session.ctx.get(`/${path}`, { headers: authHeaders(session) });
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
  const res = await session.ctx.get('/master-data/cpls', { headers: authHeaders(session) });
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
 * Creates an E2E-prefixed DRAFT plan for the given PLANNER session, adds the
 * FU-WELLA-HC-500ML forecasting unit (deliberately chosen: exactly ONE SKU,
 * see task notes — keeps the grid small/deterministic to locate in the DOM,
 * unlike FU-TUP-BOYA's 50+ SKUs), and returns the ids a test needs to poke
 * cells in the UI or replay a conflicting API write.
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
    throw new Error(`POST /plans failed: ${planRes.status()} ${await planRes.text()}`);
  }
  const plan = await planRes.json();

  const skuListRes = await admin.ctx.get(
    '/master-data/forecasting-units',
    { headers: authHeaders(admin) }
  );
  const fus = await skuListRes.json();
  const fu = fus.find((f: { code: string }) => f.code === 'FU-WELLA-HC-500ML');
  if (!fu) {
    throw new Error(
      "createDraftPlanWithSingleSkuFu: FU-WELLA-HC-500ML not found — is npm run seed up to date?"
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
      `createDraftPlanWithSingleSkuFu: expected FU-WELLA-HC-500ML to have exactly 1 SKU, found ${skus.length} — fixture assumption changed, pick another FU/spec needs updating.`
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

/** Best-effort DRAFT plan delete (fetches current version first). Safe to call even if already deleted. */
export async function deleteDraftPlan(planner: Session, planId: string): Promise<void> {
  const getRes = await planner.ctx.get(`/plans/${planId}`, { headers: authHeaders(planner) });
  if (!getRes.ok()) return; // already gone
  const plan = await getRes.json();
  await planner.ctx.delete(`/plans/${planId}`, {
    headers: authHeaders(planner),
    data: { version: plan.version },
  });
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
