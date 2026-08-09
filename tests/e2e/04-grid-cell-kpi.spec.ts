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

  /**
   * T-109 step 2 review — the wrapping `<TableCell>`'s OWN `onClick`.
   *
   * Added to THIS file rather than a new spec: it exercises the same
   * `dataCell(page, skuRow, 'Planned Volume (pcs)')` cell as the test
   * above, in the same real grid, so it reuses `fixture` instead of paying
   * for a second plan create/teardown cycle — and it belongs next to the
   * other "grid cell" scenario, not off on its own.
   *
   * What this catches that NO other test in the repo can: a regression
   * that happened and was reverted this same task turn — removing the
   * TableCell's own `onClick` (the reasoning at the time: "EditableCell
   * already opens itself via `onOpen`, this is a duplicate call"). That
   * reasoning was correct about the call being a duplicate and wrong about
   * the duplicate being redundant: measured (real Chromium), `EditableCell`'s
   * inner clickable div sizes to its own `px-2 py-1`, not the wrapping
   * TableCell's `p-4` — so removing the TD's own handler dropped the
   * openable area to 26.6% of the cell; the other 73.4%, all TD padding,
   * went dead silently (no error, cell just stops responding there).
   *
   * Proven NOT to be catchable any other way this task: reverting the real
   * `onClick={... onCellEdit(...) }` on both TableCells in
   * `PlanningGridEnhanced.tsx` and running the FULL vitest suite
   * (`npm test -- --run`) left it green — `editingCell` matching a cell also
   * satisfies the row's OLDER `isEditing` check above the `EditableCell`
   * branch, so nothing in the unit suite reaches the real
   * `<TableCell onClick>` yet (it renders, but every unit-level route to it
   * opens the cell some other way first). Only a real, laid-out DOM — this
   * suite — can click 3px inside a `<td>`'s edge and land in dead padding
   * rather than the inner div; jsdom (no layout engine) cannot.
   */
  test('hücrenin dört köşesi de (TableCell padding, iç div değil) editörü açar', async ({
    page,
  }) => {
    await loginViaUi(page, SEED_USERS.PLANNER);
    await page.goto(`/plans/${fixture.planId}`);
    await page.getByRole('button', { name: 'Tümünü Aç' }).click();
    const skuRow = page.locator('tbody tr', { hasText: fixture.skuCode });
    await expect(skuRow).toBeVisible();

    const cell = await dataCell(page, skuRow, 'Planned Volume (pcs)');

    // Baseline FIRST: prove the cell genuinely opens on an ordinary click
    // (dead center, well inside the inner div). Without this, a corner
    // failure below would have a second, cheaper explanation — "this cell
    // was never editable to begin with" — and the test would not be
    // pinning what it claims to.
    await cell.click();
    let input = cell.locator('input[type="text"]');
    await expect(input).toBeVisible();
    // input.press, NOT page.keyboard.press. `Locator.press` focuses its target
    // before sending the key; `page.keyboard.press` sends to whatever holds
    // focus, and a key fired right after a click can reach `document.body`
    // instead of the input — which reads as "Escape does not close the cell",
    // a measurement artefact rather than a defect. That happened during T-109
    // and cost a round of chasing a bug that was not there.
    //
    // (The parent's 50ms focus `setTimeout` that originally made this race easy
    // to hit is gone — T-109 step 2b deleted it along with the inline editors —
    // but focus is still established by an effect, so the rule stands.)
    await input.press('Escape');
    await expect(input).toBeHidden();

    const box = await cell.boundingBox();
    if (!box) {
      throw new Error(
        'Planned Volume (pcs) cell has no bounding box — is it scrolled out of view?'
      );
    }
    // 3px inside each edge: comfortably inside the TableCell's `p-4`
    // (16px) padding, comfortably outside the inner div's own `px-2 py-1`
    // box, which starts flush with the TD's padding edge — this is exactly
    // the band that went dead when the TD's `onClick` was removed.
    const inset = 3;
    const corners: Array<{ label: string; x: number; y: number }> = [
      { label: 'top-left', x: box.x + inset, y: box.y + inset },
      { label: 'top-right', x: box.x + box.width - inset, y: box.y + inset },
      { label: 'bottom-left', x: box.x + inset, y: box.y + box.height - inset },
      {
        label: 'bottom-right',
        x: box.x + box.width - inset,
        y: box.y + box.height - inset,
      },
    ];

    for (const corner of corners) {
      await page.mouse.click(corner.x, corner.y);
      input = cell.locator('input[type="text"]');
      // Fails here, at the ${corner.label} corner specifically, is the
      // signal that TableCell's own onClick (not EditableCell's inner div)
      // is missing or broken.
      await expect(input).toBeVisible();
      // Not just "an editor appeared" — it must hold a value, not a blank box.
      //
      // This line's MEANING changed with T-109 step 2b, and the change was
      // measured on both sides. Deleting `EditableCell`'s open-transition
      // formatting (`if (isOpen) setEditValue(formatForEdit(value))` in
      // `grid-cells.tsx`) and running this spec:
      //
      //     before 2b : exit 0, 2 passed   — the value came from the legacy
      //                                      inline editor's `defaultValue`,
      //                                      so this assertion proved nothing
      //     after  2b : exit 1, this line fails on `not.toHaveValue('')`
      //
      // So it now guards what it claims to: the box a user gets is filled by
      // `EditableCell` itself. Do not delete it as "redundant" — that is the
      // reading its own comment invited before the deletion landed.
      await expect(input).not.toHaveValue('');
      await input.press('Escape');
      await expect(input).toBeHidden();
    }
  });
});
