import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { StrictMode, type ComponentProps } from 'react';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import {
  FuRowEnhanced,
  type EditingCell,
} from '@/components/features/plans/PlanningGridEnhanced';
import { BASE_COLUMNS } from '@/components/features/plans/column-definitions';
import type { Plan, PlanFu } from '@/api/endpoints/plans.endpoints';
import uiReducer from '@/store/slices/ui.slice';

/**
 * T-112 — a cancel must not write. T-109 step 2b — the two inline `<input>`
 * editors this file used to drive are DELETED from `PlanningGridEnhanced`;
 * editing now goes through `EditableCell` (`grid-cells.tsx`), wired to the
 * row via the `editingCell` coordinator (`isOpen`/`onOpen`/`onCancel`).
 *
 * What THIS file still proves and `editable-cell-coordinator.test.tsx`
 * cannot: that `FuRowEnhanced`'s SKU/FU rows map `EditableCell`'s `onSave`
 * to `onCellSave(planFu, planSku, field, value)` with the RIGHT arguments
 * (in particular, `planSku` present for a SKU cell and `undefined` for a FU
 * cell) — the coordinator test only exercises a two-cell toy harness with
 * its own local `onSave`, never `FuRowEnhanced`'s actual argument mapping.
 * Rendering a copy of that mapping would prove nothing (CLAUDE.md §2.7 #8),
 * so this drives the real `FuRowEnhanced` with a mock `onCellSave`.
 *
 * The property under test is still a NEGATIVE one for cancel/Escape:
 * pressing Escape, or blurring an unreadable value, must leave `onCellSave`
 * uncalled. Asserting "something happened" would pass on the pre-T-112 code
 * too — Escape used to call `onCellSave` with the unchanged value, which
 * looked like a no-op and was not: it fired a PATCH, bumped `version` (so
 * another user's open edit got a 409), and wrote an immutable audit row.
 *
 * ⚠️ SHAPE WARNING (measured, T-109 task doc): `EditableCell` is CONTROLLED
 * (`editValue` is React state read in `handleBlur`), unlike the deleted
 * inline editors, which were uncontrolled (`defaultValue` + `e.target.value`
 * read directly off the DOM node in the `onBlur` handler). A bare
 * `fireEvent.blur(input, { target: { value } })` does not reach controlled
 * state at all — measured in `editable-cell-coordinator.test.tsx`'s header
 * comment: it produced "0 open editors", i.e. a false "everything is fine".
 * Every interaction below is `fireEvent.change` (writes `editValue`) THEN
 * `fireEvent.blur`/`fireEvent.keyDown` (reads it back).
 *
 * `EditableCell` reads `useToast()` -> `useAppDispatch()`, so every render
 * needs a real `react-redux` `<Provider>` — plain `render()` throws
 * "could not find react-redux context value" without it.
 *
 * ⚠️ Rendered under `<StrictMode>`, matching `editable-cell-coordinator.test.tsx`
 * and `src/main.tsx`. `EditableCell`'s open-transition state (`prevOpen`) was
 * measured to behave differently under StrictMode's double render pass (see
 * that file's header comment) — a suite that never renders under it proves
 * things about a mode production does not run (CLAUDE.md §2.7).
 *
 * ⚠️ T-109 step 2b review S1/S4 FIXTURE NOTE (measured): the fixtures below
 * are pulled from the REAL `BASE_COLUMNS` (not hand-rolled objects) and typed
 * against the real `PlanFu`/`Plan`/`EditingCell` types, with `overrides`
 * typed as `Partial<ComponentProps<typeof FuRowEnhanced>>` instead of
 * `Record<string, unknown>`. This is a narrowing, not a removal: `tsc
 * --noEmit` (`npm run type-check`) does not check `tests/` at all —
 * `tsconfig.json`'s `include` is `["src"]` only, confirmed by
 * `npx tsc --noEmit --listFiles | grep tests/` returning zero lines. So none
 * of the typing below is enforced by the `npm run type-check` gate; it is
 * enforced only by the editor/IDE and by whoever reads the diff. The 8 tests
 * this task started from went red because the PRODUCTION type changed
 * underneath fixtures that were still shaped for the old union — narrowing
 * the local types does not close that gap, it only stops THIS file from
 * silently constructing an unreachable shape again by accident. The one
 * shape this file deliberately DOES still construct on purpose — the
 * pre-fix "both fuId and skuId set" `EditingCell` — is done through an
 * explicit `as unknown as EditingCell`, documented at its use site below,
 * not through a blanket cast on the whole render call.
 */

