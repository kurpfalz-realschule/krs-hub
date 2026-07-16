import { test, expect } from '../fixtures/hub';

async function lock(page) {
  await page.locator('.topbar-user').click();
  const item = page.getByRole('menuitem', { name: /Jetzt sperren/i });
  await expect(item).toBeVisible();
  await item.click();
  await expect(page.locator('.lock-screen')).toBeVisible();
}

test.describe('KRS Hub — Lockscreen', () => {
  test('User-Menü bietet die Sperre an', async ({ hubPage: page }) => {
    await page.locator('.topbar-user').click();
    await expect(page.getByRole('menuitem', { name: /Jetzt sperren/i })).toBeVisible();
  });

  test('Demo-Entsperren führt zurück ins Dashboard', async ({ hubPage: page }) => {
    await lock(page);
    const screen = page.locator('.lock-screen');
    await expect(screen.getByTestId('lock-password')).toHaveCount(0);
    await screen.getByTestId('lock-unlock').click();
    await expect(screen).toBeHidden();
    await expect(page.locator('.topbar-user')).toBeVisible();
  });

  test('Anderer Benutzer führt zurück zum Login', async ({ hubPage: page }) => {
    await lock(page);
    await page.locator('.lock-other-btn').click();
    await expect(page.locator('.login-screen')).toBeVisible();
  });
});
