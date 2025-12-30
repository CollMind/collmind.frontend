export type CookieCategory = 'necessary' | 'functional' | 'analytics' | 'marketing';

export interface CookiePreferences {
  necessary: boolean;
  functional: boolean;
  analytics: boolean;
  marketing: boolean;
}

export interface CookieConsent {
  timestamp: string;
  version: string;
  preferences: CookiePreferences;
}

export interface CookieCategoryInfo {
  id: CookieCategory;
  title: string;
  description: string;
  required?: boolean;
}