// Real BASE_COLUMNS entries, not hand-rolled fixtures — using the actual
// production `ColumnDefinition` removes a whole class of shape drift. The
// previous fixture had `label` where `ColumnDefinition` wants `name`, and no
// `group`; it only ever compiled because `columns={[column] as never}`
// discarded the check (see the file header note above about `tests/` being
// outside `tsc --noEmit`'s scope regardless).
const fuColumn = BASE_COLUMNS.find((c) => c.code === 'CPP_ON_PCT')!;
// T-109 step 2b review S4: this SKU-editable column is deliberately its OWN
// column, not `fuColumn` reused with `editableAt` ignored. The previous SKU
// test drove `fuColumn` (`editableAt: 'FU'`) against a SKU row, so
// `isEditable`/`disabled` were false — a shape production can never open,
// because opening always goes through `onCellEdit`, and every call site that
// reaches it is gated on `isEditable` (`onClick`) or on `disabled` inside
// `EditableCell.handleClick`. The test only passed because it forced
// `editingCell` open directly, bypassing both gates — `EditableCell`'s
// `if (isOpen)` branch (`grid-cells.tsx`) does not itself re-check
// `disabled`. `BASE_VOL` is a real `editableAt: 'SKU'` column, so the SKU
// tests below reach the open state the same way a user would: through a
// column that is actually editable at that level.
const skuColumn = BASE_COLUMNS.find((c) => c.code === 'BASE_VOL')!;

// Deliberately partial — only the fields `FuRowEnhanced`/`EditableCell`
// actually read for these tests. Cast at the call site (`as PlanFu`), not
// with a blanket `as never`, so a reader can see which fields are fixture
// stand-ins without that cast silently accepting an unrelated prop typo.
const planFu: Partial<PlanFu> = {
  id: 'fu-1',
  fuId: 'FU-1',
  version: 3,
  fu: { id: 'FU-1', name: 'FU One', code: 'FU-1' },
  planSkus: [],
  tactics: { CPP_ON_PCT: 10 },
};

const plan: Partial<Plan> = { id: 'plan-1' };

type FuRowProps = ComponentProps<typeof FuRowEnhanced>;

function renderRow(overrides: Partial<FuRowProps> = {}) {
  const onCellSave = vi.fn();
  const onCellCancel = vi.fn();
  const store = configureStore({ reducer: { ui: uiReducer } });

  render(
    <StrictMode>
      <Provider store={store}>
        <table>
          <tbody>
            <FuRowEnhanced
              planFu={planFu as PlanFu}
              plan={plan as Plan}
              isExpanded={false}
              columns={[fuColumn]}
              canEdit
              editingCell={{ level: 'FU', fuId: 'fu-1', field: 'CPP_ON_PCT' }}
              onToggle={vi.fn()}
              onCellEdit={vi.fn()}
              onCellSave={onCellSave}
              onCellCancel={onCellCancel}
              getSkuCellValue={() => null}
              getFuCellValue={() => 10}
              onRemoveFu={vi.fn()}
              isRemovingFu={false}
              leftStickyWidth={0}
              rightStickyWidth={0}
              {...overrides}
            />
          </tbody>
        </table>
      </Provider>
    </StrictMode>
  );

  return { onCellSave, onCellCancel, store };
}

