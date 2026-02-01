/**
 * Retry Utility
 * 
 * API istekleri için retry mekanizması
 */

export interface RetryOptions {
  maxRetries?: number;
  retryDelay?: number;
  retryCondition?: (error: any) => boolean;
}

const DEFAULT_OPTIONS: Required<RetryOptions> = {
  maxRetries: 3,
  retryDelay: 1000, // 1 saniye
  retryCondition: (error: any) => {
    // Sadece network error ve 5xx hatalarında retry yap
    const status = error.response?.status;
    return (
      !error.response || // Network error
      (status >= 500 && status < 600) // Server errors
    );
  },
};

/**
 * Promise'i retry mekanizması ile çalıştırır
 * 
 * @param fn - Çalıştırılacak async fonksiyon
 * @param options - Retry seçenekleri
 * @returns Promise
 * 
 * @example
 * ```ts
 * const result = await retry(
 *   () => apiClient.get('/users'),
 *   { maxRetries: 3, retryDelay: 1000 }
 * );
 * ```
 */
export async function retry<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  let lastError: any;

  for (let attempt = 0; attempt <= opts.maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error: any) {
      lastError = error;

      // Son deneme ise hata fırlat
      if (attempt === opts.maxRetries) {
        throw error;
      }

      // Retry condition kontrolü
      if (!opts.retryCondition(error)) {
        throw error;
      }

      // Exponential backoff: Her denemede bekleme süresini artır
      const delay = opts.retryDelay * Math.pow(2, attempt);
      await new Promise((resolve) => setTimeout(resolve, delay));

      // Log retry attempt
      if (import.meta.env.DEV) {
        console.warn(`Retry attempt ${attempt + 1}/${opts.maxRetries}`, {
          error: error.message,
          delay,
        });
      }
    }
  }

  throw lastError;
}

/**
 * Axios request için retry wrapper
 * 
 * @param requestFn - Axios request fonksiyonu
 * @param options - Retry seçenekleri
 * @returns Promise
 */
export function retryRequest<T>(
  requestFn: () => Promise<T>,
  options?: RetryOptions
): Promise<T> {
  return retry(requestFn, options);
}
