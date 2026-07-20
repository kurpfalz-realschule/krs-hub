import { test, expect } from '../fixtures/hub';

test.describe('KRS Hub — PWA / iOS-Installierbarkeit (S1)', () => {
  test('manifest.json: 200, standalone, mindestens 3 Icons, alle Icon-URLs erreichbar', async ({ request }) => {
    const res = await request.get('/manifest.json');
    expect(res.status()).toBe(200);
    const manifest = await res.json();
    expect(manifest.display).toBe('standalone');
    expect(Array.isArray(manifest.icons)).toBe(true);
    expect(manifest.icons.length).toBeGreaterThanOrEqual(3);

    for (const icon of manifest.icons) {
      const iconRes = await request.get('/' + icon.src);
      expect(iconRes.status(), `Icon ${icon.src} sollte 200 liefern`).toBe(200);
    }
  });

  test('apple-touch-icon-Link im DOM vorhanden und Datei erreichbar', async ({ hubPage: page, request }) => {
    const link = page.locator('link[rel="apple-touch-icon"]');
    await expect(link).toHaveCount(1);
    const href = await link.getAttribute('href');
    expect(href).toBeTruthy();

    const iconRes = await request.get('/' + href);
    expect(iconRes.status()).toBe(200);
  });

  test('sw.js VERSION stimmt mit CONFIG.VERSION aus index.html überein', async ({ hubPage: page, request }) => {
    const appVersion = await page.evaluate(() => window.KRS_HUB_VERSION);
    expect(appVersion).toMatch(/^\d+\.\d+\.\d+$/);

    const swRes = await request.get('/sw.js');
    expect(swRes.status()).toBe(200);
    const swText = await swRes.text();
    const match = swText.match(/VERSION\s*=\s*'([^']+)'/);
    expect(match, 'sw.js sollte eine VERSION-Konstante definieren').toBeTruthy();
    expect(match![1]).toBe(appVersion);
  });

  test('offline.html: 200 und enthält „KRS Hub"', async ({ request }) => {
    const res = await request.get('/offline.html');
    expect(res.status()).toBe(200);
    const text = await res.text();
    expect(text).toContain('KRS Hub');
  });
});
