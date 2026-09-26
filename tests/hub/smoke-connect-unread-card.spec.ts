import { test, expect } from '../fixtures/hub';

/**
 * D4 (Paket D, 3.31.0) — Ungelesen-/Dringend-Karte auf der Hub-Startseite.
 * Connect meldet per postMessage (KRS_HUB_UNREAD_UPDATE) die Ungelesen-Summe
 * und neu bis zu 3 ungelesene Dringend-Beiträge (nur Team/Kanal, kein Inhalt).
 * Muster wie smoke-badges.spec.ts: Nachricht direkt aus dem Seitenkontext.
 */
test.describe('KRS Hub — Connect-Karte ungelesen/dringend (D4)', () => {
  const card = (page) => page.locator('[data-testid="connect-unread-card"]');

  test('ohne Nachricht keine Karte', async ({ hubPage: page }) => {
    await expect(card(page)).toHaveCount(0);
  });

  test('Nachricht mit Dringend → Karte mit Zahlen und Team/Kanal, 0 → weg', async ({ hubPage: page }) => {
    await page.evaluate(() => {
      window.postMessage({
        type: 'KRS_HUB_UNREAD_UPDATE', moduleId: 'connect', count: 5,
        urgentCount: 1, urgent: [{ id: 42, team: 'Kollegium', kanal: 'Allgemein' }]
      }, window.location.origin);
    });
    await expect(card(page)).toBeVisible();
    await expect(card(page)).toContainText('In Connect: 5 ungelesen');
    await expect(page.locator('[data-testid="connect-unread-urgent"]')).toHaveText(/1 dringend/);
    await expect(card(page)).toContainText('Kollegium · #Allgemein');
    await expect(card(page)).toHaveAttribute('aria-label', /5 ungelesen · 1 dringend/);

    await page.evaluate(() => {
      window.postMessage({ type: 'KRS_HUB_UNREAD_UPDATE', moduleId: 'connect', count: 0, urgentCount: 0, urgent: [] }, window.location.origin);
    });
    await expect(card(page)).toHaveCount(0);
  });

  test('alte Connect-Version (nur count) → Karte ohne Dringend-Zeile', async ({ hubPage: page }) => {
    await page.evaluate(() => {
      window.postMessage({ type: 'KRS_HUB_UNREAD_UPDATE', moduleId: 'connect', count: 2 }, window.location.origin);
    });
    await expect(card(page)).toContainText('In Connect: 2 ungelesen');
    await expect(page.locator('[data-testid="connect-unread-urgent"]')).toHaveCount(0);
  });

  test('Klick öffnet Connect', async ({ hubPage: page }) => {
    await page.evaluate(() => {
      window.postMessage({ type: 'KRS_HUB_UNREAD_UPDATE', moduleId: 'connect', count: 1 }, window.location.origin);
    });
    await card(page).click();
    await expect(card(page)).toHaveCount(0); // Startseite verlassen
    await expect(page).toHaveURL(/#\/connect/);
  });

  test('Zähler eines anderen Moduls erzeugt keine Connect-Karte', async ({ hubPage: page }) => {
    await page.evaluate(() => {
      window.postMessage({ type: 'KRS_HUB_UNREAD_UPDATE', moduleId: 'plan', count: 4 }, window.location.origin);
    });
    await expect(card(page)).toHaveCount(0);
  });
});
