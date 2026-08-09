import { describe, it, expect, vi } from 'vitest';
import { render, screen, within, fireEvent } from '@testing-library/react';
import { StrictMode, useState, act, type ReactElement } from 'react';
import { createRoot } from 'react-dom/client';
import { flushSync } from 'react-dom';
import { Provider } from 'react-redux';
import { configureStore, type EnhancedStore } from '@reduxjs/toolkit';
import { EditableCell } from '@/components/features/plans/grid-cells';
import uiReducer from '@/store/slices/ui.slice';

/**
 * ⚠️ EVERY harness in this file renders under `<StrictMode>` — INTENTIONALLY,
 * not a leftover wrapper to strip. `src/main.tsx:6` wraps the real app in
 * `<React.StrictMode>`, so StrictMode's double-invoked render pass is what
 * production actually does; a suite that never renders under it is a suite
 * that proves things about a mode users don't run (CLAUDE.md §2.7: "kanıt
 * kurulumu üretimi temsil etmiyor").
 *
 * Measured, the defect this closes (`EditableCell`, td click, value
 * 1234.56, `prevOpen` as a REF instead of the current `useState`):
 *
 *     ref,   StrictMode      value=""          <- box opened EMPTY
 *     ref,   StrictMode YOK  value="1234,56"
 *     state, StrictMode      value="1234,56"    <- fixed
 *
 * StrictMode invokes the render function twice and discards the first
 * pass's STATE, but not a mutated REF — a ref written in that discarded
 * pass stays mutated, so the second pass sees `isOpen === prevOpenRef.current`
 * already and skips the format entirely, while the first pass's
 * `setEditValue` goes out with the render it belonged to. Every `render`/
 * `rerender` call below stays wrapped for this reason — remove the wrapper
 * and this whole file goes back to proving something the browser never
 * does.
 */

/**
 * T-109 step 2a — the coordinator invariant, tested against the REAL
 * `EditableCell` (now controlled: `isOpen`/`onOpen`/`onCancel`), not a copy
 * of it. This was never written down before this task: two independently
 * mounted `EditableCell`s each held their own `useState`, so nothing in the
 * codebase enforced "at most one open cell" — it happened to hold only
 * because every real call site shared one `editingCell` field in the parent.
 * A refactor of that parent could have silently dropped the invariant with
 * no test noticing.
 *
 * The "coordinator" below is a two-line harness holding ONE state field
 * (`openId`) — structurally the same pattern `PlanningGridEnhanced` uses
 * (`editingCell`), and the smallest thing that can enforce "at most one
 * open cell" without reimplementing anything `EditableCell` itself owns
 * (`decideCellAbandonment`, parsing, `closingSelfRef`) — CLAUDE.md §2.7 #8:
 * a test must not run a copy of the control it verifies.
 *
 * Measured BEFORE this task (T-109 task doc, coordinator-less
 * `EditableCell`):
 *
 *     after opening B -> open editors: 2
 *     focus is on the NEWLY opened cell: true | stale cell still holds its text: "abc"
 *
 * i.e. two editors open at once, one of them abandoned with unread text,
 * unfocused, no way to close itself, and — worse — completely silent about
 * it. The tests below pin the fixed shape: exactly one open editor ever,
 * and a toast when a coordinator eviction discards unread text.
 */

/**
 * Two independently-clickable `EditableCell`s sharing ONE `openId` field.
 * `onOpen` OVERWRITES it (never merges/adds) — that overwrite is the whole
 * mechanism: opening the second cell forces the first cell's `isOpen` prop
 * to `false` on the very next render, and the real (unmodified)
 * `EditableCell` takes it from there.
 */
function TwoCellHarness({
  onSaveA = () => {},
  onSaveB = () => {},
}: {
  onSaveA?: (v: number) => void;
  onSaveB?: (v: number) => void;
}) {
  const [openId, setOpenId] = useState<'A' | 'B' | null>(null);
  return (
    <table>
      <tbody>
        <tr>
          <td data-testid="cell-a">
            <EditableCell
              value={10}
              format="number"
              onSave={(v) => {
                onSaveA(v);
                setOpenId(null);
              }}
              onCancel={() => setOpenId(null)}
              isOpen={openId === 'A'}
              onOpen={() => setOpenId('A')}
            />
          </td>
          <td data-testid="cell-b">
            <EditableCell
              value={20}
              format="number"
              onSave={(v) => {
                onSaveB(v);
                setOpenId(null);
              }}
              onCancel={() => setOpenId(null)}
              isOpen={openId === 'B'}
              onOpen={() => setOpenId('B')}
            />
          </td>
        </tr>
      </tbody>
    </table>
  );
}

