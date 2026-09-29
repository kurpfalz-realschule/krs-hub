import { test, expect } from '../fixtures/hub';

test.describe('Dateiablage Teams und Nextcloud', () => {
  test('Menü, Leiste und Kacheln unterscheiden beide Ablagen', async ({ hubPage: page }) => {
    const teamsTile = page.getByTestId('tile-dateiablage-teams');
    const cloudTile = page.getByTestId('tile-dateiablage-nextcloud');
    await expect(teamsTile).toContainText('Dateiablage Teams');
    await expect(cloudTile).toContainText('Dateiablage Nextcloud');
    await expect(cloudTile).toHaveAttribute('href', 'https://cloud.realschule-schriesheim.de');
    await expect(cloudTile).toHaveAttribute('target', '_blank');
    await expect(page.locator('.module-card-title', { hasText: /^Dateiablage$/ })).toHaveCount(0);

    await expect(page.getByTestId('nav-dateiablage-teams')).toHaveAttribute('aria-label', 'Dateiablage Teams');
    await expect(page.getByTestId('nav-dateiablage-teams')).toContainText('Dateien');
    await expect(page.getByTestId('nav-dateiablage-nextcloud')).toHaveAttribute('aria-label', 'Dateiablage Nextcloud');
    await expect(page.getByTestId('nav-dateiablage-nextcloud')).toContainText('Cloud');

    await teamsTile.click();
    await expect(page.getByTestId('module-host')).toHaveAttribute('data-active-module', 'connect');
    await expect(page).toHaveURL(/#\/connect/);

    await page.locator('button.hamburger').click();
    const menu = page.getByTestId('app-menu');
    await expect(menu.getByTestId('appmenu-dateiablage-teams')).toContainText('Dateiablage Teams');
    const cloudItem = menu.getByTestId('appmenu-dateiablage-nextcloud');
    await expect(cloudItem).toContainText('Dateiablage Nextcloud');
    await expect(cloudItem).toHaveAttribute('href', 'https://cloud.realschule-schriesheim.de');
  });

  test('Schmale Ansicht: beide Kacheln, kein seitlicher Überlauf', async ({ hubPage: page }) => {
    await page.setViewportSize({ width: 320, height: 700 });
    await expect(page.getByTestId('tile-dateiablage-teams')).toBeVisible();
    await expect(page.getByTestId('tile-dateiablage-nextcloud')).toBeVisible();
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1);
    expect(overflow).toBe(false);
  });
});
