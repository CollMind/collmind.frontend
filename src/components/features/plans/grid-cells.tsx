import React, { useState, useRef, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import {
  parseUserNumber,
  describeNumericInputFailure,
  formatForEdit,
  decideCellAbandonment,
} from '@/utils/numberUtils';
import { useToast } from '@/hooks/useToast';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface EditableCellProps {
  value: number | null | undefined;
  format: 'currency' | 'percentage' | 'number';
  decimals?: number;
  suffix?: string;
  prefix?: string;
  min?: number;
  max?: number;
  onSave: (value: number) => void;
  // T-109 step 2: required, not optional. With `isOpen` controlled by the
  // coordinator, this component can no longer decide on its own to leave
  // edit mode (empty box, Escape) — it has to ASK the coordinator. An
  // optional prop a call site can omit would silently strand the cell open,
  // which is the exact defect this task exists to close (T-109 §"KARAR (b)").
  onCancel: () => void;
  disabled?: boolean;
  className?: string;
  tooltip?: string;
  error?: string;
  warning?: string;
  // T-109 step 2 (coordinator): "which cell is open" moved OUT of this
  // component. Only one cell may be open across the whole grid, and a
  // component-local `useState` cannot enforce a cross-instance invariant —
  // measured (T-109 task doc): two independently-mounted `EditableCell`s
  // both opened at once, one of them left with unreadable text, unfocused,
  // and no way to close itself. `isOpen`/`onOpen` make the coordinator (the
  // grid's `editingCell` state) the single source of truth; this component
  // keeps only the rendering and parsing work.
  isOpen: boolean;
  onOpen: () => void;
}

export function EditableCell({
  value,
  format,
  decimals = 0,
  suffix,
  prefix,
  min,
  max,
  onSave,
  onCancel,
  disabled = false,
  className = '',
  tooltip,
  error,
  warning,
  isOpen,
  onOpen,
}: EditableCellProps) {
  // T-106: the reason the value was refused, shown next to the box while the
  // user is still typing — the immediate feedback the backend cannot give.
  const [inputError, setInputError] = useState<string | null>(null);
  const [editValue, setEditValue] = useState<string>('');
  const inputRef = useRef<HTMLInputElement>(null);
  const toast = useToast();

  // T-109 step 2: read inside an effect without forcing the effect to re-run
  // on every keystroke (a `useState` value in the dependency array would).
  //
  // ⚠️ THESE TWO ASSIGNMENTS MUST STAY IN THE RENDER PHASE. React's docs say to
  // avoid writing refs while rendering, and someone will eventually move them
  // into a `useEffect` on that advice. Doing so breaks the close transition:
  // the effect below would then read the PREVIOUS commit's `inputError`, and a
  // cell closing itself right after clearing the error would report an
  // abandonment that never happened. `closingSelfRef` would hide it — the toast
  // is suppressed on self-close for a second, independent reason — so the
  // suite would stay green while the logic was wrong.
  const inputErrorRef = useRef<string | null>(null);
  inputErrorRef.current = inputError;
  const toastRef = useRef(toast);
  toastRef.current = toast;
  // T-109 step 2: armed by THIS component's own save/cancel/Escape path
  // right before it asks to close (see `handleBlur`, `handleKeyDown`).
  // Consumed — and reset — only inside the transition effect below, so a
  // close this cell did NOT ask for (the coordinator opening a different
  // cell) is exactly the case where this is still `false`.
  const closingSelfRef = useRef(false);
  // Carries the error across the close edge: cleared from state during render
  // (so the next box opens clean) and read here by the effect that decides the
  // abandonment toast.
  const abandonErrorRef = useRef<string | null>(null);

  // Two trackers for the same edge, and the difference between them is the
  // whole point: one is read during RENDER, the other after COMMIT.
  //
  // (1) `prevOpen` is STATE, not a ref — load-bearing under StrictMode.
  //     StrictMode invokes the render function twice and throws the first pass
  //     away. State from a discarded pass is thrown away with it; a MUTATED REF
  //     is not. The first version used a ref, so pass two saw the ref already
  //     equal to `isOpen`, skipped the format, and the `setEditValue` from pass
  //     one went out with the discarded render. Measured, value 1234.56:
  //
  //         ref,   StrictMode      value=""          ← box opened EMPTY
  //         ref,   no StrictMode   value="1234,56"
  //         state, StrictMode      value="1234,56"
  //
  //     `src/main.tsx` wraps the app in `<React.StrictMode>`, so the broken row
  //     of that table is the one users would have got. This is exactly why React
  //     documents "adjust state when a prop changes" with `useState`.
  //
  // (2) `wasOpenRef` stays a ref: it is written from the effect below, after
  //     commit, where a discarded render pass can never reach it.
  //
  // BOTH start at `false`, never at `isOpen`. A cell can mount already open —
  // `editingCell` survives a collapse/expand of the FU row, so "open a SKU cell,
  // Tümünü Kapat, Tümünü Aç" remounts it with `isOpen` true. Seeding from
  // `isOpen` made that a non-transition and the box came back EMPTY and
  // UNFOCUSED (measured). The legacy inline editor had no such problem:
  // `<input defaultValue={...}>` re-initialised on every mount, and that is the
  // property the move to controlled state gave up.
  const [prevOpen, setPrevOpen] = useState(false);
  const wasOpenRef = useRef(false);

  // THE FORMAT HAPPENS IN THE RENDER PHASE, and it must stay here.
  //
  // It used to sit in the open branch of the effect below, and that put the
  // text into state one render too late: `select()` ran against an input whose
  // value was still `''`, and when the next render wrote the value in, the
  // selection collapsed to the end. Measured against HEAD, same cell, 1234.56:
  //
  //     HEAD (inline editor) : value="1234,56"  selStart=0 selEnd=7
  //     effect-phase format  : value="1234,56"  selStart=7 selEnd=7
  //
  // With nothing selected, typing APPENDS. A planner opening a cell showing
  // 1.234,56 and typing `5` saved 1234,565 — a silent wrong number on a money
  // path, which is the exact class T-106 closed.
  //
  // Gating on the `isOpen` edge (not on `value`) is also what stops a
  // real-time recalculation from overwriting text the user is mid-way through
  // typing: while the cell stays open the condition below is false.
  if (isOpen !== prevOpen) {
    setPrevOpen(isOpen);
    // BOTH edges are handled here, and the clear must NOT move back into the
    // effect below. It was there, and it produced an intermittently EMPTY box:
    // the close effect is passive, so under load it could land AFTER a
    // subsequent open had already filled `editValue` — wiping it, with the cell
    // still showing its value right behind the box. Measured on the e2e corner
    // test: 3 of 5 runs opened empty; with both edges in the render phase, 0.
    //
    // Filling and clearing on the same edge, in the same phase, is what removes
    // the window.
    setEditValue(isOpen ? formatForEdit(value) : '');

    // `inputError` is cleared on the SAME edge, for the same reason — and the
    // reason is visible, not theoretical. Measured with the passive effect
    // deliberately delayed (two flushSync renders, then a flush): the newly
    // opened box carried the PREVIOUS edit's message, red border and
    // `aria-invalid` until the effect caught up.
    //
    // But the abandonment toast still has to read that error, and by the time
    // the effect runs it would be gone. So the close edge hands it over here,
    // in a ref, and the effect reads the ref instead of the state. Writing a
    // ref during render is the pattern this file already relies on (see the
    // note next to `inputErrorRef`), for exactly this ordering reason.
    if (!isOpen) {
      abandonErrorRef.current = inputError;
      setInputError(null);
    }
  }

  // T-109 step 2 review: one effect for BOTH edges of `isOpen`, gated only
  // on `isOpen` (dependency array holds only that) so it fires exactly on
  // the open and close transitions — not on every render, not on every
  // keystroke, not on every `value` change. `value`/`toast`/`inputError`
  // are read through the refs above instead of being dependencies, for the
  // reasons noted next to each ref.
  useEffect(() => {
    const wasOpen = wasOpenRef.current;
    wasOpenRef.current = isOpen;

    if (!wasOpen && isOpen) {
      // Only focus/select here. The text itself was put into state during the
      // render phase above — which is precisely what makes `select()` work:
      // by the time this runs, the input already HOLDS the value.
      //
      // This has to cover both ways in. The TableCell wrapping this component
      // in `PlanningGridEnhanced` carries its own `onClick` (measured: removing
      // it dropped the clickable area to this component's inner div, 26.6% of
      // the cell — the TD's padding went dead), and that path opens the cell
      // without `handleClick` ever running.
      if (inputRef.current) {
        inputRef.current.focus();
        inputRef.current.select();
      }
      return;
    }

    if (wasOpen && !isOpen) {
      const closedByCoordinator = !closingSelfRef.current;
      closingSelfRef.current = false;
      const decision = decideCellAbandonment(
        closedByCoordinator,
        abandonErrorRef.current
      );
      abandonErrorRef.current = null;
      if (decision.kind === 'notify') {
        toastRef.current.error(decision.message);
      }
    }
  }, [isOpen]);

  const formatValue = (val: number | null | undefined): string => {
    if (val === null || val === undefined) return '-';
    if (format === 'currency') {
      return new Intl.NumberFormat('tr-TR', {
        style: 'currency',
        currency: 'TRY',
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals,
      }).format(val);
    }
    if (format === 'percentage') {
      return `${val.toFixed(decimals)}%`;
    }
    return new Intl.NumberFormat('tr-TR', {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    }).format(val);
  };

  const handleClick = () => {
    if (disabled) return;
    // T-109 step 2: opening is a request to the coordinator, not a local
    // decision. The coordinator (the grid's `editingCell` state) is what
    // guarantees only one cell is open at a time; asking it to open THIS
    // cell is also what closes whichever one was open before.
    //
    // T-109 step 2 review: does NOT also format `editValue` here anymore —
    // that moved to the `isOpen` open-transition effect above, which fires
    // regardless of WHICH click handler asked for the open (this one, or
    // the wrapping TableCell's own `onClick`). Formatting only here would
    // have left the box showing stale text on the TableCell-padding path.
    onOpen();
  };

  const handleBlur = () => {
    // T-106: `parseUserNumber`, not `parseFloat`. parseFloat does not fail on bad
    // input — it TRUNCATES: "1.234.567,89" came back as 1.234 with no error, a
    // million-fold loss that looked like a number. The shared grammar refuses what
    // it cannot read and refuses what is ambiguous.
    const parsed = parseUserNumber(editValue);
    if (parsed.ok) {
      let finalValue = parsed.value;
      if (min !== undefined && finalValue < min) finalValue = min;
      if (max !== undefined && finalValue > max) finalValue = max;
      setInputError(null);
      // T-109 step 2: this cell asked for its own close (via `onSave`, which
      // the caller maps to closing the coordinator's open cell) — arm the
      // flag BEFORE the transition happens so the abandonment effect above
      // does not mistake it for a coordinator-forced eviction.
      closingSelfRef.current = true;
      onSave(finalValue);
      return;
    }

    // An empty box is a cancel, as before. Anything else is a value the user
    // typed and we could not read: keep the box open with the reason, rather than
    // discarding their input silently.
    if (parsed.reason === 'EMPTY') {
      setInputError(null);
      closingSelfRef.current = true;
      onCancel();
      return;
    }
    setInputError(describeNumericInputFailure(parsed));
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleBlur();
    } else if (e.key === 'Escape') {
      // T-109 step 2: clears `inputError` too — a prior version left a stale
      // error in state across Escape, which would have reached the
      // abandonment effect on the NEXT (coordinator-forced) close and
      // reported a value that had already been discarded here, by the user's
      // own choice.
      setInputError(null);
      closingSelfRef.current = true;
      onCancel();
    }
  };

  if (isOpen) {
    return (
      <div className="w-full">
        {/*
          T-106: `type="text"`, not `type="number"`. A number input cannot HOLD a
          tr-TR value — the browser sanitises anything it cannot parse as a plain
          decimal, so opening the box with `1.234,56` would have shown an empty
          field. `inputMode="decimal"` keeps the numeric keypad on mobile.

          `min`/`max` also move off the element: they are enforced in `handleBlur`
          against the PARSED value, which is the only place they can mean anything
          once the text is locale-formatted.
        */}
        <Input
          ref={inputRef}
          type="text"
          inputMode="decimal"
          value={editValue}
          onChange={(e) => {
            setEditValue(e.target.value);
            if (inputError) setInputError(null);
            // A pending "I am closing myself" claim is void the moment the user
            // types again. Without this the flag can be armed and never
            // consumed — if a save does not actually close the cell, the NEXT
            // close (a real coordinator eviction) reads it and stays silent.
            // Measured on a call site whose save left the cell open: the
            // eviction produced no toast at all. Both production call sites
            // close synchronously today, so this is a latent trap rather than a
            // live defect — but it is the kind that never turns a test red.
            closingSelfRef.current = false;
          }}
          onBlur={handleBlur}
          onKeyDown={handleKeyDown}
          className={`h-7 text-right text-sm w-full ${
            inputError ? 'border-red-500' : ''
          } ${className}`}
          aria-invalid={inputError ? true : undefined}
        />
        {/*
          The reason has to reach the screen. Setting it and not rendering it is
          how a "fix" ends up changing nothing a user can see — three times over in
          this codebase already.
        */}
        {inputError && (
          <p className="mt-1 text-xs text-red-600 text-right">{inputError}</p>
        )}
      </div>
    );
  }

  const displayValue = formatValue(value);
  const hasError = !!error;
  const hasWarning = !!warning;
  const borderColor = hasError
    ? 'border-red-500'
    : hasWarning
      ? 'border-amber-500'
      : '';

  const cellContent = (
    <div
      className={`text-right text-sm cursor-pointer hover:bg-blue-100 transition-colors px-2 py-1 rounded border-2 ${borderColor} ${className}`}
      onClick={handleClick}
    >
      {prefix && <span className="text-gray-500">{prefix}</span>}
      {displayValue}
      {suffix && <span className="text-gray-500 ml-1">{suffix}</span>}
      {(hasError || hasWarning) && (
        <span className="ml-1 text-xs">
          {hasError ? '⚠️' : hasWarning ? '⚠️' : ''}
        </span>
      )}
    </div>
  );

  const tooltipContent = error || warning || tooltip;

  if (tooltipContent) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>{cellContent}</TooltipTrigger>
          <TooltipContent>
            <div className="text-xs">
              {error && (
                <div className="text-red-600 font-semibold mb-1">
                  Error: {error}
                </div>
              )}
              {warning && (
                <div className="text-amber-600 font-semibold mb-1">
                  Warning: {warning}
                </div>
              )}
              {tooltip && <div>{tooltip}</div>}
            </div>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  return cellContent;
}

