import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { createRef } from 'react';
import { FuRowEnhanced } from '@/components/features/plans/PlanningGridEnhanced';
import { decideCellCommit } from '@/utils/numberUtils';

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
  // The REAL decision, not a stand-in. An earlier version of this test
  // reimplemented the parse here, and a mutation to the production helper stayed
  // green — the test was exercising its own copy (CLAUDE.md §2.7 #8).
  const onCellCommit = vi.fn((raw: string, save: (v: number) => void) => {
    const decision = decideCellCommit(raw);
    if (decision.kind === 'save') save(decision.value);
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

  return { onCellSave, onCellCancel, onCellCommit };
}

describe('T-112 — the edit cell does not write on cancel', () => {
  beforeEach(() => vi.clearAllMocks());

  it('Escape does NOT call onCellSave', () => {
    const { onCellSave, onCellCancel } = renderRow();
    const input = screen.getByRole('spinbutton');

    fireEvent.keyDown(input, { key: 'Escape' });

    // The whole point: no write. Before T-112 this fired a real mutation with the
    // unchanged value — version bump, audit row, and a 409 for whoever else had
    // the row open.
    expect(onCellSave).not.toHaveBeenCalled();
    expect(onCellCancel).toHaveBeenCalledTimes(1);
  });

  it('an unreadable value on blur does NOT write, and does not leave the cell stuck', () => {
    const { onCellSave, onCellCommit } = renderRow();
    const input = screen.getByRole('spinbutton');

    fireEvent.blur(input, { target: { value: 'abc' } });

    expect(onCellCommit).toHaveBeenCalledTimes(1);
    expect(onCellSave).not.toHaveBeenCalled();
  });

  // Without this, both assertions above would pass on a row that never writes at
  // all — the failure mode that would make the grid look fixed and be broken.
  it('a readable value on blur DOES write', () => {
    const { onCellSave } = renderRow();
    const input = screen.getByRole('spinbutton');

    fireEvent.blur(input, { target: { value: '42' } });

    expect(onCellSave).toHaveBeenCalledTimes(1);
    expect(onCellSave.mock.calls[0][3]).toBe(42);
  });

  it('Enter with a readable value writes once', () => {
    const { onCellSave } = renderRow();
    const input = screen.getByRole('spinbutton');

    fireEvent.keyDown(input, { key: 'Enter', target: { value: '7' } });

    expect(onCellSave).toHaveBeenCalledTimes(1);
  });
});
