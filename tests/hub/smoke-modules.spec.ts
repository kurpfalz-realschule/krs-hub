import { test, expect } from '../fixtures/hub';

const connectButton = (page) =>
  page.locator('.nav-item').filter({ hasText: /connect/i }).first();

test.describe('KRS Hub — Modul-Switch', () => {
  test('Connect-Modul öffnet genau ein iframe', async ({ hubPage: page }) => {
    await expect(connectButton(page)).toBeVisible();
    await connectButton(page).click();
    await expect(page.locator('iframe[src*="krs-connect"]')).toHaveCount(1);
  });

  test('Hash-Router setzt #/connect', async ({ hubPage: page }) => {
    await expect(connectButton(page)).toBeVisible();
    await connectButton(page).click();
    await expect(page).toHaveURL(/#\/connect/);
  });

  test('Homepage-Link ist auf dem Dashboard verfügbar', async ({ hubPage: page }) => {
    await page.evaluate(() => { window.location.hash = '#/'; });
    await expect(page.locator('a[href*="realschule-schriesheim.de"]').first()).toBeVisible();
  });
});
