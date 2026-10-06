import { test, expect, openHub } from '../fixtures/hub';
test('Compact sidebar has logo, focus labels, feedback, design switch and persisted expansion', async ({ page }) => {
  await openHub(page);
  await page.locator('.sidebar').getByTestId('sidebar-design-toggle').click();
  const nav = page.getByTestId('design-nav');
  await expect(nav.locator('.design-nav-brand img')).toBeVisible();
  await expect(nav).toHaveClass(/design-nav-compact/);
  const start = nav.getByRole('button', { name: 'Start', exact: true });
  await start.focus();
  await expect(start.locator('.design-nav-label')).toBeVisible();
  await nav.getByRole('button', { name: 'Feedback geben', exact: true }).click();
  await expect(page.getByRole('dialog').first()).toBeVisible();
  await page.getByRole('button', {name: 'Abbrechen', exact: true}).click();
  await nav.getByTestId('design-nav-collapse').click();
  await expect(nav).not.toHaveClass(/design-nav-compact/);
  await page.reload();
  await expect(page.getByTestId('design-nav')).not.toHaveClass(/design-nav-compact/);
  await page.getByTestId('design-nav').getByTestId('sidebar-design-toggle').click();
  await expect(page.locator('html')).not.toHaveClass(/krs-design-v2/);
});
for (const width of [320,390]) test(`Mobile ${width}: visible feedback and no overflow`, async ({ page }) => {
  await page.setViewportSize({width,height:844});
  await page.addInitScript(() => localStorage.setItem('krs_design_v2','1'));
  await openHub(page);
  await expect(page.getByTestId('design-nav').getByRole('button',{name:'Feedback geben',exact:true})).toBeVisible();
  await expect(page.locator('.design-nav-mobile-logo')).toBeVisible();
  expect(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1)).toBe(false);
});

test('Design invitation is dismissible, opt-in and only shown once', async ({ page }) => {
  await page.clock.install();
  await openHub(page);
  await page.clock.runFor(13000);
  const offer=page.getByRole('dialog',{name:'Neues Design ausprobieren',exact:true});
  await expect(offer).toBeVisible();
  await expect(page.locator('html')).not.toHaveClass(/krs-design-v2/);
  await offer.getByRole('button',{name:'Später',exact:true}).click();
  await page.reload();
  await page.clock.runFor(13000);
  await expect(offer).not.toBeVisible();
});
