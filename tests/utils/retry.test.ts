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
