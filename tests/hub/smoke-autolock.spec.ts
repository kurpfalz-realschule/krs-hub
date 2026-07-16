import { test, expect, openHub } from '../fixtures/hub';

async function openMenu(page) {
  await page.locator('.topbar-user').click();
  await expect(page.getByTestId('usermenu-autolock')).toBeVisible();
}

test.describe('KRS Hub — Auto-Sperre', () => {
  test('ist standardmäßig aus', async ({ page }) => {
    await openHub(page, { user: 'Ko' });
    await openMenu(page);
    await expect(page.getByTestId('usermenu-autolock')).toContainText('Aus');
    await expect(page.getByTestId('usermenu-autolock-min')).toHaveCount(0);
    expect(await page.evaluate(() => localStorage.getItem('krs_hub_autolock'))).toBeNull();
  });

  test('Opt-in wird gespeichert', async ({ page }) => {
    await openHub(page, { user: 'Ko' });
    await openMenu(page);
    await page.getByTestId('usermenu-autolock').click();
    await expect(page.getByTestId('usermenu-autolock')).toContainText('An');
    await expect(page.getByTestId('usermenu-autolock-min')).toBeVisible();
    expect(await page.evaluate(() => localStorage.getItem('krs_hub_autolock'))).toBe('1');

    await page.reload();
    await page.waitForFunction(() => typeof window.KRS_HUB_VERSION === 'string');
    await openMenu(page);
    await expect(page.getByTestId('usermenu-autolock')).toContainText('An');
  });

  test('manuelles Sperren bleibt verfügbar', async ({ page }) => {
    await openHub(page, { user: 'Ko' });
    await openMenu(page);
    await page.getByRole('menuitem', { name: 'Jetzt sperren' }).click();
    await expect(page.locator('.lock-screen')).toBeVisible();
  });
});
