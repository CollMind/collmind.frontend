import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
} from 'react';
import type { CookiePreferences } from '@/types/cookie.types';
import {
  getCookieConsent,
  saveCookieConsent,
  isCookieConsentValid,
  getDefaultPreferences,
} from '@/utils/cookieStorage';

interface CookieContextType {
  cookieConsent: CookiePreferences | null;
  showBanner: boolean;
  showPreferences: boolean;
  acceptAll: () => void;
  rejectAll: () => void;
  updatePreferences: (preferences: CookiePreferences) => void;
  openPreferences: () => void;
  closePreferences: () => void;
  resetConsent: () => void;
}

const CookieContext = createContext<CookieContextType | undefined>(undefined);

export function CookieProvider({ children }: { children: React.ReactNode }) {
  const [cookieConsent, setCookieConsent] = useState<CookiePreferences | null>(
    null
  );
  const [showBanner, setShowBanner] = useState(false);
  const [showPreferences, setShowPreferences] = useState(false);

  // Check consent status on initial load
  useEffect(() => {
    const consent = getCookieConsent();
    const isValid = isCookieConsentValid();

    if (consent && isValid) {
      setCookieConsent(consent.preferences);
      setShowBanner(false);
    } else {
      setCookieConsent(null);
      setShowBanner(true);
    }
  }, []);

  const acceptAll = useCallback(() => {
    const preferences: CookiePreferences = {
      necessary: true,
      functional: true,
      analytics: true,
      marketing: true,
    };

    saveCookieConsent(preferences);
    setCookieConsent(preferences);
    setShowBanner(false);
    setShowPreferences(false);
  }, []);

  const rejectAll = useCallback(() => {
    const preferences: CookiePreferences = {
      necessary: true, // Necessary cookies are always true
      functional: false,
      analytics: false,
      marketing: false,
    };

    saveCookieConsent(preferences);
    setCookieConsent(preferences);
    setShowBanner(false);
    setShowPreferences(false);
  }, []);

  const updatePreferences = useCallback((preferences: CookiePreferences) => {
    // Necessary should always be true
    const validPreferences: CookiePreferences = {
      ...preferences,
      necessary: true,
    };

    saveCookieConsent(validPreferences);
    setCookieConsent(validPreferences);
    setShowBanner(false);
    setShowPreferences(false);
  }, []);

  const openPreferences = useCallback(() => {
    setShowPreferences(true);
    setShowBanner(false);
  }, []);

  const closePreferences = useCallback(() => {
    setShowPreferences(false);
  }, []);

  const resetConsent = useCallback(() => {
    setCookieConsent(null);
    setShowBanner(true);
    setShowPreferences(false);
  }, []);

  const value: CookieContextType = {
    cookieConsent,
    showBanner,
    showPreferences,
    acceptAll,
    rejectAll,
    updatePreferences,
    openPreferences,
    closePreferences,
    resetConsent,
  };

  return (
    <CookieContext.Provider value={value}>{children}</CookieContext.Provider>
  );
}

export function useCookieContext() {
  const context = useContext(CookieContext);
  if (context === undefined) {
    throw new Error('useCookieContext must be used within a CookieProvider');
  }
  return context;
}