interface CalculatedCellProps {
  value: number | null | undefined;
  format: 'currency' | 'percentage' | 'number';
  decimals?: number;
  formula?: string;
  breakdown?: string;
  previousValue?: number | null;
  className?: string;
}

export function CalculatedCell({
  value,
  format,
  decimals = 0,
  formula,
  breakdown,
  previousValue,
  className = '',
}: CalculatedCellProps) {
  const [flashColor, setFlashColor] = useState<string | null>(null);

  useEffect(() => {
    if (previousValue !== undefined && value !== previousValue) {
      if (value && previousValue && value > previousValue) {
        setFlashColor('bg-green-100');
      } else if (value && previousValue && value < previousValue) {
        setFlashColor('bg-red-100');
      }
      setTimeout(() => setFlashColor(null), 500);
    }
  }, [value, previousValue]);

  const formatValue = (val: number | null | undefined): string => {
    if (val === null || val === undefined) return '-';
    if (format === 'currency') {
      return new Intl.NumberFormat('tr-TR', {
        style: 'currency',
        currency: 'TRY',
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals,
      }).format(val);
    }
    if (format === 'percentage') {
      return `${val.toFixed(decimals)}%`;
    }
    return new Intl.NumberFormat('tr-TR', {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    }).format(val);
  };

  const tooltipContent = (
    <div className="text-xs">
      {formula && <div className="font-semibold mb-1">Formula: {formula}</div>}
      {breakdown && <div>{breakdown}</div>}
    </div>
  );

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div
            className={`text-right text-sm bg-gray-50 px-2 py-1 rounded transition-colors ${flashColor || ''} ${className}`}
          >
            {formatValue(value)}
          </div>
        </TooltipTrigger>
        {(formula || breakdown) && (
          <TooltipContent>{tooltipContent}</TooltipContent>
        )}
      </Tooltip>
    </TooltipProvider>
  );
}

