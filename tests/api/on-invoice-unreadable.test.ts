import { describe, it, expect } from 'vitest';
import { isUnreadable } from '@/api/endpoints/on-invoice.endpoints';

/**
 * T-098. The frontend half of this task had no test at all, and it is the half
 * where the failure mode lives: `Intl.NumberFormat().format(null)` renders
 * "₺0,00", so a row the backend marked unreadable would be drawn as a zero
 * balance unless something branches first.
 */
describe('isUnreadable (T-098)', () => {
  const row = (over: Partial<Parameters<typeof isUnreadable>[0]> = {}) => ({
    dataStatus: 'ok' as const,
    current: 100,
    after: 50,
    ...over,
  });

  it('lets a fully readable row through', () => {
    expect(isUnreadable(row())).toBe(false);
  });

  it('catches the row the backend marked unavailable', () => {
    expect(
      isUnreadable(
        row({ dataStatus: 'unavailable', current: null, after: null })
      )
    ).toBe(true);
  });

  // The pre-T-098 persisted shape: no dataStatus, and a zero that could be a real
  // balance, an unreadable envelope, or a missing one. Since those cannot be told
  // apart, printing ₺0,00 would assert a figure the data cannot support.
  it('treats a legacy row with no dataStatus as unknown, not as ok', () => {
    expect(isUnreadable({ current: 0, after: -500 })).toBe(true);
  });

  // Each of these alone is enough. Asserting them separately means a fix for one
  // signal cannot be mistaken for a fix for the other.
  it('catches a null current even when dataStatus claims ok', () => {
    expect(isUnreadable(row({ current: null }))).toBe(true);
  });

  it('catches a null after even when dataStatus claims ok', () => {
    expect(isUnreadable(row({ after: null }))).toBe(true);
  });

  // What makes the tests above discriminating rather than decorative: a predicate
  // returning true unconditionally would pass every one of them except this.
  it('is not simply always true', () => {
    expect(isUnreadable(row({ current: 0, after: 0 }))).toBe(false);
  });
});
