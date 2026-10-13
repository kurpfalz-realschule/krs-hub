import { test, expect } from '@playwright/test';

/**
 * 3.36.1 — Im vertrauten Design steht der Wechsel zum neuen Design beschriftet
 * in der oberen Leiste (vorher nur ◐ in der Seitenleiste bzw. im Konto-Menü).
 * Der Hinweis-Kasten erscheint einmal neu, auch wenn der alte Hinweis
 * schon weggeklickt war.
 */
async function open(page, width: number, design: '0' | '1', extra: Record<string, string> = {}) {
  await page.addInitScript(([d, x]) => {
    localStorage.setItem('krs_design_v2', d);
    localStorage.setItem('krs_hub_topbar_collapsed', '0');
    for (const [k, v] of Object.entries(x)) localStorage.setItem(k, v);
  }, [design, extra] as const);
  await page.setViewportSize({ width, height: 844 });
  await page.goto('/index.html?forceMode=demo#/apps');
  await page.waitForFunction(() => typeof (window as any).KRS_HUB_VERSION === 'string');
  await expect(page.locator('.shell')).toBeVisible();
  const ok = page.getByRole('button', { name: 'Verstanden', exact: true });
  try { await ok.waitFor({ state: 'visible', timeout: 2_000 }); await ok.click(); } catch (e) { /* kein Overlay */ }
}

for (const width of [320, 390, 834, 1280]) {
  test(`Vertrautes Design ${width}px: „Neues Design“ steht sichtbar oben und schaltet um`, async ({ page }) => {
    await open(page, width, '0', { krs_design_offer_seen_2: '1' });
    const btn = page.getByTestId('topbar-design-toggle');
    await expect(btn).toBeVisible();
    await expect(btn).toContainText('Neues Design');
    const box = await btn.boundingBox();
    expect(box).not.toBeNull();
    expect(box!.x).toBeGreaterThanOrEqual(0);
    expect(box!.x + box!.width).toBeLessThanOrEqual(width);
    expect(box!.height).toBeGreaterThanOrEqual(44);
    // Text nicht abgeschnitten
    const clipped = await btn.evaluate(el => el.scrollWidth > el.clientWidth + 1);
    expect(clipped).toBe(false);
    // Konto-Knopf bleibt erreichbar
    await expect(page.locator('.topbar-user')).toBeVisible();
    // Keine waagerechte Scrollleiste
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1);
    expect(overflow).toBe(false);

    await btn.click();
    await expect(page.locator('html')).toHaveClass(/krs-design-v2/);
    expect(await page.evaluate(() => localStorage.getItem('krs_design_v2'))).toBe('1');
    await expect(page.getByTestId('topbar-design-toggle')).toHaveCount(0);
  });
}

test('Neues Design: kein „Neues Design“-Knopf in der Leiste', async ({ page }) => {
  await open(page, 390, '1');
  await expect(page.getByTestId('topbar-design-toggle')).toHaveCount(0);
});

test('Hinweis erscheint einmal neu, obwohl der alte schon weggeklickt war', async ({ page }) => {
  test.setTimeout(45_000);
  await open(page, 1280, '0', { krs_design_offer_seen: '1' });
  const offer = page.locator('.design-offer');
  await expect(offer).toBeVisible({ timeout: 20_000 });
  await expect(offer).toContainText('Das neue Design ist jetzt Standard');
  await offer.getByRole('button', { name: 'Später' }).click();
  await expect(offer).toHaveCount(0);
  expect(await page.evaluate(() => localStorage.getItem('krs_design_offer_seen_2'))).toBe('1');
});