interface InheritedCellProps {
  value: number | null | undefined;
  format: 'currency' | 'percentage' | 'number';
  decimals?: number;
  parentValue?: number | null;
  parentLabel?: string;
  className?: string;
}

export function InheritedCell({
  value,
  format,
  decimals = 0,
  parentValue,
  parentLabel,
  className = '',
}: InheritedCellProps) {
  const formatValue = (val: number | null | undefined): string => {
    if (val === null || val === undefined) return '-';
    if (format === 'currency') {
      return new Intl.NumberFormat('tr-TR', {
        style: 'currency',
        currency: 'TRY',
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals,
      }).format(val);
    }
    if (format === 'percentage') {
      return `${val.toFixed(decimals)}%`;
    }
    return new Intl.NumberFormat('tr-TR', {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    }).format(val);
  };

  const tooltipContent = parentLabel ? (
    <div className="text-xs">
      <div className="font-semibold">From FU: {parentLabel}</div>
      <div>Value: {formatValue(parentValue)}</div>
    </div>
  ) : null;

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div
            className={`text-right text-sm text-gray-500 px-2 py-1 ${className}`}
          >
            {formatValue(value)}
            <span className="text-xs text-gray-400 ml-1">(from FU)</span>
          </div>
        </TooltipTrigger>
        {tooltipContent && <TooltipContent>{tooltipContent}</TooltipContent>}
      </Tooltip>
    </TooltipProvider>
  );
}

