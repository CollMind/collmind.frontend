import React, { useState, useRef, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import {
  parseUserNumber,
  describeNumericInputFailure,
  formatForEdit,
} from '@/utils/numberUtils';
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
  onCancel?: () => void;
  disabled?: boolean;
  className?: string;
  tooltip?: string;
  error?: string;
  warning?: string;
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
}: EditableCellProps) {
  const [isEditing, setIsEditing] = useState(false);
  // T-106: the reason the value was refused, shown next to the box while the
  // user is still typing — the immediate feedback the backend cannot give.
  const [inputError, setInputError] = useState<string | null>(null);
  const [editValue, setEditValue] = useState<string>('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

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
    setIsEditing(true);
    // T-106: the box opens in the SAME format the cell displays. It used to open
    // with `value.toString()` — `1234.56` — beside a cell reading `1.234,56`, so
    // the user was shown two formats for one number with no way to know which the
    // field wanted. Typing back the one they had just been shown lost three digits
    // silently.
    setEditValue(formatForEdit(value));
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
      onSave(finalValue);
      setIsEditing(false);
      return;
    }

    // An empty box is a cancel, as before. Anything else is a value the user
    // typed and we could not read: keep the box open with the reason, rather than
    // discarding their input silently.
    if (parsed.reason === 'EMPTY') {
      setInputError(null);
      if (onCancel) onCancel();
      setIsEditing(false);
      return;
    }
    setInputError(describeNumericInputFailure(parsed));
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleBlur();
    } else if (e.key === 'Escape') {
      setIsEditing(false);
      if (onCancel) onCancel();
    }
  };

  if (isEditing) {
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
