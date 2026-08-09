/**
 * T-106: one number grammar for the frontend, and it is the BEHAVIOURAL TWIN of
 * the backend's.
 *
 * ⚠️ TWIN OF: `collmind.backend/src/common/numeric/numeric-text.ts`
 * If the grammar changes there, it changes here, and `numberUtils.test.ts` mirrors
 * that file's measurement matrix case for case so a divergence goes red.
 *
 * This is a deliberate SIXTH implementation of a capability the repo already has,
 * and CLAUDE.md §7 says to justify that rather than let it happen quietly. The two
 * repos share no package, no workspace and no path alias (measured: no root
 * `package.json`, `paths` limited to `@/*`, separate GitHub remotes), so the only
 * alternatives were a copy or standing up shared infrastructure. The copy is
 * marked, referenced from both sides, and pinned by a mirrored test.
 *
 * WHAT WAS HERE BEFORE, measured against the real function:
 *
 *     "1.234,56"      ->  1.23456      a THOUSAND times too small
 *     "1234,56"       ->  123456       a HUNDRED times too big
 *     "1.234.567,89"  ->  1.234        ~a MILLION times too small
 *     "abc" / "" / null / undefined  ->  0        silent zero
 *     "Infinity"      ->  Infinity
 *
 * The third is the one worth staring at: `replace(/,/g,'')` turned it into
 * `"1.234.567.89"` and `parseFloat` stopped at the second dot, returning 1.234
 * without an error. `Number()` would have said NaN. **`parseFloat` is never the
 * right tool on a money path** — it does not fail, it truncates.
 *
 * TWO CONTRACTS, AND THE SPLIT IS A MEASUREMENT
 *
 *   parseUserNumber(text)  — what a HUMAN typed. Turkish and English forms both
 *                            accepted; ambiguity refused.
 *   toNumber(apiValue)     — what the API sent. Canonical only.
 *
 * They cannot be one function. The API returns money as canonical strings
 * (`capTotalAmount: number | string`, because the backend's decimal columns arrive
 * as strings), and in canonical form `"1.234"` unambiguously means 1.234. The
 * human grammar must call that same text AMBIGUOUS — a person typing `1.234` in a
 * tr-TR product could mean either. Running API values through the human grammar
 * would reject correct data; running human input through the canonical parser
 * would read `1.234,56` as garbage.
 */

export type NumericInputFailure = 'EMPTY' | 'AMBIGUOUS_SEPARATOR' | 'MALFORMED';

export interface NumericInputOk {
  readonly ok: true;
  readonly value: number;
  /** Canonical `-?\d+(\.\d+)?` — what the backend would receive. */
  readonly canonical: string;
}

export interface NumericInputErr {
  readonly ok: false;
  readonly reason: NumericInputFailure;
  readonly input: string;
}

export type NumericInputResult = NumericInputOk | NumericInputErr;

const DIGITS_ONLY = /^\d+$/;

/** A thousands group is ALWAYS exactly three digits; the leading one is one to three. */
function isThousandsGrouped(parts: string[]): boolean {
  if (parts.length < 2) return false;
  if (!/^\d{1,3}$/.test(parts[0])) return false;
  return parts.slice(1).every((p) => /^\d{3}$/.test(p));
}

/**
 * Parse text a person typed. Mirror of `parseNumericText` in the backend.
 *
 * Accepts `1234.56`, `1234`, `1.234,56`, `1,234.56`, `1234,56`, `1.234.567,89`.
 * Refuses `1.234` and `1,234`: a single separator followed by exactly three digits
 * with a legal leading group could be a thousands separator or a decimal point,
 * and guessing is what produced the defects above.
 */
