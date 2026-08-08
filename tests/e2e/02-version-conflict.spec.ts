// T-109 (adım 1): the grid's edit box is `type="text"`. A number input cannot
// hold a tr-TR value — measured: typing `0,125` leaves `el.value` as `"0.125"`,
// with the decimal comma rewritten before our code sees it. This selector is the
// proof that the handover happened; if it goes back to `number`, the locale defect
// is back with it.
import { test, expect } from '@playwright/test';
import {
  apiLogin,
  closeSession,
  createDraftPlanWithSingleSkuFu,
  deleteDraftPlan,
  patchSkuVolume,
  SEED_USERS,
  Session,
  DraftPlanFixture,
} from './support/api';
import { loginViaUi } from './support/ui-auth';
import { dataCell } from './support/grid';

/**
 * T-016 — scenario 2: 409 STALE_VERSION conflict dialog (T-034f).
 *
 * What this catches that backend e2e (optimistic-locking.e2e-spec.ts,
 * already deterministic-green at the HTTP layer) cannot: that layer only
 * proves the SERVER rejects a stale write. It says nothing about what the
 * BROWSER does with that 409 — this is the one guarantee (never silently
 * auto-retry a lost update) that only exists in src/hooks/useVersionConflict.ts
 * + src/components/common/VersionConflictDialog.tsx and can only be
 * observed by driving the real UI.
 *
 * Determinism: instead of two real browser tabs racing (inherently
 * flaky — see T-016 task warning against timing-dependent tests), a
 * second API session deterministically bumps the SKU's version between
 * page load and the UI's save, so the UI's in-memory version is
 * *provably* stale when it submits. No waitForTimeout anywhere.
 */

test.describe('409 version conflict dialog (T-016 scenario 2)', () => {
  let planner: Session;
  let admin: Session;
  let fixture: DraftPlanFixture;

  test.beforeAll(async () => {
    planner = await apiLogin(SEED_USERS.PLANNER);
    admin = await apiLogin(SEED_USERS.ADMIN);
    fixture = await createDraftPlanWithSingleSkuFu(
      planner,
      admin,
      'T016-CONFLICT'
    );
  });

  test.afterAll(async () => {
    await deleteDraftPlan(planner, fixture.planId);
    await closeSession(planner);
    await closeSession(admin);
  });

  test('SKU hücresi düzenlenirken başka biri aynı satırı değiştirirse → 409 dialog gösterilir, otomatik yeniden gönderim OLMAZ', async ({
    page,
  }) => {
    await loginViaUi(page, SEED_USERS.PLANNER);
    await page.goto(`/plans/${fixture.planId}`);
    await expect(page.getByRole('button', { name: 'Tümünü Aç' })).toBeVisible();
    await page.getByRole('button', { name: 'Tümünü Aç' }).click();

    // Exactly one SKU row (FU-WELLA-HC-500ML) — locate it by its unique
    // code. Deliberately a plain CSS/text locator, not getByRole('row'):
    // Radix's <Dialog> (VersionConflictDialog) sets aria-hidden="true" on
    // the rest of the page while open, which would make a role-based query
    // for this row resolve to "not found" the moment the conflict dialog
    // opens later in this test — a text-content locator isn't affected.
    const skuRow = page.locator('tbody tr', { hasText: fixture.skuCode });
    await expect(skuRow).toBeVisible();

    // "Another user" saves first via direct API call — bumps plan_skus.version
    // 1 -> 2 server-side. The UI still holds version=1 in its already-loaded
    // React Query cache; it has no way to know this happened yet.
    const otherUserWrite = await patchSkuVolume(admin, fixture, 999, 1);
    expect(otherUserWrite.ok()).toBe(true);

    // Now the planner edits the same cell in the UI. See support/grid.ts —
    // dataCell() resolves the `<td>` matching a header's index (T-049 fixed
    // the header/body column-alignment defect that used to require an
    // offset here).
    const cell = await dataCell(page, skuRow, 'Planned Volume (pcs)');
    await cell.click();
    const input = cell.locator('input[type="text"]');
    await expect(input).toBeVisible();
    await input.fill('750');
    await input.press('Enter');

    // The mutation is sent with the STALE version=1 the page loaded with
    // -> backend responds 409 STALE_VERSION -> VersionConflictDialog opens.
    await expect(
      page.getByRole('heading', {
        name: 'Kayıt Başka Biri Tarafından Değiştirildi',
      })
    ).toBeVisible();
    await expect(
      page.getByRole('button', { name: 'Yeniden Yükle' })
    ).toBeVisible();

    // The critical negative assertion: no auto-retry happened. If the
    // mutation had been silently resubmitted with a fresh version, the
    // cell would now show 750 (the planner's overwrite of the other
    // user's 999). It must NOT — the failed write never lands, and the
    // grid still reflects whatever it had cached before this edit (not
    // yet 999 either, since no refetch has happened).
    await expect(cell).not.toContainText('750');

    // Dismissing the dialog must not resubmit anything either.
    await page.getByRole('button', { name: 'Kapat' }).click();
    await expect(
      page.getByRole('heading', {
        name: 'Kayıt Başka Biri Tarafından Değiştirildi',
      })
    ).toHaveCount(0);
    await expect(cell).not.toContainText('750');

    // Re-trigger the conflict and this time use "Yeniden Yükle" — this
    // MUST refetch (showing the other user's real value, 999) rather than
    // resubmitting the planner's 750.
    await cell.click();
    const input2 = cell.locator('input[type="text"]');
    await input2.fill('750');
    await input2.press('Enter');
    await expect(
      page.getByRole('heading', {
        name: 'Kayıt Başka Biri Tarafından Değiştirildi',
      })
    ).toBeVisible();
    await page.getByRole('button', { name: 'Yeniden Yükle' }).click();

    await expect(
      page.getByRole('heading', {
        name: 'Kayıt Başka Biri Tarafından Değiştirildi',
      })
    ).toHaveCount(0);
    await expect(cell).toContainText('999');
    await expect(cell).not.toContainText('750');
  });
});
