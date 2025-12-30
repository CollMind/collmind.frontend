# Cookie Banner Tests

This directory contains unit tests for the GDPR-compliant cookie banner system.

## Running Tests

### Run all tests
```bash
npm test
```

### Run tests in watch mode
```bash
npm test -- --watch
```

### Run tests with UI
```bash
npm run test:ui
```

### Run tests with coverage
```bash
npm run test:coverage
```

### Run specific test file
```bash
npm test cookieStorage.test.ts
npm test CookieBanner.test.tsx
npm test CookiePreferencesModal.test.tsx
npm test useCookieConsent.test.tsx
```

## Test Structure

### `utils/cookieStorage.test.ts`
Tests for localStorage utility functions:
- `getCookieConsent()` - Reading consent from storage
- `saveCookieConsent()` - Saving consent to storage
- `isCookieConsentValid()` - Validation logic (version, expiration)
- `clearCookieConsent()` - Clearing consent
- `getDefaultPreferences()` - Default preference values

### `components/CookieBanner.test.tsx`
Tests for the CookieBanner component:
- Rendering when no consent exists
- Accept/Reject/Manage buttons functionality
- Modal opening behavior

### `components/CookiePreferencesModal.test.tsx`
Tests for the CookiePreferencesModal component:
- Modal rendering
- Category display
- Necessary cookies being disabled
- Save/Cancel/Accept All actions

### `hooks/useCookieConsent.test.tsx`
Tests for the useCookieConsent hook:
- Default state (no consent)
- Permission flags based on consent
- Consent state updates

## Test Utilities

### `cookie-test-utils.tsx`
Provides `renderWithCookieProvider` function that wraps components with all necessary providers:
- Redux Store
- React Query
- React Router
- Cookie Context

## Writing New Tests

When writing tests for cookie-related components:

1. Use `renderWithCookieProvider` from `@/tests/utils/cookie-test-utils` for component tests
2. Use the `wrapper` function for hook tests (see `useCookieConsent.test.tsx`)
3. Clear consent before each test with `clearCookieConsent()`
4. Use `saveCookieConsent()` to set up test data when needed

Example:
```tsx
import { describe, it, expect, beforeEach } from 'vitest';
import { renderWithCookieProvider } from '@/tests/utils/cookie-test-utils';
import { clearCookieConsent } from '@/utils/cookieStorage';

describe('MyComponent', () => {
  beforeEach(() => {
    clearCookieConsent();
  });

  it('should render correctly', () => {
    renderWithCookieProvider(<MyComponent />);
    // ... assertions
  });
});
```

## Debugging Tests

If a test fails:

1. Check if localStorage is being cleared properly
2. Ensure the CookieProvider is wrapping your component
3. Use `screen.debug()` to see the rendered output
4. Check for async operations with `waitFor()`

## Coverage Goals

- Utilities: 100%
- Components: >80%
- Hooks: >80%

