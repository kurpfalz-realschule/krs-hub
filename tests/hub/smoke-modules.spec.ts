import { test, expect } from '../fixtures/hub';

const connectButton = (page) =>
  page.locator('.nav-item').filter({ hasText: /connect/i }).first();

test.describe('KRS Hub — Modul-Switch', () => {
  test('Connect-Modul öffnet genau ein iframe', async ({ page }) => {
    await page.goto('/index.html?forceMode=demo');   // ohne Hash → Connect aktiv
    // v3.25+: Hub startet bereits auf Connect — Sidebar ist dann ausgeblendet.
    // Deshalb nicht auf den Nav-Button warten, sondern das iframe direkt prüfen.
    await expect(page.locator('iframe[data-module="connect"], iframe[src*="krs-connect"], iframe[title="Connect"]')).toHaveCount(1);
  });

  test('Hash-Router setzt #/connect', async ({ page }) => {
    // Start OHNE Hash → v3.25.0: Hub öffnet Connect
    await page.goto('/index.html?forceMode=demo');
    await expect(page).toHaveURL(/#\/connect/);
  });

  test('Homepage-Link ist auf dem Dashboard verfügbar', async ({ hubPage: page }) => {
    await page.evaluate(() => { window.location.hash = '#/apps'; });
    await expect(page.locator('a[href*="realschule-schriesheim.de"]').first()).toBeVisible({ timeout: 10_000 });
  });
});

test.describe('KRS Hub — PERF-01 Keep-alive', () => {
  // PERF-01 (v3.27.0): Connect-iframe darf beim Wechsel zur Hub-Startseite
  // nicht unmounten. Abnahme Boot-Counter: Connect→Hub-Start→Connect →
  // window.__krsConnectBootCount bleibt 1 (manuell / Live; hier DOM-Host).
  test('Hub-Start zeigt Welcome-Overlay, Connect-Host bleibt gemountet', async ({ page }) => {
    await page.goto('/index.html?forceMode=demo');   // ohne Hash → Connect aktiv
    const connectFrame = page.locator('iframe[data-module="connect"], iframe[title="Connect"], iframe[src*="krs-connect"]');
    await expect(connectFrame).toHaveCount(1);

    await page.evaluate(() => { window.location.hash = '#/apps'; });
    await expect(page.locator('[data-testid="welcome-overlay"], .welcome-overlay').first()).toBeVisible({ timeout: 10_000 });

    // Keep-alive: Connect-iframe weiter im DOM
    await expect(connectFrame).toHaveCount(1);
    await expect(page.locator('[data-testid="module-host"]')).toBeVisible();
    // src soll gesetzt bleiben (warm), nicht entfernt
    const src = await connectFrame.first().getAttribute('src');
    expect(src && /connect/i.test(src)).toBeTruthy();
  });
});