// The SKU editor is a SECOND copy of the same wiring, and §7.1 says to check
// both ends of a pattern. Measured before this existed (T-112): reverting the
// SKU row's Escape to `onCellSave(...)` left the whole suite green — the
// acceptance criterion "in both editors" was ticked without ever being
// measured.
describe('T-112/T-109 step 2b — the SKU row editor, the second end of the pattern', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const skuRow = () =>
    renderRow({
      isExpanded: true,
      // Its own editable-at-SKU column — see the `skuColumn` note above
      // (review S4). Using `fuColumn` here would render a `disabled` cell
      // that only opens because the fixture forces `editingCell`, a state
      // production cannot reach.
      columns: [skuColumn],
      planFu: {
        ...planFu,
        planSkus: [
          { id: 'sku-1', skuId: 'SKU-1', version: 1, sku: { name: 'S' } },
        ],
      } as PlanFu,
      // A real SKU-cell open: every actual call site
      // (`PlanningGridEnhanced.tsx`'s four `onCellEdit(...)` calls, both
      // `onClick` and `EditableCell.onOpen`) produces exactly this shape —
      // `{ level: 'SKU', skuId, field }`, nothing else. The `EditingCell`
      // union (review S1) now makes the OLD fixture shape (`{ fuId, skuId,
      // field }`, both fields set) a compile error at the call site instead
      // of a silently-accepted extra field.
      editingCell: { level: 'SKU', skuId: 'sku-1', field: 'BASE_VOL' },
      getSkuCellValue: () => 5,
    });

  it('Escape does NOT write', () => {
    const { onCellSave, onCellCancel } = skuRow();
    const input = screen.getByRole('textbox');

    fireEvent.keyDown(input, { key: 'Escape' });

    expect(onCellSave).not.toHaveBeenCalled();
    expect(onCellCancel).toHaveBeenCalledTimes(1);
  });

  it('a readable value writes with the planSku argument', () => {
    const { onCellSave } = skuRow();
    const input = screen.getByRole('textbox');

    fireEvent.change(input, { target: { value: '12,5' } });
    fireEvent.blur(input);

    expect(onCellSave).toHaveBeenCalledTimes(1);
    // call signature: (planFu, planSku, field, value) — the SKU cell must
    // carry a defined planSku, unlike the FU cell below.
    expect(onCellSave.mock.calls[0][1]).not.toBeUndefined();
    expect(onCellSave.mock.calls[0][3]).toBe(12.5);
  });
});

// T-109 step 2b review S1: the coordinator's type (`EditingCell`, a
// discriminated union) is what makes "two cells open at once" unrepresentable
// through the normal call sites. This suite proves the OTHER half — that the
// two `isEditing` predicates inside `FuRowEnhanced` (the `level === 'FU'` /
// `level === 'SKU'` checks) are what actually enforce it at render time, in
// case a future edit weakens either predicate while the type stays intact
// (e.g. a refactor that reads `.fuId`/`.skuId` through an `as any`).
describe('T-109 step 2b review S1 — the coordinator cannot open two editors at once', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('a malformed editingCell with BOTH fuId and skuId set opens exactly one editor and fires no save', () => {
    // The `EditingCell` union type prevents constructing this shape through
    // any real call site — every one of the four `onCellEdit(...)` calls in
    // `PlanningGridEnhanced.tsx` sets exactly one of `fuId`/`skuId`. This
    // cast recreates the PRE-T-109-step-2b shape on purpose: it is exactly
    // what T-112's regression looked like — mounting with both fields set
    // opened a SECOND editor whose synchronous mount-effect `.focus()`
    // (`grid-cells.tsx`) blurred the first, firing a real (unwanted)
    // `onCellSave` for the FU cell's unchanged value: a version bump, an
    // audit row, and a 409 for anyone else holding that plan.
    const malformed = {
      level: 'SKU',
      fuId: 'fu-1',
      skuId: 'sku-1',
      field: 'CPP_ON_PCT',
    } as unknown as EditingCell;

    const { onCellSave } = renderRow({
      isExpanded: true,
      planFu: {
        ...planFu,
        planSkus: [
          { id: 'sku-1', skuId: 'SKU-1', version: 1, sku: { name: 'S' } },
        ],
      } as PlanFu,
      editingCell: malformed,
      getSkuCellValue: () => 5,
    });

    // Exactly one open editor: the FU row's `isEditing` must reject this
    // object (it is not `level === 'FU'`), leaving only the SKU row's cell
    // open. If the FU predicate ever drops its `level` check, this becomes
    // 2 — see the mutation note in the task doc for how this was verified.
    expect(screen.getAllByRole('textbox')).toHaveLength(1);
    // No cascading blur-triggered save of the FU cell's unchanged value.
    expect(onCellSave).not.toHaveBeenCalled();
  });
});

