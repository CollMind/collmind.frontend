import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useDebounce } from '@/hooks/useDebounce';

// T-040: `advanceTimersByTimeAsync` zamanlayıcıyı ilerletir, ama tetiklediği
// React state güncellemesi `act()` ile sarılmazsa `result.current`'a yansıması
// GARANTİ DEĞİLDİR — genelde yansır, ara sıra yansımaz. "should debounce value
// changes" 6 koşumda 1 düşüyordu. Zamanlayıcı ilerletmeleri act() içine alındı;
// kararsızlığın kaynağı buydu, gerçek bir hook hatası değil.
const advance = async (ms: number) => {
  await act(async () => {
    await vi.advanceTimersByTimeAsync(ms);
  });
};

describe('useDebounce', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should return initial value immediately', () => {
    const { result } = renderHook(() => useDebounce('test', 500));

    expect(result.current).toBe('test');
  });

  it('should debounce value changes', async () => {
    const { result, rerender } = renderHook(
      ({ value, delay }) => useDebounce(value, delay),
      {
        initialProps: { value: 'initial', delay: 500 },
      }
    );

    expect(result.current).toBe('initial');

    rerender({ value: 'updated', delay: 500 });

    // Value should not change immediately
    expect(result.current).toBe('initial');

    // Fast-forward time
    await advance(500);

    expect(result.current).toBe('updated');
  });

  it('should cancel previous debounce on rapid changes', async () => {
    const { result, rerender } = renderHook(
      ({ value, delay }) => useDebounce(value, delay),
      {
        initialProps: { value: 'value1', delay: 500 },
      }
    );

    rerender({ value: 'value2', delay: 500 });
    await advance(300);

    rerender({ value: 'value3', delay: 500 });
    await advance(300);

    // Should still be initial value
    expect(result.current).toBe('value1');

    // Complete the delay
    await advance(200);

    expect(result.current).toBe('value3');
  });

  it('should work with different delay values', async () => {
    const { result, rerender } = renderHook(
      ({ value, delay }) => useDebounce(value, delay),
      {
        initialProps: { value: 'test', delay: 1000 },
      }
    );

    rerender({ value: 'updated', delay: 1000 });

    await advance(500);
    expect(result.current).toBe('test');

    await advance(500);

    expect(result.current).toBe('updated');
  });

  it('should work with number values', async () => {
    const { result, rerender } = renderHook(
      ({ value, delay }) => useDebounce(value, delay),
      {
        initialProps: { value: 0, delay: 500 },
      }
    );

    rerender({ value: 100, delay: 500 });

    await advance(500);

    expect(result.current).toBe(100);
  });

  it('should work with object values', async () => {
    const initialObj = { name: 'test' };
    const updatedObj = { name: 'updated' };

    const { result, rerender } = renderHook(
      ({ value, delay }) => useDebounce(value, delay),
      {
        initialProps: { value: initialObj, delay: 500 },
      }
    );

    rerender({ value: updatedObj, delay: 500 });

    await advance(500);

    expect(result.current).toEqual(updatedObj);
  });
});
