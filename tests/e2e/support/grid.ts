import { Locator, Page } from '@playwright/test';

/**
 * DEFECT (found by this task, T-016 — not fixed here, reported to
 * debugger/engineer): PlanningGridEnhanced.tsx's FU/SKU body rows iterate
 * `columns.map(...)` over the FULL `visibleColumns` array — which still
 * contains the ITEM_NAME/ITEM_CODE column *definitions* — without
 * filtering them out the way the header row does (`visibleColumns.filter(c
 * => c.code !== 'ITEM_NAME' && c.code !== 'ITEM_CODE')`, ~line 1286). Each
 * data row therefore renders 2 phantom leading cells the header has no
 * matching `<th>` for, so every real data cell lands 2 columns to the
 * right of its header for the ENTIRE grid, for every plan.
 *
 * Visually confirmed via screenshot: "List Price per Piece" header shows
 * blank, its value (e.g. ₺100) instead renders under "Base Volume (pcs)";
 * "COGS per Piece" (₺60) renders under "Planned Volume (pcs)"; and so on
 * for every column after Item Name/Item Code, for the whole grid.
 *
 * Root cause: PlanningGridEnhanced.tsx FU row ~line 1470 and SKU row
 * ~line 1594 both need the same `.filter(c => c.code !== 'ITEM_NAME' &&
 * c.code !== 'ITEM_CODE')` the header already applies at ~line 1286.
 *
 * Until fixed, header-index -> body `<td>`-index requires this offset for
 * any column after Item Name/Item Code. Delete this the day the
 * misalignment is fixed (grep for its usages) — at that point these tests
 * should fail loudly if the offset is still applied, which is correct.
 */
export const GRID_BODY_COLUMN_OFFSET_DEFECT = 2;

/** Resolves a data column's header index within the grid's second header row (`Item Name`, `Item Code`, ...). */
export async function columnHeaderIndex(page: Page, headerText: string): Promise<number> {
  const headerCells = page.locator('thead tr').nth(1).locator('th');
  const headerTexts = await headerCells.allTextContents();
  const index = headerTexts.findIndex((t) => t.trim() === headerText);
  if (index === -1) {
    throw new Error(`columnHeaderIndex: no column header exactly matching "${headerText}"`);
  }
  return index;
}

/**
 * Returns the `<td>` that actually holds a given row's data for a given
 * column header — compensating for GRID_BODY_COLUMN_OFFSET_DEFECT above.
 */
export async function dataCell(page: Page, row: Locator, headerText: string): Promise<Locator> {
  const headerIndex = await columnHeaderIndex(page, headerText);
  const bodyIndex = headerIndex === 0 || headerIndex === 1
    ? headerIndex
    : headerIndex + GRID_BODY_COLUMN_OFFSET_DEFECT;
  return row.locator('td').nth(bodyIndex);
}
