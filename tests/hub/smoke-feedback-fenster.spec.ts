import { test, expect, type Page } from '@playwright/test';

// Hub 3.34.1: Feedback war ohne Overlay-CSS im Seitenfluss und lag links.
// inert auf einem Vorfahren des Connect-iframes beendet die iOS-App.

async function expectFeedbackWindow(page: Page, width: number) {
  const overlay = page.getByTestId('hub-feedback-modal');
  await expect(overlay).toBeVisible();
  await expect(overlay).toHaveCSS('position', 'fixed');

  const shell = page.locator('.shell');
  const shellBox = await shell.boundingBox();
  expect(shellBox).toBeTruthy();
  expect(shellBox!.y).toBeLessThan(8);
  expect(shellBox!.height).toBeGreaterThan(700);

  const card = overlay.locator('.feedback-modal');
  const cardBox = await card.boundingBox();
  expect(cardBox).toBeTruthy();
  expect(cardBox!.width).toBeGreaterThan(280);
  expect(cardBox!.width).toBeLessThanOrEqual(width - 16);
  expect(Math.abs(cardBox!.x + cardBox!.width / 2 - width / 2)).toBeLessThan(24);

  await page.getByRole('button', { name: 'Fehler' }).click();
  const message = page.getByLabel('Deine Nachricht');
  await message.fill('Die Liste bleibt unter dem Fenster.');
  await expect(message).toHaveValue('Die Liste bleibt unter dem Fenster.');
  const send = page.getByRole('button', { name: 'Absenden' });
  await expect(send).toBeEnabled();
  const sendBox = await send.boundingBox();
  expect(sendBox).toBeTruthy();
  expect(sendBox!.y).toBeGreaterThanOrEqual(0);
  expect(sendBox!.y + sendBox!.height).toBeLessThanOrEqual(844);

  const coversFrame = await page.evaluate(() =>
    Array.from(document.querySelectorAll('[inert]')).some((el) => el.querySelector('iframe'))
  );
  expect(coversFrame).toBe(false);
  expect(await shell.evaluate((el) => el.hasAttribute('inert'))).toBe(false);
  await expect(page.locator('iframe[data-module="connect"]')).toBeAttached();

  await page.getByRole('button', { name: 'Abbrechen', exact: true }).click();
  await expect(overlay).toBeHidden();
  await expect(shell).toBeVisible();
  await expect(page.locator('iframe[data-module="connect"]')).toBeAttached();
}

for (const width of [390, 834]) {
  test(`Neues Design: Feedback liegt über der Liste (${width}px)`, async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem('krs_design_v2', '1');
      localStorage.setItem('krs_design_offer_seen', '1');
      localStorage.setItem('krs_hub_mitteilungen_seen', '["demo"]');
    });
    await page.setViewportSize({ width, height: 844 });
    await page.goto('/index.html?forceMode=demo#/connect');
    await expect(page.locator('.shell')).toBeVisible();
    await expect(page.locator('iframe[data-module="connect"]')).toBeAttached();
    await page.getByRole('button', { name: 'Feedback geben', exact: true }).click();
    await expectFeedbackWindow(page, width);
  });
}

test('Vertrautes Design: Feedback aus dem Konto-Menü (390px)', async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem('krs_design_v2', '0');
    localStorage.setItem('krs_design_offer_seen', '1');
    localStorage.setItem('krs_hub_topbar_collapsed', '0');
    localStorage.setItem('krs_hub_mitteilungen_seen', '["demo"]');
  });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/index.html?forceMode=demo#/connect');
  await expect(page.locator('.shell')).toBeVisible();
  await expect(page.locator('iframe[data-module="connect"]')).toBeAttached();
  await page.getByRole('button', { name: 'Benutzermenu' }).click();
  await page.getByTestId('usermenu-feedback').click();
  await expectFeedbackWindow(page, 390);
});
