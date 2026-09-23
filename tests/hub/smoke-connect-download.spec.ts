import { test, expect } from '../fixtures/hub';
import { readFile } from 'node:fs/promises';

const PROBE = 'KRS download probe';

test.describe('KRS Hub — Connect-Downloads in der echten iframe-Huelle', () => {
  test('Connect darf einen Blob mit Name und unveraenderten Bytes herunterladen', async ({ page }) => {
    await page.route('https://kurpfalz-realschule.github.io/krs-connect/', async route => {
      await route.fulfill({
        contentType: 'text/html; charset=utf-8',
        body: `<!doctype html><meta charset="utf-8"><button id="download">Download</button>
          <script>
            document.querySelector('#download').onclick = () => {
              const url = URL.createObjectURL(new Blob([${JSON.stringify(PROBE)}], {type:'text/plain'}));
              const a = document.createElement('a');
              a.href = url; a.download = 'probe.txt'; a.click();
              setTimeout(() => URL.revokeObjectURL(url), 1000);
            };
          </script>`,
      });
    });

    await page.goto('/index.html?forceMode=demo#/connect');
    const frame = page.locator('iframe[title="Connect"]');
    await expect(frame).toHaveAttribute('sandbox', /(?:^|\s)allow-downloads(?:\s|$)/);

    const downloadPromise = page.waitForEvent('download');
    await frame.contentFrame().locator('#download').click();
    const download = await downloadPromise;

    expect(download.suggestedFilename()).toBe('probe.txt');
    const path = await download.path();
    expect(path).toBeTruthy();
    expect(await readFile(path!, 'utf8')).toBe(PROBE);
  });

  test('andere Module erhalten keine zusaetzliche Download-Freigabe', async ({ hubPage: page }) => {
    const sandboxes = await page.locator('iframe:not([title="Connect"])').evaluateAll(frames =>
      frames.map(frame => frame.getAttribute('sandbox') || ''),
    );
    expect(sandboxes.length).toBeGreaterThan(0);
    expect(sandboxes.every(value => !value.split(/\s+/).includes('allow-downloads'))).toBe(true);
  });
});
