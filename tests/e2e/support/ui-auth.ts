import { Page, expect } from '@playwright/test';
import { SeedCredentials } from './api';

/**
 * CookieBanner.tsx renders on every fresh session (each Playwright test
 * gets a brand-new browser context, so this always appears) and, being
 * fixed-position at the bottom of the viewport, intercepts pointer events
 * for anything underneath it — including grid cells near the bottom of the
 * page. Dismiss it once up front rather than working around it per-click.
 */
export async function dismissCookieBanner(page: Page): Promise<void> {
  const acceptButton = page.getByRole('button', { name: 'Accept all cookies' });
  if (await acceptButton.isVisible().catch(() => false)) {
    await acceptButton.click();
  }
}

/**
 * Drives the real login form (not a storageState shortcut) — this suite's
 * role-based-menu scenario specifically needs to prove the UI form → auth
 * flow → role-conditional render chain works end to end, which a
 * pre-seeded localStorage token would skip over.
 */
export async function loginViaUi(page: Page, creds: SeedCredentials): Promise<void> {
  await page.goto('/login');
  await dismissCookieBanner(page);
  await page.getByPlaceholder('you@example.com').fill(creds.email);
  await page.getByPlaceholder('Enter your password').fill(creds.password);
  await page.getByRole('button', { name: 'Sign In' }).click();
  await expect(page).toHaveURL(/\/dashboard/, { timeout: 15_000 });
}
