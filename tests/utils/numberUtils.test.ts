import { describe, it, expect } from 'vitest';
import {
  decideCellAbandonment,
  parseUserNumber,
  toNumber,
  toNumberOrZero,
  formatForEdit,
  describeNumericInputFailure,
  NumericInputErr,
} from '@/utils/numberUtils';

/**
 * T-106 — MIRROR OF `collmind.backend/src/common/numeric/numeric-text.spec.ts`.
 *
 * The frontend grammar is a deliberate copy of the backend's because the repos
 * share no package. This file is what makes the copy safe: it repeats that spec's
 * measurement matrix case for case, so if either grammar changes without the other
 * one of the two suites goes red.
 *
 * If you add a case there, add it here. If a case here starts failing, the two
 * have diverged — that is the signal, not a nuisance.
 */

const ok = (input: string): string => {
  const r = parseUserNumber(input);
  if (!r.ok) throw new Error(`expected ok, got ${r.reason} for ${input}`);
  return r.canonical;
};
const fail = (input: string): NumericInputErr => {
  const r = parseUserNumber(input);
  if (r.ok)
    throw new Error(`expected failure, got ${r.canonical} for ${input}`);
  return r;
};

describe('parseUserNumber — twin of the backend grammar', () => {
  it.each([
    ['7250.00', '7250.00'],
    ['400000', '400000'],
    ['185.00', '185.00'],
    ['0', '0'],
    ['-1234.56', '-1234.56'],
  ])('canonical %s -> %s', (input, expected) => {
    expect(ok(input)).toBe(expected);
  });

  // The three defects this replaces, measured against the OLD implementation:
  //   "1.234,56"     -> 1.23456   a thousand times too small
  //   "1234,56"      -> 123456    a hundred times too big
  //   "1.234.567,89" -> 1.234     ~a million times too small
  it.each([
    ['1.234,56', '1234.56'],
    ['1.000,00', '1000.00'],
    ['999.999,99', '999999.99'],
    ['1.234.567,89', '1234567.89'],
  ])('tr-TR %s -> %s', (input, expected) => {
    expect(ok(input)).toBe(expected);
  });

  it('1234,56 -> 1234.56 (a comma decimal is not a thousands separator)', () => {
    expect(ok('1234,56')).toBe('1234.56');
  });

  it.each([
    ['1,234.56', '1234.56'],
    ['1,234,567.89', '1234567.89'],
  ])('en-US %s -> %s', (input, expected) => {
    expect(ok(input)).toBe(expected);
  });

  it.each(['1.23.456,78', '12.34,56'])('rejects mis-grouped %s', (input) => {
    expect(fail(input).reason).toBe('MALFORMED');
  });

  describe('ambiguity is refused, never guessed', () => {
    it.each(['1.234', '1,234', '12.345', '999,999'])(
      '%s is ambiguous',
      (input) => {
        expect(fail(input).reason).toBe('AMBIGUOUS_SEPARATOR');
      }
    );

    // A thousands group is always exactly three digits, so these can only be
    // fractions — refusing them would refuse what we can read.
    it.each([
      ['185.5', '185.5'],
      ['1.23', '1.23'],
      ['1.2345', '1.2345'],
      ['1,2', '1.2'],
      ['1234.567', '1234.567'],
      ['12345.678', '12345.678'],
      // T-110: a leading group never starts with 0.
      ['0.125', '0.125'],
      ['-0.125', '-0.125'],
      ['0,125', '0.125'],
    ])('%s is NOT ambiguous -> %s', (input, expected) => {
      expect(ok(input)).toBe(expected);
    });

    // Same requirement as the backend: a message that refuses to guess must not
    // then guess in its own suggestions.
    it.each(['1.234', '1,234', '999,999'])(
      'every suggestion offered for %s actually parses',
      (input) => {
        const message = describeNumericInputFailure(fail(input));
        const suggestions = [...message.matchAll(/'([^']+)'/g)]
          .map((m) => m[1])
          .filter((s) => s !== input);

        expect(suggestions.length).toBeGreaterThan(0);
        for (const s of suggestions) {
          expect(parseUserNumber(s).ok).toBe(true);
        }
      }
    );
  });

  it.each(['Infinity', '-Infinity', '1e5', '1e999', '0x10', 'abc'])(
    '%s is malformed, not silently converted',
    (input) => {
      expect(fail(input).reason).toBe('MALFORMED');
    }
  );

  it('an empty box is EMPTY, not zero', () => {
    expect(fail('').reason).toBe('EMPTY');
    expect(fail('   ').reason).toBe('EMPTY');
  });

  // Without this, everything above would also pass on a parser that accepted
  // anything and echoed it back.
  it('is not simply permissive', () => {
    expect(parseUserNumber('12,34,56').ok).toBe(false);
    expect(parseUserNumber('..').ok).toBe(false);
    expect(parseUserNumber('1..2').ok).toBe(false);
    expect(parseUserNumber('-').ok).toBe(false);
  });
});

