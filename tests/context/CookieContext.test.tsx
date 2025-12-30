import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { useCookieContext, CookieProvider } from '@/context/CookieContext';
import { clearCookieConsent, saveCookieConsent } from '@/utils/cookieStorage';
import type { CookiePreferences } from '@/types/cookie.types';
import { ReactNode } from 'react';

const wrapper = ({ children }: { children: ReactNode }) => (
  <CookieProvider>{children}</CookieProvider>
);

describe('CookieContext', () => {
  beforeEach(() => {
    clearCookieConsent();
  });

  it('provides default context values', async () => {
    const { result } = renderHook(() => useCookieContext(), { wrapper });

    await waitFor(() => {
      expect(result.current.showBanner).toBe(true);
      expect(result.current.showPreferences).toBe(false);
      expect(result.current.cookieConsent).toBeNull();
    });
  });

  it('shows banner when no consent exists', async () => {
    const { result } = renderHook(() => useCookieContext(), { wrapper });

    await waitFor(() => {
      expect(result.current.showBanner).toBe(true);
    });
  });

  it('hides banner when valid consent exists', async () => {
    const preferences: CookiePreferences = {
      necessary: true,
      functional: true,
      analytics: false,
      marketing: false,
    };
    saveCookieConsent(preferences);

    const { result } = renderHook(() => useCookieContext(), { wrapper });

    await waitFor(() => {
      expect(result.current.showBanner).toBe(false);
      expect(result.current.cookieConsent).toEqual(preferences);
    }, { timeout: 3000 });
  });

  it('accepts all cookies', async () => {
    const { result } = renderHook(() => useCookieContext(), { wrapper });

    await waitFor(() => {
      expect(result.current.showBanner).toBe(true);
    });

    act(() => {
      result.current.acceptAll();
    });

    await waitFor(() => {
      expect(result.current.cookieConsent).toEqual({
        necessary: true,
        functional: true,
        analytics: true,
        marketing: true,
      });
      expect(result.current.showBanner).toBe(false);
    });
  });

  it('rejects optional cookies', async () => {
    const { result } = renderHook(() => useCookieContext(), { wrapper });

    await waitFor(() => {
      expect(result.current.showBanner).toBe(true);
    });

    act(() => {
      result.current.rejectAll();
    });

    await waitFor(() => {
      expect(result.current.cookieConsent).toEqual({
        necessary: true,
        functional: false,
        analytics: false,
        marketing: false,
      });
      expect(result.current.showBanner).toBe(false);
    });
  });

  it('opens and closes preferences modal', async () => {
    const { result } = renderHook(() => useCookieContext(), { wrapper });

    act(() => {
      result.current.openPreferences();
    });

    expect(result.current.showPreferences).toBe(true);
    expect(result.current.showBanner).toBe(false);

    act(() => {
      result.current.closePreferences();
    });

    expect(result.current.showPreferences).toBe(false);
  });

  it('updates preferences', async () => {
    const { result } = renderHook(() => useCookieContext(), { wrapper });

    const preferences: CookiePreferences = {
      necessary: true,
      functional: true,
      analytics: false,
      marketing: false,
    };

    act(() => {
      result.current.updatePreferences(preferences);
    });

    await waitFor(() => {
      expect(result.current.cookieConsent).toEqual(preferences);
      expect(result.current.showBanner).toBe(false);
      expect(result.current.showPreferences).toBe(false);
    });
  });

  it('ensures necessary is always true when updating preferences', async () => {
    const { result } = renderHook(() => useCookieContext(), { wrapper });

    const preferences: CookiePreferences = {
      necessary: false, // Trying to set to false
      functional: true,
      analytics: true,
      marketing: true,
    };

    act(() => {
      result.current.updatePreferences(preferences);
    });

    await waitFor(() => {
      expect(result.current.cookieConsent?.necessary).toBe(true);
    });
  });

  it('resets consent', async () => {
    const preferences: CookiePreferences = {
      necessary: true,
      functional: true,
      analytics: true,
      marketing: true,
    };
    saveCookieConsent(preferences);

    const { result } = renderHook(() => useCookieContext(), { wrapper });

    await waitFor(() => {
      expect(result.current.showBanner).toBe(false);
    });

    act(() => {
      result.current.resetConsent();
    });

    await waitFor(() => {
      expect(result.current.showBanner).toBe(true);
      expect(result.current.cookieConsent).toBeNull();
    });
  });
});

