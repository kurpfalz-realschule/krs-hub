import { test, expect, openHub } from '../fixtures/hub';
import { readFileSync } from 'node:fs';

test.use({ serviceWorkers: 'block' });

test('Opt-in design keeps module state; validates the iframe handshake', async ({ page }) => {
  const html = readFileSync('index.html', 'utf8').replaceAll('https://kurpfalz-realschule.github.io/krs-connect/', '/design-module');
  await page.route('**/index.html?*', r => r.fulfill({ contentType: 'text/html', body: html }));
  await page.route('**/design-module*', r => r.fulfill({ contentType: 'text/html', body: `<html><body><input aria-label="Entwurf"><script src="/krs-design.js"></script></body></html>` }));
  await openHub(page);
  await expect(page.locator('html')).not.toHaveClass(/krs-design-v2/);
  await page.getByTestId('mobile-tab-connect').evaluate((el: HTMLElement) => el.click());
  const module = page.frameLocator('iframe[data-module="connect"]');
  await module.getByLabel('Entwurf').fill('Bleibt erhalten');
  await page.evaluate(() => (window as any).KRSDesign.setEnabled(true));
  await expect(page.getByTestId('design-nav')).toBeVisible();
  await expect(page.locator('.shell')).toHaveClass(/design-module-ready/);
  await expect(module.locator('html')).toHaveClass(/krs-design-v2/);
  await page.evaluate(() => window.postMessage({ type: 'KRS_DESIGN_CHANGE', version: 1, requestId: 'abcd', enabled: false }, location.origin));
  await expect(page.locator('html')).toHaveClass(/krs-design-v2/);
  await page.getByTestId('design-nav').getByRole('button', { name: 'Mehr', exact: true }).click();
  await page.getByTestId('appmenu-design-toggle').click();
  await expect(module.locator('html')).not.toHaveClass(/krs-design-v2/);
  await expect(module.getByLabel('Entwurf')).toHaveValue('Bleibt erhalten');
  await module.getByLabel('Entwurf').evaluate(() => (window as any).KRSDesign.setEnabled(true));
  await expect(page.locator('html')).toHaveClass(/krs-design-v2/);
  await page.reload();
  await expect(page.locator('html')).toHaveClass(/krs-design-v2/);
});
