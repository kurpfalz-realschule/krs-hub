import { test, expect } from '../fixtures/hub';

/**
 * „Notizen & Aufgaben“ ist seit v3.18.0 KEINE Kachel mehr (18.09.2026).
 *
 * Gezählt am 17.09.2026 in der Produktionsdatenbank: 1 Notiz und 3 Aufgaben in
 * zwei Monaten. Das Modul wurde praktisch nicht benutzt — nicht weil Merkposten
 * unwichtig wären, sondern weil sie am falschen Ort lagen: ein leeres
 * Extra-Programm, das man erst aufsuchen und dann von Hand füllen muss. Seit
 * Connect v4.25.0 entstehen sie am Beitrag (⋯-Menü → „Als Aufgabe merken“) und
 * sammeln sich in Connects Merkliste.
 *
 * Die Seite selbst bleibt deployt und unter ./notizen/ erreichbar (Connect
 * verlinkt sie, solange dort noch Notizen liegen) — deshalb prüft der zweite
 * Test, dass die URL weiterhin ausgeliefert wird. Daten und Tabellen sind
 * unverändert.
 */
test.describe('KRS Hub — Notizen ist keine Kachel mehr', () => {
  test('Startseite zeigt keine Notizen-Kachel', async ({ hubPage: page }) => {
    await expect(page.locator('.module-card').first()).toBeVisible();
    await expect(page.locator('.module-card', { hasText: 'Notizen & Aufgaben' })).toHaveCount(0);
  });

  test('Die alte Notizen-Seite bleibt erreichbar', async ({ hubPage: page }) => {
    const res = await page.request.get('/notizen/');
    expect(res.status()).toBe(200);
  });
});