function renderHarness(props: Parameters<typeof TwoCellHarness>[0] = {}) {
  const store = configureStore({ reducer: { ui: uiReducer } });
  render(
    <StrictMode>
      <Provider store={store}>
        <TwoCellHarness {...props} />
      </Provider>
    </StrictMode>
  );
  const cellA = () => screen.getByTestId('cell-a');
  const cellB = () => screen.getByTestId('cell-b');
  const openA = () => fireEvent.click(within(cellA()).getByText('10'));
  const openB = () => fireEvent.click(within(cellB()).getByText('20'));
  const notifications = () => store.getState().ui.notifications;
  return { store, cellA, cellB, openA, openB, notifications };
}

describe('EditableCell coordinator — single-open invariant (T-109 step 2a)', () => {
  it('opening B closes A: exactly one editor is open at a time', () => {
    const { cellA, cellB, openA, openB } = renderHarness();

    openA();
    expect(within(cellA()).getByRole('textbox')).toBeInTheDocument();
    // Only A's editor exists yet — establishes the baseline before B opens.
    expect(screen.getAllByRole('textbox')).toHaveLength(1);

    openB();

    // The regression this guards against: BEFORE the coordinator, this was 2
    // (measured in the T-109 task doc, quoted above).
    expect(screen.getAllByRole('textbox')).toHaveLength(1);
    expect(within(cellB()).getByRole('textbox')).toBeInTheDocument();
    // A is back to its closed, formatted display — not left stuck open.
    expect(within(cellA()).getByText('10')).toBeInTheDocument();
  });

  it('focus follows the newly opened cell, not the evicted one', () => {
    const { cellB, openA, openB } = renderHarness();

    openA();
    openB();

    expect(document.activeElement).toBe(within(cellB()).getByRole('textbox'));
  });
});

describe('EditableCell coordinator — abandonment notifies (T-109 step 2a, KARAR b)', () => {
  it('unreadable text stays open and silent on its own blur, then closes WITH a toast once evicted', () => {
    const { cellA, openA, openB, notifications } = renderHarness();

    openA();
    const inputA = within(cellA()).getByRole('textbox');
    // §"ŞEKİL UYARISI": `handleBlur` reads the `editValue` STATE, not
    // `e.target.value` — the box is controlled. `fireEvent.blur(input, {
    // target: { value: 'abc' } })` alone would not reach the state at all
    // (measured: it produced "0 open editors", i.e. a false "everything is
    // fine"). `change` first, then `blur`.
    fireEvent.change(inputA, { target: { value: 'abc' } });
    fireEvent.blur(inputA);

    // T-106: unreadable input keeps the box open with its own reason on
    // screen, and does NOT toast on its own — the reason is already visible.
    expect(within(cellA()).getByRole('textbox')).toBeInTheDocument();
    expect(within(cellA()).getByText(/Geçersiz sayı/)).toBeInTheDocument();
    expect(notifications()).toHaveLength(0);

    openB();

    // The coordinator evicted A while it still held unread text: A closes
    // (there is no other way for the user to get back to it) AND says why.
    expect(within(cellA()).getByText('10')).toBeInTheDocument();
    expect(notifications()).toHaveLength(1);
    expect(notifications()[0]).toMatchObject({
      type: 'error',
      message: 'Girilen değer okunamadı, kaydedilmedi.',
    });
  });
});

