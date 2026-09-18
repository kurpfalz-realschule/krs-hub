import { test as base, expect, Page } from '@playwright/test';

export { expect };

export const HUB_PATH = '/index.html';

export async function openHub(page: Page, opts: { user?: string } = {}) {
  const query = new URLSearchParams({ forceMode: 'demo' });
  if (opts.user) query.set('forceUser', opts.user);

  await page.goto(`${HUB_PATH}?${query.toString()}`);
  await page.waitForFunction(
    () => typeof window.KRS_HUB_VERSION === 'string',
    null,
    { timeout: 10_000 },
  );
  await expect(page.locator('.shell')).toBeVisible({ timeout: 10_000 });
}

export const test = base.extend<{ hubPage: Page }>({
  hubPage: async ({ page }, use) => {
    await openHub(page);
    await use(page);
  },
});

/**
 * v3.19.0 (18.09.2026): Die Startseite zeigt nur noch fünf Kacheln (Connect,
 * Klassenarbeiten, iPad-Buchung, Kalender, Dateiablage). Alles andere —
 * Schüler-Hub, Homepage, Untis, Hilfe und die archivierte Projektwoche — steht
 * hinter „Weitere Apps“ und ist zugeklappt. Tests, die eine dieser Kacheln
 * brauchen, klappen sie hiermit auf.
 */
export async function oeffneWeitereApps(page: Page) {
  const toggle = page.getByTestId('weitere-apps-toggle');
  await expect(toggle).toBeVisible({ timeout: 8_000 });
  if ((await toggle.getAttribute('aria-expanded')) !== 'true') await toggle.click();
  await expect(page.getByTestId('weitere-apps')).toBeVisible({ timeout: 5_000 });
}
