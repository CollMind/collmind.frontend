import { Locator, Page } from '@playwright/test';

/**
 * Resolves a data column's header index within the grid's second header row
 * (`Item Name`, `Item Code`, ...).
 */
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
 * Returns the `<td>` that holds a given row's data for a given column
 * header.
 *
 * T-049: PlanningGridEnhanced.tsx used to iterate `columns.map(...)` over
 * the FULL, unfiltered column list in the FU/SKU body rows while the header
 * row filtered out the ITEM_NAME/ITEM_CODE column definitions — so every
 * data `<td>` landed 2 columns to the right of its `<th>` for the entire
 * grid. That has been fixed by deriving both the header and body cell lists
 * from a single `gridColumns` memo in PlanningGridEnhanced.tsx, so a plain
 * header-index -> body `<td>`-index lookup (no offset) is now correct. See
 * ./grid-alignment.spec.ts, which fails loudly if this regresses.
 */
export async function dataCell(page: Page, row: Locator, headerText: string): Promise<Locator> {
  const headerIndex = await columnHeaderIndex(page, headerText);
  return row.locator('td').nth(headerIndex);
}
