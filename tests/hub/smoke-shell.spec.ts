import { test, expect, openHub } from '../fixtures/hub';

test.describe('KRS Hub — Shell', () => {
  test('lädt im Demo-Modus mit Version-Marker', async ({ page }) => {
    await openHub(page);
    expect(await page.evaluate(() => window.KRS_HUB_VERSION)).toMatch(/^\d/);
  });

  test('forceMode=demo überspringt den Login', async ({ page }) => {
    await openHub(page);
    await expect(page.locator('.login-screen')).toHaveCount(0);
    await expect(page.locator('input[placeholder*="Kürzel"], input[name*="kuerzel"]')).toHaveCount(0);
  });

  test('Demo-Profil zeigt die Hub-Shell', async ({ hubPage: page }) => {
    await expect(page.locator('.sidebar')).toBeVisible();
    await expect(page.locator('.topbar-user')).toBeVisible();
  });

  test('Modul-Navigation enthält Connect, Plan und Buchung', async ({ hubPage: page }) => {
    const nav = page.locator('.sidebar-nav');
    await expect(nav.getByRole('button', { name: /Connect/ })).toBeVisible();
    await expect(nav.getByRole('button', { name: /Klassenarbeiten/ })).toBeVisible();
    await expect(nav.getByRole('button', { name: /iPad-Buchung/ })).toBeVisible();
  });

  test('beim Start entstehen keine kritischen Console-Fehler', async ({ page }) => {
    const errors: string[] = [];
    page.on('console', (message) => {
      if (message.type() === 'error') errors.push(message.text());
    });
    page.on('pageerror', (error) => errors.push(error.message));

    await openHub(page);
    await page.waitForTimeout(1_500);

    const critical = errors.filter((error) =>
      !/favicon|manifest|Failed to load resource|cdn\.jsdelivr/i.test(error),
    );
    expect(critical).toEqual([]);
  });
});