describe('toNumber — API values, canonical only', () => {
  // The split from parseUserNumber is the point: "1.234" from the API is 1.234,
  // while the same text typed by a person is ambiguous. One function could not
  // serve both without being wrong for one of them.
  it('reads a canonical decimal string the human grammar would refuse', () => {
    expect(toNumber('1.234')).toBe(1.234);
    expect(parseUserNumber('1.234').ok).toBe(false);
  });

  it.each([
    ['1234.56', 1234.56],
    ['0', 0],
    ['-99.5', -99.5],
  ])('%s -> %s', (input, expected) => {
    expect(toNumber(input)).toBe(expected);
  });

  it('passes finite numbers through and refuses non-finite ones', () => {
    expect(toNumber(1234.56)).toBe(1234.56);
    expect(toNumber(Infinity)).toBeNull();
    expect(toNumber(NaN)).toBeNull();
  });

  // The silent zero this replaces: every one of these used to be 0, and every
  // caller inherited that.
  it.each([null, undefined, '', 'abc', '1.234,56', '1,234.56'])(
    'returns null, not 0, for %s',
    (input) => {
      expect(toNumber(input as string | number | null | undefined)).toBeNull();
    }
  );

  it('toNumberOrZero says the zero out loud', () => {
    expect(toNumberOrZero(null)).toBe(0);
    expect(toNumberOrZero('abc')).toBe(0);
    expect(toNumberOrZero('1234.56')).toBe(1234.56);
  });
});

describe('formatForEdit — the round trip that was broken', () => {
  // The defect: the cell displayed `1.234,56` while the edit box opened with
  // `1234.56`. A user retyping what the cell had shown lost three digits.
  // T-110: the fixture deliberately reaches past four decimals. The previous set
  // was [1234.56, 1000, 999999.99, 0, -1234.5] — all <=2 decimals — and every one
  // of them passed with `maximumFractionDigits` set to anything from 2 to 20. The
  // test could not see the parameter it was supposed to constrain (CLAUDE.md:
  // a fixture must differ on the two sides of the distinction it tests).
  it.each([
    1234.56, 1000, 999999.99, 0, -1234.5, 1.23456, 3.14159265358979, 0.00001,
    12345.6789, -0.125,
  ])('format(%s) parses back to the same number', (value) => {
    const text = formatForEdit(value);
    const parsed = parseUserNumber(text);

    expect(parsed.ok).toBe(true);
    expect((parsed as { value: number }).value).toBe(value);
  });

  // tr-TR decimal comma, and deliberately NO thousands grouping: with grouping,
  // `formatForEdit(1000)` is `1.000`, which this module's own grammar refuses as
  // ambiguous. The formatter must not emit text its parser cannot read.
  it('uses the tr-TR decimal comma without grouping', () => {
    expect(formatForEdit(1234.56)).toBe('1234,56');
    expect(formatForEdit(1000)).toBe('1000');
  });

  it('renders an absent value as an empty box, not as zero', () => {
    expect(formatForEdit(null)).toBe('');
    expect(formatForEdit(undefined)).toBe('');
  });
});
