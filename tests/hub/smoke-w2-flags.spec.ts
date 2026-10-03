import { test, expect } from '../fixtures/hub';

async function flags(page, enabled: boolean, error = false) {
  await page.evaluate(async ({ enabled, error }) => {
    await (window as any).KRSW2Flags.refresh({
      from: () => ({ select: async () => ({ data: [{ key: 'UNTERRICHT', enabled }], error: error ? { message: 'denied' } : null }) })
    });
  }, { enabled, error });
}
async function permitTenant(page) {
  await page.evaluate(() => { (window as any).KRS_TENANT.features.unterricht = true; });
}
const tile = page => page.locator('.module-card').filter({ hasText: /^📚Unterricht$/ });

test('W2 default off blocks tile and direct hash', async ({ hubPage: page }) => {
  await expect(tile(page)).toHaveCount(0);
  await page.evaluate(() => { location.hash = '#/unterricht'; });
  await expect(page.locator('iframe[data-module="unterricht"]')).toHaveCount(0);
});

test('server toggle opens placeholder and revocation removes active iframe', async ({ hubPage: page }) => {
  await permitTenant(page);
  await flags(page, true);
  await expect(tile(page)).toBeVisible();
  await tile(page).click();
  await expect(page.frameLocator('iframe[data-module="unterricht"]').getByText('Kommt bald.', { exact: true })).toBeVisible();
  await flags(page, false);
  await expect(page.locator('iframe[data-module="unterricht"]')).toHaveCount(0);
  await expect(tile(page)).toHaveCount(0);
  await expect(page).toHaveURL(/#\/apps/);
});

test('tenant false overrides server true', async ({ hubPage: page }) => {
  await flags(page, true);
  await expect(tile(page)).toHaveCount(0);
});

test('query error removes previously enabled tile', async ({ hubPage: page }) => {
  await permitTenant(page);
  await flags(page, true);
  await expect(tile(page)).toBeVisible();
  await flags(page, true, true);
  await expect(tile(page)).toHaveCount(0);
});

test('stale enabled response cannot undo reset', async ({ hubPage: page }) => {
  await permitTenant(page);
  await page.evaluate(async () => {
    let resolve;
    const response = new Promise(r => { resolve = r; });
    const controller = (window as any).KRSW2Flags;
    const pending = controller.refresh({ from: () => ({ select: () => response }) });
    controller.reset();
    resolve({ data: [{ key: 'UNTERRICHT', enabled: true }], error: null });
    await pending;
  });
  await expect(tile(page)).toHaveCount(0);
});

test('parallel refresh keeps latest disabled result', async ({ hubPage: page }) => {
  await permitTenant(page);
  await page.evaluate(async () => {
    let resolve;
    const response = new Promise(r => { resolve = r; });
    const controller = (window as any).KRSW2Flags;
    const pending = controller.refresh({ from: () => ({ select: () => response }) });
    await controller.refresh({ from: () => ({ select: async () => ({ data: [], error: null }) }) });
    resolve({ data: [{ key: 'UNTERRICHT', enabled: true }], error: null });
    await pending;
  });
  await expect(tile(page)).toHaveCount(0);
});

test('missing flags script keeps the existing Hub usable and Unterricht closed', async ({ page }) => {
  await page.route('**/w2-flags.js', route => route.abort());
  await page.goto('/index.html?forceMode=demo#/apps');
  await expect(page.locator('.shell')).toBeVisible();
  await expect(tile(page)).toHaveCount(0);
});
