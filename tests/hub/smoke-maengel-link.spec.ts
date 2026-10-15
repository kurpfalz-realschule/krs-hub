import { test, expect, oeffneWeitereApps } from '../fixtures/hub';

test.describe('KRS Hub — Mängelliste', () => {
  test('die Adresse steht nicht in der Seite', async ({ hubPage: page }) => {
    const quelle = await page.content();
    expect(quelle).not.toContain('docs.google.com/spreadsheets');
    expect(await page.evaluate(() => window.KRS_TENANT && 'MAENGEL_URL' in window.KRS_TENANT)).toBe(false);
  });

  test('Weitere Apps zeigt die Kachel und öffnet im Test keine Tabelle', async ({ hubPage: page }) => {
    await oeffneWeitereApps(page);
    const kachel = page.getByTestId('tile-maengel');
    await expect(kachel).toBeVisible();
    await expect(kachel).not.toHaveAttribute('href', /.+/);
    await expect(page.getByTestId('nav-maengel')).toHaveCount(0);
    await kachel.click();
    await expect.poll(() => page.evaluate(() => window.__KRS_MAENGEL_STATUS)).toBe('demo-ohne-adresse');
  });
});
