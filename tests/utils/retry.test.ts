import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { retry, retryRequest } from '@/utils/retry';

describe('retry', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should succeed on first attempt', async () => {
    const fn = vi.fn().mockResolvedValue('success');

    const result = await retry(fn);

    expect(result).toBe('success');
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('should retry on failure and succeed', async () => {
    const fn = vi
      .fn()
      .mockRejectedValueOnce(new Error('Network error'))
      .mockResolvedValue('success');

    const promise = retry(fn, { maxRetries: 2, retryDelay: 100 });

    // Fast-forward time for retry delay
    await vi.advanceTimersByTimeAsync(100);
    const result = await promise;

    expect(result).toBe('success');
    expect(fn).toHaveBeenCalledTimes(2);
  });

  it('should fail after max retries', async () => {
    const error = new Error('Network error');
    const fn = vi.fn().mockRejectedValue(error);

    const promise = retry(fn, { maxRetries: 2, retryDelay: 100 });
    // Attach a handler synchronously so this rejection is never briefly
    // "unhandled": `retry()`'s rejection can settle on a microtask before
    // the `advanceTimersByTimeAsync` line below runs, and Node/Vitest flag
    // that window regardless of the `.rejects` assertion attached later —
    // it doesn't suppress the real assertion, just avoids the race (see
    // T-040: this produced a genuine "AxiosError could not be cloned"
    // worker-serialization failure for the same root cause elsewhere).
    promise.catch(() => {});

    // Fast-forward time for all retries
    await vi.advanceTimersByTimeAsync(300);

    await expect(promise).rejects.toBe(error);
    expect(fn).toHaveBeenCalledTimes(3); // Initial + 2 retries
  });

  it('should not retry if condition returns false', async () => {
    const error = new Error('Client error');
    (error as any).response = { status: 400 };
    const fn = vi.fn().mockRejectedValue(error);

    const retryCondition = (err: any) => {
      // Only retry on 5xx errors
      return err.response?.status >= 500;
    };

    const promise = retry(fn, {
      maxRetries: 2,
      retryDelay: 100,
      retryCondition,
    });
    // See comment on the equivalent line in the previous test — this
    // rejects synchronously (retryCondition is false, no delay awaited),
    // before any handler is otherwise attached.
    promise.catch(() => {});

    await vi.advanceTimersByTimeAsync(100);

    await expect(promise).rejects.toBe(error);
    expect(fn).toHaveBeenCalledTimes(1); // No retries
  });

  it('should use exponential backoff', async () => {
    const fn = vi
      .fn()
      .mockRejectedValueOnce(new Error('Error 1'))
      .mockRejectedValueOnce(new Error('Error 2'))
      .mockResolvedValue('success');

    const retryDelay = 100;
    const promise = retry(fn, { maxRetries: 2, retryDelay });

    // First retry: 100ms
    await vi.advanceTimersByTimeAsync(100);
    // Second retry: 200ms (exponential)
    await vi.advanceTimersByTimeAsync(200);
    const result = await promise;

    expect(result).toBe('success');
    expect(fn).toHaveBeenCalledTimes(3);
  });

  it('should work with retryRequest wrapper', async () => {
    const requestFn = vi.fn().mockResolvedValue({ data: 'success' });

    const result = await retryRequest(requestFn);

    expect(result).toEqual({ data: 'success' });
    expect(requestFn).toHaveBeenCalledTimes(1);
  });
});