// These three must NOT produce a toast: each is a cell closing on its OWN
// initiative (save, empty-cancel, Escape), never a coordinator eviction.
describe('EditableCell coordinator — negative controls (must NOT toast)', () => {
  it('a readable value saves and closes silently', () => {
    const onSaveA = vi.fn();
    const { cellA, openA, notifications } = renderHarness({ onSaveA });

    openA();
    const inputA = within(cellA()).getByRole('textbox');
    fireEvent.change(inputA, { target: { value: '42' } });
    fireEvent.blur(inputA);

    expect(onSaveA).toHaveBeenCalledWith(42);
    expect(screen.queryAllByRole('textbox')).toHaveLength(0);
    expect(notifications()).toHaveLength(0);
  });

  it('an empty box cancels and closes silently, without saving', () => {
    const onSaveA = vi.fn();
    const { cellA, openA, notifications } = renderHarness({ onSaveA });

    openA();
    const inputA = within(cellA()).getByRole('textbox');
    fireEvent.change(inputA, { target: { value: '' } });
    fireEvent.blur(inputA);

    expect(onSaveA).not.toHaveBeenCalled();
    expect(screen.queryAllByRole('textbox')).toHaveLength(0);
    expect(notifications()).toHaveLength(0);
  });

  it('Escape cancels and closes silently, without saving', () => {
    const onSaveA = vi.fn();
    const { cellA, openA, notifications } = renderHarness({ onSaveA });

    openA();
    const inputA = within(cellA()).getByRole('textbox');
    fireEvent.keyDown(inputA, { key: 'Escape' });

    expect(onSaveA).not.toHaveBeenCalled();
    expect(screen.queryAllByRole('textbox')).toHaveLength(0);
    expect(notifications()).toHaveLength(0);
  });
});

/**
 * T-109 step 2 review — the wrapping `TableCell`'s OWN click handler.
 *
 * Measured (real Chromium, a live editable cell, `PlanningGridEnhanced`):
 * `EditableCell`'s inner div sizes to its own `px-2 py-1`, not the `TD`'s
 * `p-4`-equivalent padding, and the `TD` vertically centers that inner div.
 * Removing the `TD`'s own `onClick` (leaving only `EditableCell`'s inner
 * div clickable) dropped the openable area to 26.6% of the cell — the
 * remaining 73.4%, all TD padding, went dead. The fix duplicates the open
 * call: the TD carries the SAME open handler `EditableCell`'s `onOpen` prop
 * receives, so either surface opens the cell.
 *
 * `TdWrappedCell` mirrors that exact shape (`<td onClick={openCell}><EditableCell
 * onOpen={openCell} .../></td>`) rather than reusing `TwoCellHarness`, whose
 * `<td>` carries no click handler of its own — the two harnesses test two
 * different click surfaces on purpose.
 *
 * ⚠️ COVERAGE GAP, measured, not assumed: this does NOT reach
 * `PlanningGridEnhanced.tsx`'s own `<TableCell onClick={...}>`. Reverting that
 * `onClick` to `undefined` and running the FULL suite leaves it green.
 *
 * The REASON changed with T-109 step 2b and the old one is no longer true: it
 * used to be structural (the inline `<input>` branch returned before
 * `EditableCell` was reached — that branch is now deleted). Today it is simply
 * that no unit test clicks a real `TableCell`: the row tests drive the cell
 * through the `editingCell` prop, and `onCellEdit` is an unasserted `vi.fn()`.
 *
 * What discriminates that handler is the e2e corner test in
 * `tests/e2e/04-grid-cell-kpi.spec.ts` — it clicks the TD's padding, which only
 * that handler can serve (measured: removing the `onClick` turns exactly that
 * test red and leaves the other 8 green). This harness pins the WIRING PATTERN;
 * the e2e pins the component.
 */
function TdWrappedCell({ value = 1234.56 }: { value?: number }) {
  const [open, setOpen] = useState(false);
  const openCell = () => setOpen(true);
  const closeCell = () => setOpen(false);
  return (
    <table>
      <tbody>
        <tr>
          <td data-testid="cell" onClick={openCell}>
            <EditableCell
              value={value}
              format="number"
              decimals={2}
              onSave={closeCell}
              onCancel={closeCell}
              isOpen={open}
              onOpen={openCell}
            />
          </td>
        </tr>
      </tbody>
    </table>
  );
}

function renderTdHarness(value?: number) {
  const store = configureStore({ reducer: { ui: uiReducer } });
  render(
    <StrictMode>
      <Provider store={store}>
        <TdWrappedCell value={value} />
      </Provider>
    </StrictMode>
  );
  return { td: () => screen.getByTestId('cell') };
}

