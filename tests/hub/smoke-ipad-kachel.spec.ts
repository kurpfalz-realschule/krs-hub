import { test, expect } from '../fixtures/hub';

test.describe('KRS Hub — iPad-Buchung (Q1)', () => {
  test('zeigt genau eine Kachel ohne Alt-/Neu-Zusatz', async ({ hubPage: page }) => {
    const cards = page.locator('.module-card').filter({ hasText: 'iPad-Buchung' });
    await expect(cards).toHaveCount(1);
    await expect(cards.locator('.module-card-title')).toHaveText('iPad-Buchung');
    await expect(cards).not.toContainText('NEU');
    await expect(cards).not.toContainText('(neu)');
  });

  test('Kachel öffnet ausschließlich ipad-buchung-neu', async ({ hubPage: page }) => {
    await page.locator('.module-card').filter({ hasText: 'iPad-Buchung' }).click();
    await expect(page.locator('iframe[src*="ipad-buchung-neu"]')).toHaveCount(1);
    await expect(page.locator('iframe[src*="/ipad-buchung/"]')).toHaveCount(0);
  });
});
