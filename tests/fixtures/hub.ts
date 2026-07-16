import { test as base, expect, Page } from '@playwright/test';

export { expect };

export const HUB_PATH = '/index.html';

export async function openHub(page: Page, opts: { user?: string } = {}) {
  const query = new URLSearchParams({ forceMode: 'demo' });
  if (opts.user) query.set('forceUser', opts.user);

  await page.goto(`${HUB_PATH}?${query.toString()}`);
  await page.waitForFunction(
    () => typeof window.KRS_HUB_VERSION === 'string',
    null,
    { timeout: 10_000 },
  );
  await expect(page.locator('.shell')).toBeVisible({ timeout: 10_000 });
}

export const test = base.extend<{ hubPage: Page }>({
  hubPage: async ({ page }, use) => {
    await openHub(page);
    await use(page);
  },
});
