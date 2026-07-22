import { test, expect, openHub } from '../fixtures/hub';

/**
 * Sprint A2b — Barrierefreiheit KRS Hub (architektonischer Teil)
 *
 * Verhaltensbezogene Findings mit echten Fokus-Assertions
 * (page.evaluate(() => document.activeElement)):
 *  - H-B-05/06: Skip-Link + Landmark <main id="main">
 *  - H-A-04:    Focus-Trap im Admin-Dialog + Fokus-Rückgabe an den Auslöser
 *  - H-B-09:    Tab-Pattern vollständig (tablist/tab/tabpanel, aria-controls,
 *               Pfeiltasten-Navigation, Roving-Tabindex)
 *
 * Demo-Modus über die Fixture (forceMode=demo). Für Admin-Funktionen forceUser=Ko
 * (Superadmin). UI-abhängige Schritte defensiv mit test.skip.
 */

async function openAdmin(page) {
  await openHub(page, { user: 'Ko' });
  await page.getByTestId('sidebar-admin').click();
  await expect(page.getByTestId('admin-panel')).toBeVisible({ timeout: 5_000 });
}

test.describe('A2b Fokus & Tastatur — KRS Hub (Demo)', () => {
  test('Skip-Link ist das erste Tab-Ziel und der Inhalt liegt in <main id="main">', async ({ page }) => {
    await openHub(page);
    await page.locator('body').click({ position: { x: 2, y: 2 } });
    await page.keyboard.press('Tab');
    const focused = await page.evaluate(() => {
      const a = document.activeElement as HTMLElement | null;
      return { cls: a ? a.className : '', href: a ? a.getAttribute('href') : null };
    });
    expect(focused.cls).toContain('skip-link');
    expect(focused.href).toBe('#main');
    await expect(page.locator('main#main')).toHaveCount(1);
  });

  test('Tab-Pattern vollständig: tablist/tab/tabpanel + Pfeiltasten wechseln die Auswahl', async ({ page }) => {
    await openAdmin(page);
    const tablist = page.locator('[role="tablist"]').first();
    await expect(tablist).toBeVisible();
    const firstTab = page.locator('[data-testid="admin-tab-lehrer"]');
    // Vollständige ARIA-Verdrahtung.
    await expect(firstTab).toHaveAttribute('role', 'tab');
    await expect(firstTab).toHaveAttribute('aria-controls', 'admpanel');
    await expect(page.locator('#admpanel')).toHaveAttribute('role', 'tabpanel');
    await expect(page.locator('#admpanel')).toHaveAttribute('aria-labelledby', 'admtab-lehrer');
    // Roving-Tabindex: aktiver Tab 0, inaktive -1.
    await expect(firstTab).toHaveAttribute('tabindex', '0');
    await expect(page.locator('[data-testid="admin-tab-koffer"]')).toHaveAttribute('tabindex', '-1');

    // Pfeiltaste rechts wechselt die Auswahl auf den nächsten Tab.
    await firstTab.focus();
    await page.keyboard.press('ArrowRight');
    await expect(page.locator('[data-testid="admin-tab-koffer"]')).toHaveAttribute('aria-selected', 'true');
    await expect(page.locator('#admpanel')).toHaveAttribute('aria-labelledby', 'admtab-koffer');
    // Fokus ist mit der Auswahl gewandert.
    expect(await page.evaluate(() => document.activeElement?.getAttribute('data-testid'))).toBe('admin-tab-koffer');
    // Home springt zum ersten Tab zurück.
    await page.keyboard.press('Home');
    await expect(firstTab).toHaveAttribute('aria-selected', 'true');
  });

  test('Focus-Trap im Admin-Dialog; Escape schließt und gibt den Fokus zurück', async ({ page }) => {
    await openHub(page, { user: 'Ko' });
    const trigger = page.getByTestId('sidebar-admin');
    await trigger.click();
    const dialog = page.locator('[data-testid="admin-panel"][role="dialog"]');
    await expect(dialog).toBeVisible({ timeout: 5_000 });

    const focusInside = () => page.evaluate(() => {
      const d = document.querySelector('[data-testid="admin-panel"][role="dialog"]');
      return !!(d && document.activeElement && d.contains(document.activeElement));
    });
    for (let i = 0; i < 12; i++) {
      await page.keyboard.press('Tab');
      expect(await focusInside()).toBe(true);
    }
    // Escape schließt (eigener Handler am Dialog) und Fokus kehrt zum Auslöser zurück.
    await page.keyboard.press('Escape');
    await expect(dialog).toHaveCount(0);
    await page.waitForFunction(
      () => document.activeElement?.getAttribute('data-testid') === 'sidebar-admin',
      null,
      { timeout: 3_000 },
    );
  });
});
