import { test, expect } from '../fixtures/hub';

/**
 * Statische Hilfe-Seite (Q3, 30.07.2026) — `krs-hub/hilfe/index.html`.
 * Kein Login, kein Supabase-Zugriff, rein statisch. Deckt ab:
 *  - Seite lädt unter /hilfe/ mit Status 200 und hat eine <h1>.
 *  - Mehrere TOC-Sprungmarken führen zu tatsächlich vorhandenen Ankern.
 *  - Keine Konsolen-Fehler beim Laden/Parsen.
 *  - Die Hub-Startseite verlinkt „❓ Hilfe" auf ./hilfe/ (Sidebar + Dashboard-Kachel).
 */
test.describe('KRS Hub — Hilfe-Seite (statisch)', () => {
  test('lädt unter /hilfe/ mit Status 200', async ({ request }) => {
    const res = await request.get('/hilfe/');
    expect(res.status()).toBe(200);
    const text = await res.text();
    expect(text).toContain('<h1');
  });

  test('hat eine sichtbare H1 und mindestens drei funktionierende TOC-Anker', async ({ page }) => {
    const errors: string[] = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') errors.push(msg.text());
    });
    page.on('pageerror', (err) => errors.push(String(err)));

    await page.goto('/hilfe/');
    await expect(page.locator('h1')).toBeVisible();
    await expect(page.locator('h1')).toContainText('Hilfe');

    const tocLinks = ['#erste-anmeldung', '#team-anlegen', '#kanaele', '#faq', '#kontakt'];
    for (const anchor of tocLinks) {
      const link = page.locator(`nav.toc a[href="${anchor}"]`);
      await expect(link, `TOC-Link ${anchor} sollte existieren`).toHaveCount(1);
      const target = page.locator(anchor);
      await expect(target, `Ziel-Element ${anchor} sollte existieren`).toHaveCount(1);
    }

    // Ein Sprung tatsächlich ausführen und prüfen, dass die Ziel-Section erscheint.
    await page.locator('nav.toc a[href="#kanaele"]').click();
    await expect(page).toHaveURL(/#kanaele$/);
    await expect(page.locator('#kanaele')).toBeVisible();

    expect(errors, 'keine Konsolen-/Seitenfehler beim Laden').toEqual([]);
  });

  test('Kontakt nennt Norbert Kotzan mit dienstlicher Adresse, keine private Nummer', async ({ page }) => {
    await page.goto('/hilfe/');
    const kontakt = page.locator('#kontakt');
    await expect(kontakt).toContainText('Norbert Kotzan');
    await expect(kontakt).toContainText('kotzan@realschule-schriesheim.de');
  });

  test('Hub-Startseite verlinkt „❓ Hilfe" relativ auf ./hilfe/', async ({ hubPage: page }) => {
    const sidebarLink = page.locator('.sidebar a.nav-item[href="./hilfe/"]');
    await expect(sidebarLink).toHaveCount(1);

    const tileLink = page.locator('a.module-card[href="./hilfe/"]');
    await expect(tileLink).toHaveCount(1);
    await expect(tileLink).toContainText('Hilfe');
  });
});
