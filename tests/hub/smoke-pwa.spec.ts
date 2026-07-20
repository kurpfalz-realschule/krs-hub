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

  test('Manifest-Icons haben die deklarierten Pixelmaße (PNG-IHDR)', async ({ request }) => {
    const res = await request.get('/manifest.json');
    expect(res.status()).toBe(200);
    const manifest = await res.json();

    for (const icon of manifest.icons) {
      const iconRes = await request.get('/' + icon.src);
      expect(iconRes.status(), `Icon ${icon.src} sollte 200 liefern`).toBe(200);
      // PNG-IHDR: Signatur(8) + Länge(4) + "IHDR"(4) → Breite@16, Höhe@20 (Big-Endian).
      const buf = await iconRes.body();
      expect(buf.slice(0, 8).toString('hex'), `${icon.src} sollte ein PNG sein`).toBe('89504e470d0a1a0a');
      const width = buf.readUInt32BE(16);
      const height = buf.readUInt32BE(20);
      const [declW, declH] = String(icon.sizes).split('x').map((n: string) => parseInt(n, 10));
      expect(width, `${icon.src} Breite`).toBe(declW);
      expect(height, `${icon.src} Höhe`).toBe(declH);
    }
  });

  test('mindestens ein maskable Icon ist deklariert (Android/adaptive Icons)', async ({ request }) => {
    const res = await request.get('/manifest.json');
    const manifest = await res.json();
    const maskable = manifest.icons.filter((i: { purpose?: string }) =>
      typeof i.purpose === 'string' && i.purpose.split(/\s+/).includes('maskable'));
    expect(maskable.length, 'Manifest sollte ein maskable Icon enthalten').toBeGreaterThanOrEqual(1);
  });

  test('apple-touch-icon: 180×180 PNG (iOS-Homescreen-Icon)', async ({ hubPage: page, request }) => {
    const link = page.locator('link[rel="apple-touch-icon"]');
    const href = await link.getAttribute('href');
    const iconRes = await request.get('/' + href);
    expect(iconRes.status()).toBe(200);
    const buf = await iconRes.body();
    expect(buf.slice(0, 8).toString('hex'), 'apple-touch-icon sollte ein PNG sein').toBe('89504e470d0a1a0a');
    expect(buf.readUInt32BE(16), 'apple-touch-icon Breite').toBe(180);
    expect(buf.readUInt32BE(20), 'apple-touch-icon Höhe').toBe(180);
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
