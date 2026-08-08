import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { createRef } from 'react';
import { FuRowEnhanced } from '@/components/features/plans/PlanningGridEnhanced';
import { commitCellEdit } from '@/utils/numberUtils';

/**
 * T-112 — a cancel must not write.
 *
 * The property under test is a NEGATIVE one: pressing Escape, or blurring an
 * unreadable value, must leave `onCellSave` uncalled. Asserting "something
 * happened" would pass on the old code too — Escape used to call `onCellSave` with
 * the unchanged value, which looked like a no-op and was not: it fired a PATCH,
 * bumped `version` (so another user's open edit got a 409), and wrote an immutable
 * audit row.
 *
 * So the row is rendered for real and the mock is asserted NOT to have been called.
 */

const column = {
  code: 'CPP_ON_PCT',
  label: 'CPP %',
  editable: true,
  editableAt: 'FU' as const,
  format: 'number' as const,
  decimals: 2,
  width: 100,
  backgroundColor: '#FFFFFF',
};

const planFu = {
  id: 'fu-1',
  fuId: 'FU-1',
  version: 3,
  forecastingUnit: { name: 'FU One' },
  planSkus: [],
  tactics: { CPP_ON_PCT: 10 },
} as never;

const plan = { id: 'plan-1' } as never;

function renderRow(overrides: Record<string, unknown> = {}) {
  const onCellSave = vi.fn();
  const onCellCancel = vi.fn();
  // The REAL mapping, effects included. Two earlier versions of this stub were
  // copies: the first reimplemented the parse, the second implemented only the
  // `save` branch — and in both cases mutations to the production code stayed
  // green (CLAUDE.md §2.7 #8). Now the row drives `commitCellEdit` itself and the
  // effects are spies, so "closes the cell" and "says why" are observable here.
  const notify = vi.fn();
  const close = vi.fn();
  const onCellCommit = vi.fn((raw: string, save: (v: number) => void) => {
    commitCellEdit(raw, { save, notify, close });
  });

  render(
    <table>
      <tbody>
        <FuRowEnhanced
          planFu={planFu}
          plan={plan}
          isExpanded={false}
          columns={[column] as never}
          canEdit
          editingCell={{ fuId: 'fu-1', field: 'CPP_ON_PCT' }}
          editInputRef={createRef<HTMLInputElement>()}
          onToggle={vi.fn()}
          onCellEdit={vi.fn()}
          onCellSave={onCellSave}
          onCellCommit={onCellCommit as never}
          onCellCancel={onCellCancel}
          getSkuCellValue={() => null}
          getFuCellValue={() => 10}
          onRemoveFu={vi.fn()}
          isRemovingFu={false}
          leftStickyWidth={0}
          rightStickyWidth={0}
          {...(overrides as never)}
        />
      </tbody>
    </table>
  );

  return { onCellSave, onCellCancel, onCellCommit, notify, close };
}

// The SKU editor is a SECOND copy of the same handlers, and §7.1 says to check
// both ends of a pattern. Measured before this existed: reverting the SKU row's
// Escape to `onCellSave(...)` left the whole suite green — the acceptance
// criterion "in both editors" was ticked without ever being measured.
describe('T-112 — the SKU row editor, the second end of the pattern', () => {
  beforeEach(() => vi.clearAllMocks());

  const skuRow = () =>
    renderRow({
      isExpanded: true,
      planFu: {
        ...(planFu as Record<string, unknown>),
        planSkus: [
          { id: 'sku-1', skuId: 'SKU-1', version: 1, sku: { name: 'S' } },
        ],
      } as never,
      editingCell: { fuId: 'fu-1', skuId: 'sku-1', field: 'CPP_ON_PCT' },
      getSkuCellValue: () => 5,
    });

  it('Escape does NOT write', () => {
    const { onCellSave, onCellCancel } = skuRow();
    const inputs = screen.getAllByRole('textbox');

    fireEvent.keyDown(inputs[inputs.length - 1], { key: 'Escape' });

    expect(onCellSave).not.toHaveBeenCalled();
    expect(onCellCancel).toHaveBeenCalledTimes(1);
  });

  it('a readable value writes with the planSku argument', () => {
    const { onCellSave } = skuRow();
    const inputs = screen.getAllByRole('textbox');

    fireEvent.blur(inputs[inputs.length - 1], { target: { value: '12,5' } });

    expect(onCellSave).toHaveBeenCalledTimes(1);
    expect(onCellSave.mock.calls[0][1]).not.toBeUndefined();
    expect(onCellSave.mock.calls[0][3]).toBe(12.5);
  });
});

describe('T-112 — the edit cell does not write on cancel', () => {
  beforeEach(() => vi.clearAllMocks());

  it('Escape does NOT call onCellSave', () => {
    const { onCellSave, onCellCancel } = renderRow();
    const input = screen.getByRole('textbox');

    fireEvent.keyDown(input, { key: 'Escape' });

    // The whole point: no write. Before T-112 this fired a real mutation with the
    // unchanged value — version bump, audit row, and a 409 for whoever else had
    // the row open.
    expect(onCellSave).not.toHaveBeenCalled();
    expect(onCellCancel).toHaveBeenCalledTimes(1);
  });

  // T-112 review S4: this used to run against `type="number"`, where jsdom
  // rewrites `'abc'` to `''` — so it was measuring the EMPTY path and calling it
  // "unreadable". With `type="text"` the text actually reaches the handler, and
  // the assertions below can tell the two apart.
  it('unreadable text does NOT write, says why, and releases the cell', () => {
    const { onCellSave, notify, close } = renderRow();
    const input = screen.getByRole('textbox');

    fireEvent.blur(input, { target: { value: 'abc' } });

    expect(onCellSave).not.toHaveBeenCalled();
    expect(notify).toHaveBeenCalledTimes(1);
    expect(close).toHaveBeenCalledTimes(1);
  });

  it('an empty box releases the cell without a message', () => {
    const { onCellSave, notify, close } = renderRow();
    const input = screen.getByRole('textbox');

    fireEvent.blur(input, { target: { value: '' } });

    expect(onCellSave).not.toHaveBeenCalled();
    expect(notify).not.toHaveBeenCalled();
    expect(close).toHaveBeenCalledTimes(1);
  });

  // The locale case the whole task exists for: a decimal comma must survive.
  it('reads a tr-TR decimal the old parseFloat would have mangled', () => {
    const { onCellSave } = renderRow();
    const input = screen.getByRole('textbox');

    fireEvent.blur(input, { target: { value: '1.234,56' } });

    expect(onCellSave.mock.calls[0][3]).toBe(1234.56);
  });

  // Without this, both assertions above would pass on a row that never writes at
  // all — the failure mode that would make the grid look fixed and be broken.
  it('a readable value on blur DOES write', () => {
    const { onCellSave } = renderRow();
    const input = screen.getByRole('textbox');

    fireEvent.blur(input, { target: { value: '42' } });

    expect(onCellSave).toHaveBeenCalledTimes(1);
    expect(onCellSave.mock.calls[0][3]).toBe(42);
  });

  it('Enter with a readable value writes once', () => {
    const { onCellSave } = renderRow();
    const input = screen.getByRole('textbox');

    fireEvent.keyDown(input, { key: 'Enter', target: { value: '7' } });

    expect(onCellSave).toHaveBeenCalledTimes(1);
  });
});
