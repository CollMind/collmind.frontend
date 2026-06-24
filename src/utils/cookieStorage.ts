import type { CookieConsent, CookiePreferences } from '@/types/cookie.types';

const STORAGE_KEY = 'gdpr-consent';
export const CONSENT_VERSION = '1.0';
export const CONSENT_DURATION_DAYS = 365;

/**
 * Reads cookie consent from localStorage
 */
export function getCookieConsent(): CookieConsent | null {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return null;

    const consent: CookieConsent = JSON.parse(stored);
    return consent;
  } catch (error) {
    console.error('Error reading cookie consent:', error);
    return null;
  }
}

/**
 * Saves cookie consent to localStorage
 */
export function saveCookieConsent(preferences: CookiePreferences): void {
  try {
    const consent: CookieConsent = {
      timestamp: new Date().toISOString(),
      version: CONSENT_VERSION,
      preferences,
    };

    localStorage.setItem(STORAGE_KEY, JSON.stringify(consent));
  } catch (error) {
    console.error('Error saving cookie consent:', error);
  }
}

/**
 * Checks if cookie consent is valid
 * - Returns false if no consent exists
 * - Returns false if version changed
 * - Returns false if 365 days have passed
 */
export function isCookieConsentValid(): boolean {
  const consent = getCookieConsent();
  if (!consent) return false;

  // Version check
  if (consent.version !== CONSENT_VERSION) return false;

  // Duration check (365 days)
  const consentDate = new Date(consent.timestamp);
  const now = new Date();
  const daysDiff =
    (now.getTime() - consentDate.getTime()) / (1000 * 60 * 60 * 24);

  return daysDiff < CONSENT_DURATION_DAYS;
}

/**
 * Clears cookie consent (for testing)
 */
export function clearCookieConsent(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch (error) {
    console.error('Error clearing cookie consent:', error);
  }
}

/**
 * Default cookie preferences
 */
export function getDefaultPreferences(): CookiePreferences {
  return {
    necessary: true, // Always true
    functional: false,
    analytics: false,
    marketing: false,
  };
}
