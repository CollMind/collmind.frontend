import { useEffect, useState } from 'react';
import { Input } from '@/components/ui/input';
import {
  parseUserNumber,
  describeNumericInputFailure,
  formatForEdit,
} from '@/utils/numberUtils';

/**
 * T-106 (B2): a money/quantity field that reads what the user actually typed.
 *
 * WHY `type="text"` — measured, in real Chromium at `locale: tr-TR`:
 *
 *     typed "250.000"      ->  el.value "250.000"    parseFloat 250
 *     typed "10.000,00"    ->  el.value "10.00000"   parseFloat 10
 *     typed "1.234,56"     ->  el.value "1.23456"    parseFloat 1.23456
 *     badInput === false in every case
 *
 * A `type="number"` input does NOT refuse a Turkish-formatted number. It keeps the
 * grouping dot, produces something `parseFloat` is happy with, and reports no
 * validity error — so a user entering a ₺250.000 cap saved **250**, silently.
 *
 * An earlier round of T-106 excluded these fields on the opposite assumption, and
 * the assumption was never run. Worth naming as a shape: the sanitising behaviour
 * of `type="number"` is real, but it applies to PROGRAMMATIC assignment
 * (`el.value = "1.234,56"` reads back `""`), not to typing. Two different
 * operations, and a scope decision was built on the wrong one.
 *
 * The text is kept as the user typed it. Parsing on every keystroke and writing the
 * number back into the box would fight the person mid-entry — `1.2` would become
 * `1,2` before they reached the `34`.
 */
export interface NumericInputProps {
  value: number | null | undefined;
  /** `null` means the field was cleared. Never called with an unreadable value. */
  onChange: (value: number | null) => void;
  id?: string;
  className?: string;
  placeholder?: string;
  required?: boolean;
  disabled?: boolean;
  'aria-label'?: string;
}

export function NumericInput({
  value,
  onChange,
  id,
  className,
  placeholder,
  required,
  disabled,
  ...rest
}: NumericInputProps) {
  const [text, setText] = useState<string>(() => formatForEdit(value ?? null));
  const [error, setError] = useState<string | null>(null);

  // Follow the value when it changes from OUTSIDE (a form reset, a loaded record).
  // Guarded by re-parsing our own text first: without that, typing `1234,5` would
  // be overwritten by the formatted echo of the number it produced.
  useEffect(() => {
    const current = parseUserNumber(text);
    const currentValue = current.ok ? current.value : null;
    if (currentValue !== (value ?? null)) {
      setText(formatForEdit(value ?? null));
      setError(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  const handleChange = (next: string) => {
    setText(next);

    if (next.trim() === '') {
      setError(null);
      onChange(null);
      return;
    }

    const parsed = parseUserNumber(next);
    if (parsed.ok) {
      setError(null);
      onChange(parsed.value);
      return;
    }

    // Unreadable: say so and DO NOT call onChange. The old code coerced this to 0
    // with `|| 0`, which is how an empty or half-typed cap became a real zero in
    // the request body (CLAUDE.md §2.5).
    setError(describeNumericInputFailure(parsed));
  };

  return (
    <div className="w-full">
      <Input
        id={id}
        type="text"
        inputMode="decimal"
        value={text}
        onChange={(e) => handleChange(e.target.value)}
        placeholder={placeholder}
        required={required}
        disabled={disabled}
        aria-invalid={error ? true : undefined}
        className={`${error ? 'border-red-500' : ''} ${className ?? ''}`}
        {...rest}
      />
      {/*
        The reason reaches the screen. Producing a distinguisher and not rendering
        it has happened three times in this codebase; the error is useless in state.
      */}
      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
    </div>
  );
}
