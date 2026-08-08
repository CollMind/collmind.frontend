// T-109 (adım 1): the grid's edit box is `type="text"`. A number input cannot
// hold a tr-TR value — measured: typing `0,125` leaves `el.value` as `"0.125"`,
// with the decimal comma rewritten before our code sees it. This selector is the
// proof that the handover happened; if it goes back to `number`, the locale defect
// is back with it.
import { test, expect, Page } from '@playwright/test';
import {
  apiLogin,
  closeSession,
  createDraftPlanWithSingleSkuFu,
  deleteDraftPlan,
  SEED_USERS,
  Session,
  DraftPlanFixture,
} from './support/api';
import { loginViaUi } from './support/ui-auth';
import { dataCell } from './support/grid';

/**
 * T-016 — scenario 4: grid cell edit -> KPI re-render.
 *
 * What this catches that backend e2e cannot: the KPI/ROI formula engine
 * itself is already covered server-side (recalc-perf-regression.e2e-spec.ts,
 * role-journey.e2e-spec.ts A5/A6). What's NOT covered anywhere else is
 * whether editing a cell in PlanningGridEnhanced.tsx actually (a) sends the
 * edit, (b) invalidates the right React Query key, and (c) the newly
 * fetched numbers actually reach GrandTotals.tsx's rendered DOM — i.e. the
 * full wiring from a keystroke to a re-painted KPI card. A backend test
 * asserting the API response body is correct says nothing about whether
 * the grid component is even subscribed to that query.
 */

/**
 * GrandTotals.tsx renders each KPI as a fixed pair of sibling divs:
 * `<div class="...uppercase">LABEL</div><div class="text-2xl ...">VALUE</div>`.
 * Matching on the exact label text and walking to its next sibling is more
 * robust than matching on Tailwind utility classes (which `cn`/tailwind-merge
 * can reorder/dedupe).
 */
function kpiCardValue(page: Page, label: string) {
  return page
    .getByText(label, { exact: true })
    .locator('xpath=following-sibling::div[1]');
}

test.describe('Grid cell edit -> KPI update (T-016 scenario 4)', () => {
  let planner: Session;
  let admin: Session;
  let fixture: DraftPlanFixture;

  test.beforeAll(async () => {
    planner = await apiLogin(SEED_USERS.PLANNER);
    admin = await apiLogin(SEED_USERS.ADMIN);
    fixture = await createDraftPlanWithSingleSkuFu(
      planner,
      admin,
      'T016-GRIDKPI'
    );
  });

  test.afterAll(async () => {
    await deleteDraftPlan(planner, fixture.planId);
    await closeSession(planner);
    await closeSession(admin);
  });

  test('SKU Planned Volume hücresi düzenlenince Grand Totals (PLANNED VOLUME) KPI kartı güncellenir', async ({
    page,
  }) => {
    await loginViaUi(page, SEED_USERS.PLANNER);
    await page.goto(`/plans/${fixture.planId}`);

    // Fresh plan, no volume entered yet.
    const plannedVolumeValue = kpiCardValue(page, 'PLANNED VOLUME');
    await expect(plannedVolumeValue).toHaveText('0');

    await page.getByRole('button', { name: 'Tümünü Aç' }).click();
    // Plain CSS/text locator (see 02-version-conflict.spec.ts for why not
    // getByRole('row') — same Radix aria-hidden concern applies to any
    // dialog opened elsewhere on the page).
    const skuRow = page.locator('tbody tr', { hasText: fixture.skuCode });
    await expect(skuRow).toBeVisible();

    // See support/grid.ts — dataCell() resolves the `<td>` matching a
    // header's index (T-049 fixed the header/body column-alignment defect
    // that used to require an offset here).
    const cell = await dataCell(page, skuRow, 'Planned Volume (pcs)');
    await cell.click();
    const input = cell.locator('input[type="text"]');
    await expect(input).toBeVisible();
    await input.fill('400');
    await input.press('Enter');

    // Cell itself reflects the save (EditableCell/row re-render with the
    // freshly-invalidated plan query).
    await expect(cell).toContainText('400');

    // GrandTotals derives PLANNED VOLUME from plan.totalPlannedVolume,
    // which is server-aggregated across all SKUs — this is the KPI-engine
    // round trip, not a client-side echo of what was typed.
    await expect(plannedVolumeValue).toHaveText('400');

    // INCREMENTAL = plannedVolume - baseVolume (GrandTotals.tsx), both
    // aggregated server-side — base stayed 0, so this independently
    // confirms the full recalculated plan payload (not just the literal
    // cell we edited) reached the DOM, not merely an echo of the keystroke.
    const incrementalValue = kpiCardValue(page, 'INCREMENTAL');
    await expect(incrementalValue).toHaveText('400');
  });
});
