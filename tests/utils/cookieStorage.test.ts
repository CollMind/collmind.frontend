import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  getCookieConsent,
  saveCookieConsent,
  isCookieConsentValid,
  clearCookieConsent,
  getDefaultPreferences,
  CONSENT_VERSION,
  CONSENT_DURATION_DAYS,
} from '@/utils/cookieStorage';
import type { CookiePreferences } from '@/types/cookie.types';

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};

  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => {
      store[key] = value.toString();
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    },
  };
})();

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
});

describe('cookieStorage', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  describe('getCookieConsent', () => {
    it('returns null when no consent exists', () => {
      expect(getCookieConsent()).toBeNull();
    });

    it('returns consent when it exists', () => {
      const preferences: CookiePreferences = {
        necessary: true,
        functional: false,
        analytics: true,
        marketing: false,
      };
      saveCookieConsent(preferences);
      const consent = getCookieConsent();

      expect(consent).not.toBeNull();
      expect(consent?.preferences).toEqual(preferences);
      expect(consent?.version).toBe(CONSENT_VERSION);
      expect(consent?.timestamp).toBeDefined();
    });

    it('returns null on invalid JSON', () => {
      localStorage.setItem('gdpr-consent', 'invalid-json');
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      
      expect(getCookieConsent()).toBeNull();
      expect(consoleSpy).toHaveBeenCalled();
      
      consoleSpy.mockRestore();
    });
  });

  describe('saveCookieConsent', () => {
    it('saves consent to localStorage', () => {
      const preferences: CookiePreferences = {
        necessary: true,
        functional: true,
        analytics: false,
        marketing: false,
      };

      saveCookieConsent(preferences);
      const stored = localStorage.getItem('gdpr-consent');
      
      expect(stored).not.toBeNull();
      const parsed = JSON.parse(stored!);
      expect(parsed.preferences).toEqual(preferences);
      expect(parsed.version).toBe(CONSENT_VERSION);
      expect(parsed.timestamp).toBeDefined();
    });

    it('handles errors gracefully', () => {
      // Mock localStorage.setItem to throw an error
      const originalSetItem = localStorage.setItem;
      localStorage.setItem = vi.fn(() => {
        throw new Error('Storage quota exceeded');
      });
      
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      const preferences: CookiePreferences = getDefaultPreferences();
      
      expect(() => saveCookieConsent(preferences)).not.toThrow();
      expect(consoleSpy).toHaveBeenCalled();
      
      localStorage.setItem = originalSetItem;
      consoleSpy.mockRestore();
    });
  });

  describe('isCookieConsentValid', () => {
    it('returns false when no consent exists', () => {
      expect(isCookieConsentValid()).toBe(false);
    });

    it('returns false when version differs', () => {
      const preferences: CookiePreferences = getDefaultPreferences();
      saveCookieConsent(preferences);
      
      // Manually change version in localStorage
      const stored = localStorage.getItem('gdpr-consent');
      const consent = JSON.parse(stored!);
      consent.version = '2.0';
      localStorage.setItem('gdpr-consent', JSON.stringify(consent));
      
      expect(isCookieConsentValid()).toBe(false);
    });

    it('returns true when consent is recent', () => {
      const preferences: CookiePreferences = getDefaultPreferences();
      saveCookieConsent(preferences);
      
      expect(isCookieConsentValid()).toBe(true);
    });

    it('returns false when consent is expired', () => {
      const preferences: CookiePreferences = getDefaultPreferences();
      saveCookieConsent(preferences);
      
      // Manually set old timestamp
      const stored = localStorage.getItem('gdpr-consent');
      const consent = JSON.parse(stored!);
      const oldDate = new Date();
      oldDate.setDate(oldDate.getDate() - (CONSENT_DURATION_DAYS + 1));
      consent.timestamp = oldDate.toISOString();
      localStorage.setItem('gdpr-consent', JSON.stringify(consent));
      
      expect(isCookieConsentValid()).toBe(false);
    });
  });

  describe('clearCookieConsent', () => {
    it('removes consent from localStorage', () => {
      const preferences: CookiePreferences = getDefaultPreferences();
      saveCookieConsent(preferences);
      expect(getCookieConsent()).not.toBeNull();
      
      clearCookieConsent();
      expect(getCookieConsent()).toBeNull();
    });
  });

  describe('getDefaultPreferences', () => {
    it('returns default preferences with necessary always true', () => {
      const defaults = getDefaultPreferences();
      
      expect(defaults.necessary).toBe(true);
      expect(defaults.functional).toBe(false);
      expect(defaults.analytics).toBe(false);
      expect(defaults.marketing).toBe(false);
    });
  });
});

