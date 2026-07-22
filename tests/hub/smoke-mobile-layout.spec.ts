import { test, expect, openHub, HUB_PATH } from '../fixtures/hub';

/**
 * Mobile-Layout + Reflow (KRS Hub) — Äquivalent zu
 * krs-connect-deploy/tests/connect/smoke-mobile-layout.spec.ts, für den Hub
 * ergänzt (Empfehlung aus A11Y-SPEC.md 7.1, Block C „200-%-Zoom/Reflow").
 *
 * Vorher hatte der Hub 0 Viewport-/Reflow-Tests (gegengrepped). Deckt jetzt ab:
 *  - Bottom-Bar-Check analog Connect: `.sidebar` ist auf Mobile ausgeblendet,
 *    `.mobile-tabs` zeigt die Modul-Navigation (u. a. Connect), Ballast
 *    (Username-Text neben dem Avatar) ist ausgeblendet — auf 320 px UND 390 px.
 *  - Reflow: Hauptansicht hat auf keinem der beiden Viewports horizontales
 *    Scrollen (WCAG 1.4.10).
 *  - 320-px-Test mit geöffnetem Dialog (Admin-Panel): kein horizontales
 *    Scrollen, während ein Dialog offen ist — das war laut 7.1 „in keinem Fall
 *    Teil eines Reflow-Tests".
 *
 * Anders als bei Connect gibt es im Hub keinen zweispaltigen Team/Kanal-Drawer
 * — der Hub hat stattdessen die Sidebar→Bottom-Tabs-Umschaltung als
 * Mobile-Layout-Mechanismus. Das ist der hier geprüfte Äquivalent-Fall.
 */

// Reflow-Toleranz: 1-2px Rundungsfehler durch Scrollbar-Breite/Subpixel sind
// kein echter Overflow-Bug.
const REFLOW_TOLERANCE_PX = 2;

async function hasHorizontalOverflow(page) {
  return page.evaluate((tolerance) => {
    return document.documentElement.scrollWidth > window.innerWidth + tolerance;
  }, REFLOW_TOLERANCE_PX);
}

for (const viewport of [
  { width: 320, height: 568, label: '320px (iPhone SE)' },
  { width: 390, height: 844, label: '390px (iPhone-Format)' },
]) {
  test.describe(`Mobile-Layout (Demo) — ${viewport.label}`, () => {
    test.use({ viewport: { width: viewport.width, height: viewport.height } });

    test('Sidebar ist ausgeblendet, mobile-tabs zeigt die Modul-Navigation', async ({ hubPage: page }) => {
      await expect(page.locator('.sidebar')).toBeHidden();
      const tabs = page.locator('.mobile-tabs');
      await expect(tabs).toBeVisible();
      // Analog zum Connect-Drawer-Check: Connect-Modul ist zwingend enthalten,
      // die Bottom-Bar ist damit nicht leer/kaputt.
      await expect(
        tabs.locator('.mobile-tab').filter({ hasText: /connect/i }).first()
      ).toBeVisible();
      // Mindestgröße 44×44 (bereits an anderer Stelle für den Collapse-Toggle
      // geprüft, hier für die eigentliche Nav-Interaktion selbst).
      const box = await tabs.locator('.mobile-tab').first().boundingBox();
      expect(box).not.toBeNull();
      expect(box!.height).toBeGreaterThanOrEqual(44);
    });

    test('Bottom-Bar blendet Ballast aus (Username-Text neben dem Avatar)', async ({ hubPage: page }) => {
      await expect(page.locator('.topbar-username')).toBeHidden();
      // Der Avatar/Auslöser fürs Benutzermenü bleibt erreichbar — sonst wäre
      // Admin/Abmelden auf Mobile unerreichbar.
      await expect(page.locator('button[aria-label="Benutzermenu"]')).toBeVisible();
    });

    test('Hauptansicht hat kein horizontales Scrollen', async ({ hubPage: page }) => {
      await expect(page.locator('main#main')).toBeVisible();
      expect(await hasHorizontalOverflow(page)).toBe(false);
    });
  });
}

test.describe('Mobile-Layout 320px — Reflow mit offenem Dialog (Demo)', () => {
  test.use({ viewport: { width: 320, height: 568 } });

  test('Admin-Panel bei 320px: kein horizontales Scrollen, Dialog bleibt bedienbar', async ({ page }) => {
    // forceUser=Ko (Superadmin) — nur Admins sehen den Admin-Einstieg im
    // Benutzermenü. Auf Mobile ist die Sidebar (inkl. sidebar-admin) versteckt;
    // der einzige erreichbare Weg zum Admin-Panel ist die Topbar (Avatar bleibt
    // sichtbar, siehe Test oben) → Benutzermenü → „Administration".
    await page.goto(`${HUB_PATH}?forceMode=demo&forceUser=Ko`);
    await page.waitForFunction(() => typeof window.KRS_HUB_VERSION === 'string');
    await expect(page.locator('.shell')).toBeVisible({ timeout: 10_000 });

    expect(await hasHorizontalOverflow(page)).toBe(false);

    await page.locator('button[aria-label="Benutzermenu"]').click();
    const adminEntry = page.getByTestId('usermenu-admin');
    await expect(adminEntry).toBeVisible({ timeout: 5_000 });
    await adminEntry.click();

    const dialog = page.locator('[data-testid="admin-panel"][role="dialog"]');
    await expect(dialog).toBeVisible({ timeout: 5_000 });

    // Der eigentliche Reflow-Check: mit offenem Dialog darf die Seite nicht
    // breiter werden als der 320-px-Viewport.
    expect(await hasHorizontalOverflow(page)).toBe(false);

    // Dialog bleibt bedienbar: Tabs sind sichtbar und innerhalb der Panel-Breite,
    // nicht abgeschnitten.
    await expect(page.locator('[role="tablist"]')).toBeVisible();
    const panelBox = await dialog.locator('[role="tablist"]').first().boundingBox();
    expect(panelBox).not.toBeNull();
    expect(panelBox!.width).toBeLessThanOrEqual(320 + REFLOW_TOLERANCE_PX);

    // Schließen funktioniert weiterhin bei 320px (Escape, bereits in
    // smoke-a11y-focus.spec.ts am Desktop-Viewport geprüft).
    await page.keyboard.press('Escape');
    await expect(dialog).toHaveCount(0);
  });
});