describe('EditableCell coordinator — the TD carries its own click surface (T-109 step 2 review)', () => {
  it('a click landing on the TD itself (never touching the inner div) opens the editor', () => {
    const { td } = renderTdHarness();

    expect(screen.queryByRole('textbox')).toBeNull();

    // Dispatched ON the TD, not on any text/element inside it — the event's
    // target is the TD, so only the TD's OWN `onClick` can be what fires
    // here. `EditableCell`'s inner div is a descendant of the target, not
    // an ancestor, so its own click handler is not on this event's path at
    // all — this is the click that used to land on dead TD padding.
    fireEvent.click(td());

    expect(screen.getByRole('textbox')).toBeInTheDocument();
  });

  it('opened via the TD, the box holds the real value formatted — not empty or stale', () => {
    // A value distinguishable from both "empty" and "0": if the formatting
    // step were skipped, the box would show '' (the field's initial state),
    // not this. `1234.56` also pins the tr-TR decimal comma, not just "some
    // digits showed up".
    const { td } = renderTdHarness(1234.56);

    fireEvent.click(td());

    // T-109 step 2 review: this path never runs `EditableCell`'s OWN
    // `handleClick` (the click's target is the TD, a click on the inner div
    // never happened), and `handleClick` no longer formats `editValue`
    // itself in any case — it only calls `onOpen()`. The formatted text can
    // only have come from the `isOpen` open-transition effect.
    expect(screen.getByRole('textbox')).toHaveValue('1234,56');
  });
});

/**
 * T-109 step 2 review, blockers B1/B2 — two defects a plain "is the box
 * non-empty" assertion cannot see, because both leave the box holding the
 * CORRECT text. What breaks is SELECTION and FOCUS, not the string.
 *
 * B1 — the value was written to state one render too late. `select()` used
 * to run in the open-transition effect, against an input whose `value` was
 * still `''` (the format call sat in the SAME effect, one `setState` behind
 * where the DOM had already caught up). The box then showed the right text
 * on the NEXT render, but the selection made against the empty box had
 * already collapsed to position 0 — so any further typing APPENDED to a
 * fully-formed number instead of replacing it. Fixed by moving the format
 * into the render phase itself (`grid-cells.tsx`'s `prevOpenRef` block),
 * so by the time the effect calls `select()` the input already holds the
 * text.
 *
 * B2 — a cell that MOUNTS already open. `editingCell` (the coordinator
 * state) lives in the parent and does not clear when a row's DOM subtree is
 * removed, so collapsing a FU row (Tümünü Kapat) and re-expanding it
 * (Tümünü Aç) unmounts and remounts an `EditableCell` whose `isOpen` prop is
 * `true` from its very FIRST render — there is no `false -> true` edge for
 * the open-transition logic to catch. `wasOpenRef`/`prevOpenRef` seeded from
 * `isOpen` made this a no-op transition (`isOpen === prevOpenRef.current` on
 * the first render too), so the box rendered EMPTY, UNSELECTED, UNFOCUSED —
 * open, but useless, and silently so. Fixed by seeding both refs from a
 * literal `false`, which is guaranteed to differ from ANY incoming `isOpen`
 * the first time a fresh instance renders.
 *
 * Both pin `selectionStart`/`selectionEnd`, not just "the box has text": a
 * collapsed caret at the END (`sel=7,7`) and a full selection (`sel=0,7`)
 * describe the exact same non-empty `value` — CLAUDE.md's fixture rule
 * ("must differ on both sides of the distinction under test") applies to
 * the ASSERTION here as much as to the input fixture.
 */
function OpenOnMountCell({
  mountKey,
  value = 1234.56,
}: {
  mountKey: string;
  value?: number;
}) {
  return (
    <table>
      <tbody>
        <tr>
          <td>
            {/* `isOpen={true}` from this element's very first render — no
                prior `false` render for THIS instance, which is exactly what
                `key`-driven remounting below reproduces without needing a
                real FU-row collapse/expand. */}
            <EditableCell
              key={mountKey}
              value={value}
              format="number"
              decimals={2}
              onSave={() => {}}
              onCancel={() => {}}
              isOpen={true}
              onOpen={() => {}}
            />
          </td>
        </tr>
      </tbody>
    </table>
  );
}

