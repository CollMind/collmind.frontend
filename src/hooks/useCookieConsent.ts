import { useMemo } from 'react';
import { useCookieContext } from '@/context/CookieContext';

/**
 * Custom hook to check cookie consent status
 * 
 * @example
 * ```tsx
 * const { canUseAnalytics, canUseMarketing } = useCookieConsent();
 * 
 * useEffect(() => {
 *   if (canUseAnalytics) {
 *     // Initialize Google Analytics
 *   }
 * }, [canUseAnalytics]);
 * ```
 */
export function useCookieConsent() {
  const { cookieConsent } = useCookieContext();

  return useMemo(() => {
    if (!cookieConsent) {
      return {
        canUseFunctional: false,
        canUseAnalytics: false,
        canUseMarketing: false,
        hasConsent: false,
      };
    }

    return {
      canUseFunctional: cookieConsent.functional,
      canUseAnalytics: cookieConsent.analytics,
      canUseMarketing: cookieConsent.marketing,
      hasConsent: true,
    };
  }, [cookieConsent]);
}