export function parseUserNumber(input: unknown): NumericInputResult {
  if (input === null || input === undefined) {
    return { ok: false, reason: 'EMPTY', input: '' };
  }

  const raw = String(input).trim();
  if (raw === '') return { ok: false, reason: 'EMPTY', input: raw };

  const signMatch = /^([+-]?)(.*)$/.exec(raw)!;
  const sign = signMatch[1] === '-' ? '-' : '';
  const body = signMatch[2];
  if (body === '') return { ok: false, reason: 'MALFORMED', input: raw };

  // Digits and the two separators only. `Infinity`, `1e5`, `0x10` and currency
  // symbols are refused here, by the grammar rather than by a case for each.
  if (!/^[\d.,]+$/.test(body)) {
    return { ok: false, reason: 'MALFORMED', input: raw };
  }

  const hasDot = body.includes('.');
  const hasComma = body.includes(',');

  if (!hasDot && !hasComma) {
    return DIGITS_ONLY.test(body)
      ? finish(sign, body, '')
      : { ok: false, reason: 'MALFORMED', input: raw };
  }

  // Both separators: the LAST is the decimal point, the other groups thousands.
  if (hasDot && hasComma) {
    const decimalSep =
      body.lastIndexOf('.') > body.lastIndexOf(',') ? '.' : ',';
    const groupSep = decimalSep === '.' ? ',' : '.';
    const [wholePart, ...rest] = body.split(decimalSep);
    if (rest.length !== 1)
      return { ok: false, reason: 'MALFORMED', input: raw };
    const frac = rest[0];
    if (!DIGITS_ONLY.test(frac)) {
      return { ok: false, reason: 'MALFORMED', input: raw };
    }
    const groups = wholePart.split(groupSep);
    if (!isThousandsGrouped(groups)) {
      return { ok: false, reason: 'MALFORMED', input: raw };
    }
    return finish(sign, groups.join(''), frac);
  }

  const sep = hasDot ? '.' : ',';
  const parts = body.split(sep);

  // More than one of the same separator: it can only be grouping.
  if (parts.length > 2) {
    return isThousandsGrouped(parts)
      ? finish(sign, parts.join(''), '')
      : { ok: false, reason: 'MALFORMED', input: raw };
  }

  const [whole, frac] = parts;
  if (!DIGITS_ONLY.test(whole) || !DIGITS_ONLY.test(frac)) {
    return { ok: false, reason: 'MALFORMED', input: raw };
  }

  // Ambiguous only when BOTH sides fit a thousands grouping. `1234.567` does not
  // — `1234` is not a legal leading group — so it can only be a decimal.
  // A leading thousands group never starts with 0: 125 is written `125`, never
  // `0,125`. So `0,125` and `-0,125` can only be decimals — and `formatForEdit`
  // emits exactly that shape, which the previous test fixture (all <=2 decimals)
  // could not reveal. The formatter was producing text its own parser refused.
  if (frac.length === 3 && /^[1-9]\d{0,2}$/.test(whole)) {
    return { ok: false, reason: 'AMBIGUOUS_SEPARATOR', input: raw };
  }

  return finish(sign, whole, frac);
}

function finish(sign: string, whole: string, frac: string): NumericInputResult {
  const canonical = frac ? `${sign}${whole}.${frac}` : `${sign}${whole}`;
  // Safe in a way `Number(raw)` never was: the grammar admits only
  // `-?\d+(\.\d+)?`, so none of "" -> 0, "0x10" -> 16, "1e5", "Infinity" reach it.
  return { ok: true, value: Number(canonical), canonical };
}

/** Turkish message for immediate, inline feedback while the user is typing. */
export function describeNumericInputFailure(err: NumericInputErr): string {
  switch (err.reason) {
    case 'EMPTY':
      return 'Değer boş.';
    case 'AMBIGUOUS_SEPARATOR': {
      const [whole, frac] = err.input.replace(/^[+-]/, '').split(/[.,]/);
      // Both readings, each written so this parser accepts it. The decimal form
      // gets a fourth digit because three would be ambiguous all over again.
      return (
        `Belirsiz: '${err.input}'. Binlik için '${whole}${frac}', ` +
        `ondalık için '${whole},${frac}0' yazın.`
      );
    }
    case 'MALFORMED':
      return `Geçersiz sayı: '${err.input}'.`;
  }
}

/**
 * Convert a value the API sent. CANONICAL ONLY — never locale-formatted.
 *
 * The backend returns money as `number` or as a canonical decimal string, so this
 * does no separator guessing at all. `"1.234"` from the API is 1.234, full stop;
 * routing it through `parseUserNumber` would reject correct data as ambiguous.
 *
 * Returns `null` rather than 0 for anything unreadable. The previous version
 * returned 0 for `null`, `undefined`, `""` and `"abc"` alike — a silent zero
 * inherited by every one of its callers (CLAUDE.md §2.5).
 */
