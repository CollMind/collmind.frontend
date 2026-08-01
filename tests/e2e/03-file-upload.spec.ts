import fs from 'fs';
import os from 'os';
import path from 'path';
import { test, expect } from '@playwright/test';
import { apiLogin, closeSession, SEED_USERS, Session } from './support/api';
import { loginViaUi } from './support/ui-auth';

/**
 * T-016 — scenario 3: multipart file upload (FormData).
 *
 * What this catches that backend e2e / frontend unit tests cannot: the
 * real bug this session found (`src/api/client.ts` — the axios instance's
 * default `Content-Type: application/json` header stomped the multipart
 * boundary on every FormData request, so uploads always 500'd) lives
 * entirely in the browser's real `fetch`/XHR + `FormData` machinery.
 * Backend e2e never exercises the frontend's axios client at all, and the
 * frontend unit suite mocks axios (see T-040 task notes: "useCustomerImport's
 * happy path test was actually hitting a 500" — a mocked client can't
 * reproduce a header-construction bug). Only a real browser driving a real
 * `<input type="file">` through the real interceptor chain proves this.
 *
 * Customer import was picked as the representative upload flow (of the
 * three the bug affected — off-invoice, on-invoice, customer import) for
 * being the simplest to fixture/clean up without touching budget state.
 */

test.describe('Customer CSV import — multipart FormData upload (T-016 scenario 3)', () => {
  let admin: Session;
  const customerCode = `E2E-PW-UPLOAD-${Date.now()}`;
  let csvPath: string;

  test.beforeAll(async () => {
    admin = await apiLogin(SEED_USERS.ADMIN);
    csvPath = path.join(os.tmpdir(), `${customerCode}.csv`);
    fs.writeFileSync(
      csvPath,
      `code,name,channel\n${customerCode},E2E Playwright Upload Customer,RETAIL\n`
    );
  });

  test.afterAll(async () => {
    fs.rmSync(csvPath, { force: true });
    // Best-effort cleanup: find and delete the customer this test created.
    const res = await admin.ctx.get(`/customers/code/${customerCode}`, {
      headers: { Authorization: `Bearer ${admin.accessToken}` },
    });
    if (res.ok()) {
      const customer = await res.json();
      await admin.ctx.delete(`/customers/${customer.id}`, {
        headers: { Authorization: `Bearer ${admin.accessToken}` },
      });
    }
    await closeSession(admin);
  });

  test('CSV yükleme → multipart boundary bozulmadan sunucuya ulaşır, müşteri oluşturulur', async ({
    page,
  }) => {
    await loginViaUi(page, SEED_USERS.ADMIN);
    await page.goto('/customers');

    await page.getByRole('button', { name: 'Toplu İçe Aktar' }).click();
    await expect(
      page.getByRole('heading', { name: 'Müşteri Toplu İçe Aktarma' })
    ).toBeVisible();

    await page.locator('#file-upload').setInputFiles(csvPath);
    // Filename is rendered twice (icon label + size caption below) — assert
    // the first occurrence rather than over-narrowing the locator.
    await expect(page.getByText(`${customerCode}.csv`).first()).toBeVisible();

    await page.getByRole('button', { name: 'İçe Aktar' }).click();

    // A stomped multipart boundary would surface as a 500 -> toast error
    // ("API Error"/500 handling in client.ts) instead of this success path.
    await expect(page.getByText(/başarıyla içe aktarıldı/i)).toBeVisible({
      timeout: 15_000,
    });

    // Cross-check against the backend directly — the UI's optimistic
    // success toast alone wouldn't catch a case where the toast fires but
    // the row was never actually persisted.
    const res = await admin.ctx.get(`/customers/code/${customerCode}`, {
      headers: { Authorization: `Bearer ${admin.accessToken}` },
    });
    expect(res.ok()).toBe(true);
    const created = await res.json();
    expect(created.name).toBe('E2E Playwright Upload Customer');
  });
});
