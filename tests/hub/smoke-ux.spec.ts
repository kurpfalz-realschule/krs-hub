import { test, expect, openHub } from '../fixtures/hub';

test.describe('KRS Hub — UX-Smokes', () => {
  test('Intro-Banner lässt sich dauerhaft ausblenden', async ({ page }) => {
    await openHub(page);
    const banner = page.getByTestId('hub-intro-banner');
    await expect(banner).toBeVisible();
    await page.getByTestId('hub-intro-dismiss').click();
    await expect(banner).toHaveCount(0);
    expect(await page.evaluate(() => localStorage.getItem('krs_hub_intro_dismissed'))).toBe('1');

    await page.reload();
    await page.waitForFunction(() => typeof window.KRS_HUB_VERSION === 'string');
    await expect(page.getByTestId('hub-intro-banner')).toHaveCount(0);
  });

  test('Hilfe öffnet Anleitung und FAQ', async ({ hubPage: page }) => {
    await page.locator('.topbar-user').click();
    await page.getByTestId('usermenu-help').click();
    const modal = page.getByTestId('hub-help-modal');
    await expect(modal).toBeVisible();
    await expect(modal.locator('.faq-row').first()).toBeVisible();
  });

  test('Feedback verlangt Kategorie und Nachricht', async ({ hubPage: page }) => {
    await page.locator('.topbar-user').click();
    await page.getByTestId('usermenu-feedback').click();
    const modal = page.getByTestId('hub-feedback-modal');
    const send = modal.getByRole('button', { name: /Absenden|Senden/ });
    await expect(send).toBeDisabled();
    await modal.locator('.feedback-cat').first().click();
    await expect(send).toBeDisabled();
    await modal.locator('.feedback-textarea').fill('Hub-E2E-Feedback');
    await expect(send).toBeEnabled();
  });
});
