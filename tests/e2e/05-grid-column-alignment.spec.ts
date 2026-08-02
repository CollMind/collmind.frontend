import { test, expect } from '@playwright/test';
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
import { columnHeaderIndex } from './support/grid';

/**
 * T-049 — PlanningGridEnhanced.tsx header/body column alignment.
 *
 * Regression guard for a real, previously-live defect: the FU/SKU body rows
 * used to iterate the FULL (unfiltered) column list while the header row
 * filtered out the ITEM_NAME/ITEM_CODE definitions — so every data `<td>`
 * rendered 2 columns to the right of its `<th>`, for the ENTIRE grid, for
 * every plan. `SKU-E2E-COGS-FIXTURE` (seeded onto FU-WELLA-HC-500ML, see
 * collmind.backend agreement.seed.ts) has known, distinct master-data
 * values — unitPrice=100, cogs=60 — which is exactly what let this defect
 * be visually confirmed in the first place ("List Price" showed blank,
 * ₺100 rendered under "Base Volume (pcs)" instead). This test asserts the
 * header text and its underlying `<td>` value agree, by index, for both of
 * those columns, and that they are NOT sitting under an unrelated volume
 * column.
 */

test.describe('Grid header/body column alignment (T-049)', () => {
  let planner: Session;
  let admin: Session;
  let fixture: DraftPlanFixture;

  test.beforeAll(async () => {
    planner = await apiLogin(SEED_USERS.PLANNER);
    admin = await apiLogin(SEED_USERS.ADMIN);
    fixture = await createDraftPlanWithSingleSkuFu(planner, admin, 'T049-ALIGN');
  });

  test.afterAll(async () => {
    await deleteDraftPlan(planner, fixture.planId);
    await closeSession(planner);
    await closeSession(admin);
  });

  test('"List Price per Piece" ve "COGS per Piece" başlıklarının altındaki hücreler doğru SKU değerlerini gösterir', async ({
    page,
  }) => {
    await loginViaUi(page, SEED_USERS.PLANNER);
    await page.goto(`/plans/${fixture.planId}`);
    await expect(page.getByRole('button', { name: 'Tümünü Aç' })).toBeVisible();
    await page.getByRole('button', { name: 'Tümünü Aç' }).click();

    const skuRow = page.locator('tbody tr', { hasText: fixture.skuCode });
    await expect(skuRow).toBeVisible();

    const listPriceIndex = await columnHeaderIndex(page, 'List Price per Piece');
    const cogsIndex = await columnHeaderIndex(page, 'COGS per Piece');
    const baseVolumeIndex = await columnHeaderIndex(page, 'Base Volume (pcs)');
    const plannedVolumeIndex = await columnHeaderIndex(page, 'Planned Volume (pcs)');

    // Sanity: these are four genuinely distinct columns — if the header
    // ever collapses/reorders them onto the same index the assertions
    // below would trivially pass for the wrong reason.
    const indices = [listPriceIndex, cogsIndex, baseVolumeIndex, plannedVolumeIndex];
    expect(new Set(indices).size).toBe(indices.length);

    // The cell directly under "List Price per Piece" (by index) must show
    // the SKU's real unit price (₺100) — not blank, not the volume that
    // sat there under the T-049 offset defect.
    const listPriceCell = skuRow.locator('td').nth(listPriceIndex);
    await expect(listPriceCell).toContainText('₺100');

    const cogsCell = skuRow.locator('td').nth(cogsIndex);
    await expect(cogsCell).toContainText('₺60');

    // Negative assertions matching the exact defect described in T-049:
    // "Base Volume (pcs)" must NOT show the list price, "Planned Volume
    // (pcs)" must NOT show COGS.
    const baseVolumeCell = skuRow.locator('td').nth(baseVolumeIndex);
    const plannedVolumeCell = skuRow.locator('td').nth(plannedVolumeIndex);
    await expect(baseVolumeCell).not.toContainText('₺100');
    await expect(plannedVolumeCell).not.toContainText('₺60');
  });
});
