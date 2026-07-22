import { test, expect } from '../fixtures/hub';

// N4 (Sprint N-Sonnet, iOS-App): Der Native-Link-Bridge-Shim in index.html darf
// im Browser/PWA (kein window.Capacitor) NICHT eingreifen — externe Links
// müssen ihr Standardverhalten (target=_blank öffnet einen neuen Tab) behalten.
// Architektur: ARCHITEKTUR-IOS-NATIVE-2026-07-22.md §4.
test.describe('KRS Hub — Native-Link-Bridge (Sprint N4, Guard-Verhalten)', () => {
  test('ohne window.Capacitor bleibt der Shim inaktiv', async ({ hubPage: page }) => {
    expect(await page.evaluate(() => typeof window.Capacitor)).toBe('undefined');
  });

  test('externer Link öffnet weiterhin normal in neuem Tab (preventDefault wird nicht gerufen)', async ({ hubPage: page, context }) => {
    // Kein echter Netzwerk-Request nötig/gewollt — nur prüfen, dass die
    // Standard-Navigation (neuer Tab) tatsächlich stattfindet.
    await context.route('https://realschule-schriesheim.de/**', (route) =>
      route.fulfill({ status: 200, contentType: 'text/plain', body: 'ok' }),
    );

    const link = page.locator('a.module-card[target="_blank"]').filter({ hasText: 'Homepage' }).first();
    await expect(link).toBeVisible();
    await expect(link).toHaveAttribute('href', 'https://realschule-schriesheim.de/');

    const [popup] = await Promise.all([
      context.waitForEvent('page'),
      link.click(),
    ]);
    await popup.waitForLoadState('load');
    expect(popup.url()).toBe('https://realschule-schriesheim.de/');
    await popup.close();
  });
});