describe('T-112/T-109 step 2b — the FU cell does not write on cancel', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('Escape does NOT call onCellSave', () => {
    const { onCellSave, onCellCancel } = renderRow();
    const input = screen.getByRole('textbox');

    fireEvent.keyDown(input, { key: 'Escape' });

    // The whole point: no write. Before T-112 this fired a real mutation with
    // the unchanged value — version bump, audit row, and a 409 for whoever
    // else had the row open.
    expect(onCellSave).not.toHaveBeenCalled();
    expect(onCellCancel).toHaveBeenCalledTimes(1);
    // planFu carries a defined field for a FU cell; onCellSave was never
    // called at all here, so there is nothing else to assert about its args.
  });

  // T-106, carried into EditableCell (`grid-cells.tsx`'s `handleBlur`): an
  // unreadable value does NOT write, says why INLINE (not a toast — the
  // reason is already on screen), and — the T-109 addition — does not lock
  // the user out of the cell. "Does not lock" is proven here by showing
  // Escape still works immediately afterwards, on the SAME input, without a
  // page reload or a second click to "unstick" it.
  it('unreadable text does NOT write, says why, and does not lock the cell', () => {
    const { onCellSave, onCellCancel } = renderRow();
    const input = screen.getByRole('textbox');

    fireEvent.change(input, { target: { value: 'abc' } });
    fireEvent.blur(input);

    expect(onCellSave).not.toHaveBeenCalled();
    // The reason is rendered next to the field (grid-cells.tsx), not a toast:
    // `describeNumericInputFailure` for a MALFORMED input starts with this.
    expect(screen.getByText(/Geçersiz sayı/)).toBeInTheDocument();
    // Still the same open textbox — the box was not released/replaced.
    expect(screen.getByRole('textbox')).toBe(input);

    // Not locked: Escape still cancels this exact input right away.
    fireEvent.keyDown(input, { key: 'Escape' });
    expect(onCellSave).not.toHaveBeenCalled();
    expect(onCellCancel).toHaveBeenCalledTimes(1);
  });

  it('an empty box releases the cell without a message, and without writing', () => {
    const { onCellSave, onCellCancel } = renderRow();
    const input = screen.getByRole('textbox');

    fireEvent.change(input, { target: { value: '' } });
    fireEvent.blur(input);

    expect(onCellSave).not.toHaveBeenCalled();
    expect(onCellCancel).toHaveBeenCalledTimes(1);
  });

  // The locale case the whole task exists for: a decimal comma must survive.
  it('reads a tr-TR decimal the old parseFloat would have mangled', () => {
    const { onCellSave } = renderRow();
    const input = screen.getByRole('textbox');

    fireEvent.change(input, { target: { value: '1.234,56' } });
    fireEvent.blur(input);

    expect(onCellSave.mock.calls[0][3]).toBe(1234.56);
  });

  // Without this, both assertions above would pass on a row that never
  // writes at all — the failure mode that would make the grid look fixed
  // and be broken.
  it('a readable value on blur DOES write', () => {
    const { onCellSave } = renderRow();
    const input = screen.getByRole('textbox');

    fireEvent.change(input, { target: { value: '42' } });
    fireEvent.blur(input);

    expect(onCellSave).toHaveBeenCalledTimes(1);
    expect(onCellSave.mock.calls[0][3]).toBe(42);
    // T-109 step 2b review S5: the FU end of the pattern the SKU test above
    // (`onCellSave.mock.calls[0][1]).not.toBeUndefined()`) checks the other
    // side of. `handleCellSave` picks `updateVolumeMutation` vs
    // `updateTacticMutation` on whether this argument is defined — a FU cell
    // that ever carried a `planSku` here would silently switch to a volume
    // update instead of a tactic update, and no test before this asserted
    // the FU side of that branch at all.
    expect(onCellSave.mock.calls[0][1]).toBeUndefined();
  });

  it('Enter with a readable value writes once', () => {
    const { onCellSave } = renderRow();
    const input = screen.getByRole('textbox');

    fireEvent.change(input, { target: { value: '7' } });
    fireEvent.keyDown(input, { key: 'Enter' });

    expect(onCellSave).toHaveBeenCalledTimes(1);
    expect(onCellSave.mock.calls[0][3]).toBe(7);
  });
});
