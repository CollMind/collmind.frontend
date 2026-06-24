# Cookie Banner Usage Guide

## Overview

The GDPR-compliant cookie banner system has been successfully integrated. This system allows users to manage their cookie preferences and obtain consent in accordance with GDPR requirements.

## Basic Usage

### Integration in App.tsx

The cookie banner is already integrated into `App.tsx`:

```tsx
import { CookieProvider } from '@/context/CookieContext';
import { CookieBanner } from '@/components/CookieBanner';

function App() {
  return (
    <CookieProvider>
      <RouterProvider router={router} />
      <CookieBanner position="bottom" />
    </CookieProvider>
  );
}
```

## Checking Cookie Preferences

### Using the useCookieConsent Hook

To check cookie preferences in a component:

```tsx
import { useCookieConsent } from '@/hooks/useCookieConsent';
import { useEffect } from 'react';

function AnalyticsComponent() {
  const { canUseAnalytics, canUseMarketing, hasConsent } = useCookieConsent();

  useEffect(() => {
    if (canUseAnalytics) {
      // Initialize Google Analytics or another analytics service
      console.log('Analytics enabled');
    }
  }, [canUseAnalytics]);

  if (!hasConsent) {
    return null; // Consent not yet obtained
  }

  return (
    <div>
      {canUseAnalytics && <AnalyticsScript />}
      {canUseMarketing && <MarketingScript />}
    </div>
  );
}
```

## Cookie Settings Button

To open cookie settings from the footer or settings page:

```tsx
import { CookieSettingsButton } from '@/components/CookieSettingsButton';

function Footer() {
  return (
    <footer>
      <CookieSettingsButton variant="ghost" size="sm">
        Cookie Settings
      </CookieSettingsButton>
    </footer>
  );
}
```

## Cookie Banner Positioning

To change the cookie banner position:

```tsx
// Bottom (default)
<CookieBanner position="bottom" />

// Bottom centered
<CookieBanner position="bottom-center" />

// Top
<CookieBanner position="top" />
```

## Programmatically Managing Cookie Preferences

```tsx
import { useCookieContext } from '@/context/CookieContext';

function AdminPanel() {
  const {
    acceptAll,
    rejectAll,
    updatePreferences,
    resetConsent,
    openPreferences,
  } = useCookieContext();

  return (
    <div>
      <button onClick={acceptAll}>Accept All</button>
      <button onClick={rejectAll}>Reject All</button>
      <button onClick={openPreferences}>Open Preferences</button>
      <button onClick={resetConsent}>Reset Consent (for testing)</button>
    </div>
  );
}
```

## LocalStorage Structure

Cookie preferences are saved to localStorage in the following format:

```json
{
  "gdpr-consent": {
    "timestamp": "2024-01-15T10:30:00Z",
    "version": "1.0",
    "preferences": {
      "necessary": true,
      "functional": false,
      "analytics": false,
      "marketing": false
    }
  }
}
```

## Features

- ✅ Automatic display on first visit
- ✅ 365-day consent duration
- ✅ Version control (asks again when banner is updated)
- ✅ Detailed category management (Necessary, Functional, Analytics, Marketing)
- ✅ Responsive design
- ✅ Dark mode support
- ✅ Accessibility (ARIA labels, keyboard navigation)
- ✅ Animated entry/exit
- ✅ Modal scroll lock
- ✅ Close modal with ESC key

## Testing

To reset cookie preferences (for development/testing purposes):

```tsx
import { clearCookieConsent } from '@/utils/cookieStorage';

// Run in console:
clearCookieConsent();
// Refresh the page
```

Or using the Context API:

```tsx
const { resetConsent } = useCookieContext();
resetConsent(); // Banner will be shown again
```

## Customization

### Changing Cookie Categories

Edit the `COOKIE_CATEGORIES` array in `src/components/CookiePreferencesModal/CookiePreferencesModal.tsx`.

### Changing Consent Duration

Modify the `CONSENT_DURATION_DAYS` variable in `src/utils/cookieStorage.ts`.

### Version Update

When you update the banner, increment the `CONSENT_VERSION` value in `src/utils/cookieStorage.ts` to ask all users again.
