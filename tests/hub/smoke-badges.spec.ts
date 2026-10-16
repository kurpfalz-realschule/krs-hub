import { test, expect, oeffneWeitereApps } from '../fixtures/hub';

/**
 * Kacheln/Badges (Test-Abdeckungs-Review, 30.07.2026) — vorher ungetestete
 * Lücke: weder der statische "NEU"-Hinweis (CONFIG.MODULES[].badge) noch der
 * dynamische Ungelesen-Zähler (postMessage KRS_HUB_UNREAD_UPDATE →
 * unreadCounts → .nav-badge in Sidebar/MobileTabBar) hatten einen eigenen
 * Smoke-Test. Sendet die postMessage direkt aus dem Seitenkontext — der Hub
 * akzeptiert sie, weil window.location.origin in CONFIG.ALLOWED_ORIGINS steht.
 */
test.describe('KRS Hub — Kacheln & Badges', () => {
  // v3.37.1 (16.10.2026): Die Schüler-Hub-Kachel ist entfernt (alter
  // Schülerhub eingefroren). Damit trägt keine Kachel mehr ein statisches
  // "NEU"-Badge; der Render-Code für CONFIG.MODULES[].badge bleibt, ist aber
  // erst wieder testbar, wenn eine Kachel ein Badge bekommt.
  test('Schüler-Hub-Kachel ist entfernt, Weitere Apps bleibt intakt', async ({ hubPage: page }) => {
    await oeffneWeitereApps(page);
    await expect(page.locator('.module-card').filter({ hasText: 'M\u00e4ngelliste' })).toBeVisible();
    await expect(page.locator('.module-card').filter({ hasText: 'Sch\u00fcler-Hub' })).toHaveCount(0);
    expect(await page.content()).not.toContain('krs-schueler-hub');
  });

  test('ohne Nachricht zeigt die Connect-Kachel/Sidebar keinen Ungelesen-Badge', async ({ hubPage: page }) => {
    const navItem = page.locator('.sidebar .nav-item').filter({ hasText: /connect/i }).first();
    await expect(navItem).toBeVisible();
    await expect(navItem.locator('.nav-badge')).toHaveCount(0);
    await expect(navItem).toHaveAttribute('aria-label', /^Connect$/);
  });

  test('KRS_HUB_UNREAD_UPDATE setzt den Badge in Sidebar und aria-label', async ({ hubPage: page }) => {
    const navItem = page.locator('.sidebar .nav-item').filter({ hasText: /connect/i }).first();

    await page.evaluate(() => {
      window.postMessage({ type: 'KRS_HUB_UNREAD_UPDATE', moduleId: 'connect', count: 3 }, window.location.origin);
    });

    await expect(navItem.locator('.nav-badge')).toHaveText('3');
    await expect(navItem).toHaveAttribute('aria-label', /Connect \(3 ungelesen\)/);
  });

  test('Badge verschwindet wieder, sobald der Zähler auf 0 gesetzt wird', async ({ hubPage: page }) => {
    const navItem = page.locator('.sidebar .nav-item').filter({ hasText: /connect/i }).first();

    await page.evaluate(() => {
      window.postMessage({ type: 'KRS_HUB_UNREAD_UPDATE', moduleId: 'connect', count: 5 }, window.location.origin);
    });
    await expect(navItem.locator('.nav-badge')).toHaveText('5');

    await page.evaluate(() => {
      window.postMessage({ type: 'KRS_HUB_UNREAD_UPDATE', moduleId: 'connect', count: 0 }, window.location.origin);
    });
    await expect(navItem.locator('.nav-badge')).toHaveCount(0);
  });

  test('Badge erscheint ebenfalls in der mobilen Tab-Leiste', async ({ hubPage: page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.evaluate(() => {
      window.postMessage({ type: 'KRS_HUB_UNREAD_UPDATE', moduleId: 'connect', count: 2 }, window.location.origin);
    });
    const mobileTab = page.locator('.mobile-tabs .mobile-tab').filter({ hasText: /connect/i }).first();
    await expect(mobileTab.locator('.nav-badge')).toHaveText('2');
  });
});