describe('EditableCell — B1: opening selects the FULL value, not a collapsed caret at the end (StrictMode)', () => {
  it('under StrictMode, the box is formatted AND fully selected the moment it opens — not select-then-format', () => {
    // A normal, ordinary open TRANSITION (closed -> open via the TD's own
    // click) — B1 is about the ORDER of format-vs-select within that
    // transition, not about mounting already open (that's B2, below).
    //
    // `renderTdHarness` renders under `<StrictMode>` (see the file-header
    // comment for the 3-line measurement table) — that is load-bearing
    // HERE specifically: the fix this test pins (`prevOpen` as `useState`,
    // not a ref) exists ONLY because a ref-based version silently opened
    // EMPTY under StrictMode while working fine without it. Do not remove
    // the `<StrictMode>` wrapper to "simplify" this harness.
    const { td } = renderTdHarness(1234.56);

    fireEvent.click(td());

    const input = screen.getByRole('textbox') as HTMLInputElement;
    expect(input).toHaveValue('1234,56');
    // The regression this guards: with format-in-effect (one render late),
    // this was 7,7 — a collapsed caret at the end — on the exact same
    // `value`. A next keystroke would have appended to "1234,56" instead of
    // replacing it.
    expect(input.selectionStart).toBe(0);
    expect(input.selectionEnd).toBe('1234,56'.length);
    expect(document.activeElement).toBe(input);
  });
});

describe('EditableCell — B2: a cell that MOUNTS already open is not empty and not unfocused (StrictMode)', () => {
  it('under StrictMode, remounting with isOpen already true (Tümünü Kapat -> Tümünü Aç) formats, selects, and focuses', () => {
    // Rendered under `<StrictMode>` (see file-header measurement table) —
    // the double render pass is exactly what let a ref-based `prevOpen`
    // pass this test while opening EMPTY in the real app (`src/main.tsx`
    // wraps in `<React.StrictMode>` too). Keep the wrapper.
    const store = configureStore({ reducer: { ui: uiReducer } });

    // First instance: isOpen=true from ITS first render too — already
    // reproduces the bug on its own (no prior `false` render for this
    // component instance exists AT ALL).
    const { rerender } = render(
      <StrictMode>
        <Provider store={store}>
          <OpenOnMountCell mountKey="cycle-1" value={1234.56} />
        </Provider>
      </StrictMode>
    );

    // Swapping `key` (same `store`, same outer tree shape) forces React to
    // unmount the first `EditableCell` instance and mount a brand new one —
    // this is what an FU row's collapse/expand actually does to its child
    // SKU rows in `PlanningGridEnhanced.tsx` (the row's DOM subtree is
    // removed and recreated; `editingCell`, and so `isOpen`, does not
    // change). Doing it via `rerender` rather than relying on the first
    // mount alone makes the REAL trigger ("this used to be a live instance,
    // then it wasn't, then it was again") explicit rather than incidental.
    rerender(
      <StrictMode>
        <Provider store={store}>
          <OpenOnMountCell mountKey="cycle-2" value={1234.56} />
        </Provider>
      </StrictMode>
    );

    const input = screen.getByRole('textbox') as HTMLInputElement;
    // The regression this guards: value="" , sel=0,0, unfocused — a cell
    // that LOOKS open (the box is rendered) and is functionally useless: no
    // text to read, no selection, and the user's next keystroke lands
    // nowhere near it.
    expect(input).toHaveValue('1234,56');
    expect(input.selectionStart).toBe(0);
    expect(input.selectionEnd).toBe('1234,56'.length);
    expect(document.activeElement).toBe(input);
  });
});

/**
 * S6 — close→reopen race, deterministic.
 *
 * Product bug fixed this session: `EditableCell` filled `editValue` in the
 * RENDER phase on open, but used to clear it in a passive EFFECT on close.
 * Under load, that effect could fire AFTER the next open's render had
 * already filled the box — wiping the reopened cell back to empty. Measured
 * against the e2e corner test: 3 of 5 runs opened empty before the fix, 5/5
 * after.
 *
 * ⚠️ SHAPE WARNING (CLAUDE.md §2.7 #6) — two shapes were measured here and
 * only one discriminates:
 *
 *   - NOT discriminating: a single `act()` wrapping two RTL `rerender`
 *     calls. RTL flushes pending passive effects on every `render`/
 *     `rerender` call, so the close's effect always runs BEFORE the reopen
 *     commits — the race this test exists to create never happens, and the
 *     fixed and broken code produce the identical string.
 *   - Discriminating: raw `createRoot` + two back-to-back `flushSync`
 *     renders, with passive effects flushed only ONCE at the end via
 *     `await act(async () => {})`. `flushSync` commits synchronously but
 *     does NOT run `useEffect` callbacks — those stay queued until the
 *     final `act`. This is the only setup that guarantees the close's
 *     effect lands AFTER the reopen's commit, which is the exact ordering
 *     the bug depended on.
 *
 * Mutated to confirm (`grid-cells.tsx`, `setEditValue(isOpen ? formatForEdit(value) : '')`
 * split back into "format in render on open, clear in the effect on
 * close"): both tests below went red — the first with an empty box where
 * `'987,65'` was expected, the second with the PREVIOUS cell's error text
 * still showing on the reopened box. Reverted after confirming.
 */