export function toNumber(
  value: string | number | null | undefined
): number | null {
  if (value === null || value === undefined) return null;
  if (typeof value === 'number') return Number.isFinite(value) ? value : null;
  const trimmed = value.trim();
  if (!/^-?\d+(\.\d+)?$/.test(trimmed)) return null;
  return Number(trimmed);
}

/**
 * Kept for the callers that genuinely want a number and have nothing to do with a
 * null. Every use is a place where a missing value is being treated as zero, so it
 * is spelled out at the call site rather than hidden inside the parser.
 */
export function toNumberOrZero(
  value: string | number | null | undefined
): number {
  return toNumber(value) ?? 0;
}

/** @deprecated Use {@link toNumber}; this name predates the null-vs-zero split. */
export function toNumberOrNull(
  value: string | number | null | undefined
): number | null {
  return toNumber(value);
}

/**
 * Render a number the way the user will be asked to type it back.
 *
 * The edit box used to open with `value.toString()` — `1234.56` — while the cell
 * beside it displayed `1.234,56`. The user saw two formats for one number and had
 * no way to know which one the field wanted; typing the one they had just been
 * shown silently lost three digits. Opening the box already formatted closes that
 * loop: what is displayed is what is accepted.
 */
export function formatForEdit(value: number | null | undefined): string {
  if (value === null || value === undefined) return '';
  // NO THOUSANDS GROUPING, and the round-trip test is what decided that.
  //
  // With grouping, `formatForEdit(1000)` produces `1.000` — which this module's
  // own grammar refuses as AMBIGUOUS, because `1.000` could be a thousand or one
  // point zero. The formatter would have been emitting text its own parser could
  // not read, on the most ordinary value there is.
  //
  // Dropping the grouping removes the whole class: every output is unambiguous by
  // construction. What mattered was never the grouping dots — it was the DECIMAL
  // COMMA, and that is kept. A user who does type `1.234,56` is still accepted;
  // they are simply not handed a value they would have to fix.
  // NO ROUNDING. `maximumFractionDigits: 4` was silently lossy, and T-109 makes
  // that reachable: opening a cell and blurring WITHOUT TYPING would format the
  // value, parse the formatted text back, and save the rounded result. Measured
  // before this changed:
  //
  //     1.23456     -> "1,2346"  -> 1.2346     the stored value changed
  //     0.00001     -> "0"       -> 0          by doing nothing
  //
  // The property this function has to keep is that `parse(format(x)) === x` for
  // every x a cell can hold, and a maximum below the value's own precision breaks
  // it by construction. 20 is the ceiling `Intl.NumberFormat` accepts and is above
  // any precision a `numeric` column can deliver.
  return new Intl.NumberFormat('tr-TR', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 20,
    useGrouping: false,
  }).format(value);
}


/**
 * T-109 step 2 (coordinator, KARAR (b)): what to do when a cell is closed by
 * something OTHER than its own save/cancel — i.e. the coordinator opened a
 * DIFFERENT cell and evicted this one.
 *
 * T-106 decided an unreadable value keeps the box open so the user can fix it.
 * That decision was made when only one cell could ever be open. A coordinator
 * makes a second kind of close possible: the user clicks away before fixing
 * it. Discarding the text at that point would be the exact silent drop T-106
 * rejected — so an eviction with unread text still in the box closes AND says
 * why, instead of closing silently.
 *
 * `closedByCoordinator` distinguishes the two closes structurally rather than
 * by inspecting anything about WHY: a cell's own save/cancel/Escape path sets
 * `closingSelfRef` to `true` before it acts, so this argument arrives `false`;
 * a close nothing in the cell asked for leaves the ref `false` and this
 * argument arrives `true`.
 */
export type CellAbandonment =
  | { readonly kind: 'silent' }
  | { readonly kind: 'notify'; readonly message: string };

export function decideCellAbandonment(
  closedByCoordinator: boolean,
  inputError: string | null
): CellAbandonment {
  if (closedByCoordinator && inputError) {
    return {
      kind: 'notify',
      message: 'Girilen değer okunamadı, kaydedilmedi.',
    };
  }
  return { kind: 'silent' };
}
