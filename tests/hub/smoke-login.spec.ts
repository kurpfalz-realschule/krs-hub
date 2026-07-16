import { test, expect } from '@playwright/test';
import { HUB_PATH } from '../fixtures/hub';

test.describe('KRS Hub — Login-Screen', () => {
  test('ohne Session erscheint der E-Mail-Login', async ({ page }) => {
    await page.goto(HUB_PATH);
    await expect(page.locator('.login-screen')).toBeVisible({ timeout: 20_000 });
    await expect(page.getByTestId('login-email')).toBeVisible();
    await expect(page.getByTestId('login-password')).toBeVisible();
    await expect(page.getByTestId('login-submit')).toBeDisabled();
    await expect(page.locator('.pin-digit')).toHaveCount(0);
  });

  test('fremde Domain wird clientseitig abgelehnt', async ({ page }) => {
    await page.goto(HUB_PATH);
    await expect(page.locator('.login-screen')).toBeVisible({ timeout: 20_000 });
    await page.getByTestId('login-email').fill('jemand@gmail.com');
    await page.getByTestId('login-password').fill('egal-123');
    await page.getByTestId('login-submit').click();
    await expect(page.locator('.login-status.error')).toContainText(
      'realschule-schriesheim.de',
      { timeout: 4_000 },
    );
  });

  test('Demo-Hook überspringt den Login', async ({ page }) => {
    await page.goto(`${HUB_PATH}?forceMode=demo`);
    await expect(page.locator('.shell')).toBeVisible({ timeout: 10_000 });
    await expect(page.locator('.login-screen')).toHaveCount(0);
  });
});
