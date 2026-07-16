import { test, expect } from '../fixtures/hub';
import { HUB_PATH } from '../fixtures/hub';

const connectButton = (page) =>
  page.locator('.nav-item, .mobile-tab').filter({ hasText: /connect/i }).first();

test.describe('KRS Hub — Topbar-Collapse (Q2)', () => {
  test('Dashboard hat keinen Collapse-Toggle', async ({ hubPage: page }) => {
    await expect(page.getByTestId('topbar-collapse-toggle')).toHaveCount(0);
  });

  test('Toggle klappt ein, persistiert und klappt wieder aus', async ({ hubPage: page }) => {
    await expect(connectButton(page)).toBeVisible();
    await connectButton(page).click();

    const toggle = page.getByTestId('topbar-collapse-toggle');
    await expect(toggle).toHaveAttribute('aria-expanded', 'true');
    await toggle.click();
    await expect(page.locator('.topbar.collapsed')).toBeVisible();
    expect(await page.evaluate(() => localStorage.getItem('krs_hub_topbar_collapsed'))).toBe('1');

    await page.reload();
    await page.waitForFunction(() => typeof window.KRS_HUB_VERSION === 'string');
    await page.evaluate(() => { window.location.hash = '#/connect'; });
    await expect(page.locator('.topbar.collapsed')).toBeVisible();

    await page.getByTestId('topbar-collapse-toggle').click();
    await expect(page.locator('.topbar-title')).toBeVisible();
    expect(await page.evaluate(() => localStorage.getItem('krs_hub_topbar_collapsed'))).toBe('0');
  });

  test('Toggle hat mindestens 44 × 44 Pixel', async ({ hubPage: page }) => {
    await expect(connectButton(page)).toBeVisible();
    await connectButton(page).click();
    const box = await page.getByTestId('topbar-collapse-toggle').boundingBox();
    expect(box).not.toBeNull();
    expect(box!.width).toBeGreaterThanOrEqual(44);
    expect(box!.height).toBeGreaterThanOrEqual(44);
  });

  test('Mobile startet ohne Präferenz eingeklappt', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.addInitScript(() => localStorage.removeItem('krs_hub_topbar_collapsed'));
    await page.goto(`${HUB_PATH}?forceMode=demo`);
    await page.waitForFunction(() => typeof window.KRS_HUB_VERSION === 'string');
    await expect(connectButton(page)).toBeVisible();
    await connectButton(page).click();
    await expect(page.locator('.topbar.collapsed')).toBeVisible();
  });
});
