import { test, expect } from '@playwright/test';
import { SEED_USERS } from './support/api';
import { loginViaUi } from './support/ui-auth';

/**
 * T-016 — scenario 1: login + role-based UI.
 *
 * What this catches that backend e2e (209 tests) cannot: the backend's
 * RBAC guards prove a role CAN'T call a forbidden endpoint — they say
 * nothing about whether the UI ever *offers* that action in the first
 * place (Sidebar.tsx's per-role nav arrays, src/components/layout/
 * Sidebar.tsx). A regression that adds "Plan Onayları" to the PLANNER
 * sidebar (BRD: "Planner ... plan onaylayamaz") would be invisible to
 * every backend test and only observable by rendering the UI as that role.
 */

test.describe('Login + role-based UI (T-016 scenario 1)', () => {
  test('yanlış şifre ile giriş → hata mesajı gösterilir, dashboard yüklenmez', async ({
    page,
  }) => {
    await page.goto('/login');
    await page.getByPlaceholder('you@example.com').fill(SEED_USERS.ADMIN.email);
    await page.getByPlaceholder('Enter your password').fill('WrongPassword999!');
    await page.getByRole('button', { name: 'Sign In' }).click();

    // T-050 fix: src/api/client.ts's global 401 interceptor used to treat
    // the login endpoint's own 401 like any protected-route 401 — it
    // attempted a token refresh, found no refresh token (never having
    // logged in), and overwrote the real login error with "No refresh
    // token" before LoginForm ever saw it. /auth/login (and /auth/refresh)
    // are now exempt from the refresh flow, so the backend's actual
    // rejection reaches useLogin's onError untouched.
    //
    // Note: the real message is the backend's own 401 body
    // (UnauthorizedException('Invalid credentials'), see
    // collmind.backend/src/modules/user/user.service.ts) — NOT the
    // "Invalid email or password" string in LoginForm.tsx, which is only a
    // fallback for the (rarer) case where the error has no response body
    // at all (e.g. a network failure). Asserting the exact backend message
    // here is the whole point: it proves the interceptor no longer
    // clobbers it with "No refresh token".
    const alert = page.getByRole('alert').last();
    await expect(alert).toBeVisible();
    await expect(alert).toContainText('Invalid credentials');
    await expect(alert).not.toContainText('No refresh token');
    await expect(page).toHaveURL(/\/login/);
  });

  test('ADMIN girişi → "Admin" menüsü ve alt öğeleri görünür', async ({ page }) => {
    await loginViaUi(page, SEED_USERS.ADMIN);

    // Sidebar.tsx auto-expands the Admin menu for ADMIN users on mount —
    // don't click it (a click would just toggle it back closed). `exact`
    // is required: the top navbar's user menu button is also named
    // "SA System Admin ADMIN", which substring-matches "Admin".
    await expect(
      page.getByRole('button', { name: 'Admin', exact: true })
    ).toBeVisible();
    await expect(page.getByRole('link', { name: 'Kullanıcılar' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'KPI Yönetimi' })).toBeVisible();
  });

  test('PLANNER girişi → "Admin" menüsü YOK, "Plan Onayları" YOK (BRD: planner onaylayamaz)', async ({
    page,
  }) => {
    await loginViaUi(page, SEED_USERS.PLANNER);

    // Sidebar has rendered (Dashboard link always present) — asserting
    // absence before this would risk a false-negative from a still-loading
    // page rather than a genuine "not offered to this role".
    await expect(page.getByRole('link', { name: 'Dashboard' })).toBeVisible();
    await expect(
      page.getByRole('button', { name: 'Admin', exact: true })
    ).toHaveCount(0);

    // "Planlama" grubu kapalı — genişletmeden "Plan Onayları" hiç DOM'a
    // render edilmiyor (Sidebar.tsx: `{isExpanded && ... children}`), yani
    // genişletmeden yapılacak bir "yok" iddiası anlamsız olurdu (kapalı
    // her menü için otomatik geçerdi). Genişletip asıl kontrolü yap.
    await page.getByRole('button', { name: 'Planlama' }).click();
    await expect(page.getByRole('link', { name: 'Plan Onayları' })).toHaveCount(0);
    // Planner still has "Planlar" (can create/edit own draft plans).
    await expect(page.getByRole('link', { name: 'Planlar' })).toBeVisible();
  });

  test('CATEGORY_MANAGER girişi → "Plan Onayları" görünür, "Admin" YOK (BRD: kategori onaylıyor, admin değil)', async ({
    page,
  }) => {
    await loginViaUi(page, SEED_USERS.CATEGORY_MANAGER);

    await expect(page.getByRole('link', { name: 'Dashboard' })).toBeVisible();
    await expect(
      page.getByRole('button', { name: 'Admin', exact: true })
    ).toHaveCount(0);

    // "Planlama" grubu kapalı olabilir — genişletip görünürlüğü doğrula.
    const planlamaGroup = page.getByRole('button', { name: 'Planlama' });
    await planlamaGroup.click();
    await expect(page.getByRole('link', { name: 'Plan Onayları' })).toBeVisible();
  });
});
