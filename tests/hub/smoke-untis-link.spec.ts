import { test, expect } from '../fixtures/hub';

const EXPECTED_URL = 'https://kurpfalz-realschule-schriesheim69198.webuntis.com/WebUntis/?school=kurpfalz-realschule-schriesheim69198#/basic/login';

test.describe('KRS Hub — Untis-Link (Q1)', () => {
  test('tenant.js liefert die direkte URL', async ({ hubPage: page }) => {
    expect(await page.evaluate(() => window.KRS_TENANT?.UNTIS_URL)).toBe(EXPECTED_URL);
  });

  test('Dashboard verlinkt die direkte Login-Seite', async ({ hubPage: page }) => {
    const link = page.locator('a.module-card').filter({ hasText: 'Untis' }).first();
    await expect(link).toBeVisible();
    await expect(link).toHaveAttribute('href', EXPECTED_URL);
    await expect(link).toHaveAttribute('target', '_blank');
    await expect(page.locator('a[href*="mese.webuntis.com"]')).toHaveCount(0);
  });
});