function RawEditableCellHarness({
  isOpen,
  value,
}: {
  isOpen: boolean;
  value: number;
}): ReactElement {
  return (
    <table>
      <tbody>
        <tr>
          <td>
            <EditableCell
              value={value}
              format="number"
              decimals={2}
              onSave={() => {}}
              onCancel={() => {}}
              isOpen={isOpen}
              onOpen={() => {}}
            />
          </td>
        </tr>
      </tbody>
    </table>
  );
}

function rawTree(
  store: EnhancedStore,
  isOpen: boolean,
  value: number
): ReactElement {
  return (
    <Provider store={store}>
      <StrictMode>
        <RawEditableCellHarness isOpen={isOpen} value={value} />
      </StrictMode>
    </Provider>
  );
}

describe('EditableCell — close→reopen race is deterministic (S6)', () => {
  it("a reopen landing before the close's passive effect flushes is not wiped by it", async () => {
    const store = configureStore({ reducer: { ui: uiReducer } });
    const container = document.createElement('div');
    document.body.appendChild(container);
    const root = createRoot(container);

    try {
      // Steady state: open, with effects flushed, BEFORE the race under
      // test. This is not itself the race — it establishes the box the
      // close→reopen pair below is closing.
      await act(async () => {
        root.render(rawTree(store, true, 1234.56));
      });
      expect(within(container).getByRole('textbox')).toHaveValue('1234,56');

      // THE RACE: close, then reopen with a DIFFERENT value, as two
      // separate synchronous commits with no effect flush between them.
      flushSync(() => {
        root.render(rawTree(store, false, 1234.56));
      });
      flushSync(() => {
        root.render(rawTree(store, true, 987.65));
      });

      // Only now does React run the effects deferred by BOTH commits above.
      await act(async () => {});

      expect(within(container).getByRole('textbox')).toHaveValue('987,65');
    } finally {
      act(() => {
        root.unmount();
      });
      container.remove();
    }
  });

  it('a value rejected before the race does not leave its error on the reopened box, and the abandonment toast still fires', async () => {
    const store = configureStore({ reducer: { ui: uiReducer } });
    const container = document.createElement('div');
    document.body.appendChild(container);
    const root = createRoot(container);

    try {
      await act(async () => {
        root.render(rawTree(store, true, 1234.56));
      });

      const badInput = within(container).getByRole('textbox');
      fireEvent.change(badInput, { target: { value: 'abc' } });
      fireEvent.blur(badInput);

      // T-106: unreadable text keeps the box open with its own reason —
      // this is the starting point the race below evicts.
      expect(
        within(container).getByText(/Geçersiz sayı/)
      ).toBeInTheDocument();
      expect(store.getState().ui.notifications).toHaveLength(0);

      // Same race as the previous test, this time evicting a cell that is
      // still holding an UNREAD error, not a saved value.
      flushSync(() => {
        root.render(rawTree(store, false, 1234.56));
      });
      flushSync(() => {
        root.render(rawTree(store, true, 987.65));
      });

      await act(async () => {});

      const reopened = within(container).getByRole(
        'textbox'
      ) as HTMLInputElement;
      expect(reopened).toHaveValue('987,65');
      expect(reopened).not.toHaveAttribute('aria-invalid');
      expect(reopened.className).not.toContain('border-red-500');
      expect(
        within(container).queryByText(/Geçersiz sayı/)
      ).not.toBeInTheDocument();

      // The eviction toast is a SEPARATE mechanism (`decideCellAbandonment`)
      // from the box's own error text, and must still fire exactly once —
      // clean reopening must not also silence the report of the discarded
      // value.
      expect(store.getState().ui.notifications).toHaveLength(1);
      expect(store.getState().ui.notifications[0]).toMatchObject({
        type: 'error',
        message: 'Girilen değer okunamadı, kaydedilmedi.',
      });
    } finally {
      act(() => {
        root.unmount();
      });
      container.remove();
    }
  });
});