interface RAGCellProps {
  status?: 'RED' | 'AMBER' | 'GREEN';
  value?: number | null;
  thresholds?: {
    green?: number;
    amber?: number;
  };
  className?: string;
}

export function RAGCell({
  status,
  value,
  thresholds,
  className = '',
}: RAGCellProps) {
  const getStatusColor = (): string => {
    if (status === 'GREEN')
      return 'bg-green-100 text-green-800 border-green-300';
    if (status === 'AMBER')
      return 'bg-amber-100 text-amber-800 border-amber-300';
    if (status === 'RED') return 'bg-red-100 text-red-800 border-red-300';
    return 'bg-gray-100 text-gray-600 border-gray-300';
  };

  const getStatusLabel = (): string => {
    if (status === 'GREEN') return '● İYİ';
    if (status === 'AMBER') return '● RİSKLİ';
    if (status === 'RED') return '● KRİTİK';
    return '● N/A';
  };

  const tooltipContent = (
    <div className="text-xs">
      <div className="font-semibold mb-1">Status: {getStatusLabel()}</div>
      {value !== null && value !== undefined && (
        <div>Value: {value.toFixed(2)}</div>
      )}
      {thresholds && (
        <div className="mt-1">
          {thresholds.green && <div>Green: &gt;= {thresholds.green}</div>}
          {thresholds.amber && <div>Amber: &gt;= {thresholds.amber}</div>}
        </div>
      )}
    </div>
  );

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div
            className={`text-center px-3 py-1.5 rounded border-2 font-medium text-xs ${getStatusColor()} ${className}`}
          >
            <div className="flex items-center justify-center gap-1">
              <span className="text-lg">
                {status === 'GREEN' ? '●' : status === 'AMBER' ? '●' : '●'}
              </span>
              <span>{getStatusLabel()}</span>
            </div>
          </div>
        </TooltipTrigger>
        <TooltipContent>{tooltipContent}</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
