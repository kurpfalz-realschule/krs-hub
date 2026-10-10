import { test, expect, openHub } from '../fixtures/hub';

/** 3.36.0 — Neues Design ist Standard; Leiste heißt Klassenarbeiten und Medien. */
test('Ohne eigene Wahl: neues Design an, eigene Wahl „aus“ bleibt', async ({ page }) => {
  await page.addInitScript(() => { if (!sessionStorage.getItem('s')) { sessionStorage.setItem('s', '1'); localStorage.removeItem('krs_design_v2'); } });
  await page.goto('/index.html?forceMode=demo#/apps');
  await page.waitForFunction(() => typeof (window as any).KRS_HUB_VERSION === 'string');
  await expect(page.locator('html')).toHaveClass(/krs-design-v2/);
  await page.evaluate(() => localStorage.setItem('krs_design_v2', '0'));
  await page.reload();
  await page.waitForFunction(() => typeof (window as any).KRS_HUB_VERSION === 'string');
  await expect(page.locator('html')).not.toHaveClass(/krs-design-v2/);
});

for (const width of [320, 390, 1280]) test(`Leiste ${width}: Klassenarbeiten und Medien, ohne Querscrollen`, async ({ page }) => {
  await page.setViewportSize({ width, height: 844 });
  await page.addInitScript(() => localStorage.setItem('krs_design_v2', '1'));
  await openHub(page);
  const nav = page.getByTestId('design-nav');
  for (const name of ['Klassenarbeiten', 'Medien']) {
    const b = nav.getByRole('button', { name, exact: true });
    await expect(b).toBeVisible();
    const box = await b.boundingBox();
    expect(box && box.x >= 0 && box.x + box.width <= width + 1).toBe(true);
  }
  await expect(nav.getByRole('button', { name: 'Plan', exact: true })).toHaveCount(0);
  await expect(nav.getByRole('button', { name: 'Buchen', exact: true })).toHaveCount(0);
  expect(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1)).toBe(false);
  // Beschriftung bleibt im Knopf (kein Überlauf nach rechts).
  const overflow = await nav.locator('.design-nav-label').evaluateAll(els => els.some(el => el.scrollWidth > (el as HTMLElement).clientWidth + 1 && getComputedStyle(el).display !== 'none'));
  expect(overflow).toBe(false);
});
