import { test, expect } from '../fixtures/hub';

test.describe('KRS Hub — Notizen-Kachel', () => {
  test('Kachel ist vorhanden und öffnet das lokale Modul', async ({ hubPage: page }) => {
    const card = page.locator('.module-card', { hasText: 'Notizen & Aufgaben' });
    await expect(card).toBeVisible();
    await card.click();
    await expect(page.locator('iframe[src*="/notizen/"]')).toHaveCount(1);
  });
});
