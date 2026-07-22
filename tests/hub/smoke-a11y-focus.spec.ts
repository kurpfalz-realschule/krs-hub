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
  test('Skip-Link ist das erste fokussierbare Element und der Inhalt liegt in <main id="main">', async ({ page }) => {
    await openHub(page);
    // WCAG 2.4.1 „Bypass Blocks": Der Skip-Link muss das ERSTE fokussierbare Element
    // in Dokument-Reihenfolge sein. Direkt über das DOM prüfen — der frühere Weg
    // (body.click + ein Tab) war in headless-Chromium unzuverlässig.
    const first = await page.evaluate(() => {
      const sel = 'a[href],button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])';
      const els = Array.prototype.slice.call(document.querySelectorAll(sel)).filter((el: Element) => {
        const s = getComputedStyle(el as HTMLElement);
        return s.display !== 'none' && s.visibility !== 'hidden' && !(el as HTMLElement).closest('[inert]');
      });
      const f = els[0] as HTMLElement | undefined;
      return f ? { cls: String(f.className || ''), href: f.getAttribute('href') } : { cls: '', href: null };
    });
    expect(first.cls).toContain('skip-link');
    expect(first.href).toBe('#main');
    await expect(page.locator('main#main')).toHaveCount(1);
    await page.locator('a.skip-link').focus();
    expect(await page.evaluate(() => document.activeElement?.className || '')).toContain('skip-link');
  });

  // A3 (22.07.2026) — Regressionstest, siehe identischer Test in
  // krs-connect-deploy/tests/connect/smoke-a11y-focus.spec.ts für die volle
  // Erklärung: Der Lern-Coach hält sein Panel (role="dialog") dauerhaft im DOM,
  // nur per CSS-transform ausgeblendet. isVisible() im Focus-Trap prüfte
  // bisher nur offsetWidth/offsetHeight → das geschlossene Panel galt als
  // offener Dialog, der Hintergrund (inkl. Lern-Coach-FAB) wurde beim Laden
  // dauerhaft inert gesetzt und der Skip-Link verlor den ersten Tab-Fokus.
  test('Lern-Coach-Panel (geschlossen) wird vom Focus-Trap nicht als offener Dialog erkannt', async ({ page }) => {
    await openHub(page);
    const fab = page.locator('.krsc-fab');
    if (await fab.count() === 0) test.skip(true, 'Lern-Coach nicht geladen — UI-Variante');
    await expect(fab).not.toHaveAttribute('inert', '');
    await expect(fab).toBeEnabled();
    await fab.click({ timeout: 5_000 });
    await expect(page.locator('.krsc-panel.krsc-open')).toBeVisible({ timeout: 3_000 });
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
