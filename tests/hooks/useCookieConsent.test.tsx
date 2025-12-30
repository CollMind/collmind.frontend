import { describe, it, expect, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useCookieConsent } from '@/hooks/useCookieConsent';
import { CookieProvider } from '@/context/CookieContext';
import { clearCookieConsent, saveCookieConsent } from '@/utils/cookieStorage';
import type { CookiePreferences } from '@/types/cookie.types';
import { Provider } from 'react-redux';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter } from 'react-router-dom';
import { store } from '@/store';
import { ReactNode } from 'react';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
    },
  },
});

function wrapper({ children }: { children: ReactNode }) {
  return (
    <Provider store={store}>
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <CookieProvider>{children}</CookieProvider>
        </BrowserRouter>
      </QueryClientProvider>
    </Provider>
  );
}

describe('useCookieConsent', () => {
  beforeEach(() => {
    clearCookieConsent();
  });

  it('returns false for all permissions when no consent exists', async () => {
    const { result } = renderHook(() => useCookieConsent(), { wrapper });

    await waitFor(() => {
      expect(result.current.hasConsent).toBe(false);
      expect(result.current.canUseFunctional).toBe(false);
      expect(result.current.canUseAnalytics).toBe(false);
      expect(result.current.canUseMarketing).toBe(false);
    });
  });

  it('returns correct permissions when consent exists', async () => {
    const preferences: CookiePreferences = {
      necessary: true,
      functional: true,
      analytics: true,
      marketing: false,
    };

    saveCookieConsent(preferences);

    const { result } = renderHook(() => useCookieConsent(), { wrapper });

    await waitFor(() => {
      expect(result.current.hasConsent).toBe(true);
      expect(result.current.canUseFunctional).toBe(true);
      expect(result.current.canUseAnalytics).toBe(true);
      expect(result.current.canUseMarketing).toBe(false);
    }, { timeout: 3000 });
  });

  it('returns false for all optional cookies when only necessary is accepted', async () => {
    const preferences: CookiePreferences = {
      necessary: true,
      functional: false,
      analytics: false,
      marketing: false,
    };

    saveCookieConsent(preferences);

    const { result } = renderHook(() => useCookieConsent(), { wrapper });

    await waitFor(() => {
      expect(result.current.hasConsent).toBe(true);
      expect(result.current.canUseFunctional).toBe(false);
      expect(result.current.canUseAnalytics).toBe(false);
      expect(result.current.canUseMarketing).toBe(false);
    }, { timeout: 3000 });
  });
});
