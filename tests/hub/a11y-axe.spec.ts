// tests/hub/a11y-axe.spec.ts
// Sprint A2 — Barrierefreiheit KRS Hub (WCAG 2.1 AA / BITV 2.0)
//
// Besonderheit Hub: Modul-Shell mit iframes. axe-core prüft das Shell-Dokument;
// Cross-Origin-iframes kann axe nicht durchdringen — die Modul-Innenseiten werden
// in ihren eigenen Suiten geprüft. Hier:
//   1) axe über die Shell (Topbar, Seitenleiste, Kacheln)
//   2) DOM-Check: jedes <iframe> hat ein aussagekräftiges title-Attribut (4.1.2)
//   3) Topbar-Toggle: aria-expanded spiegelt den Zustand (4.1.2)
//
// KEIN Dark-Mode-Test: der Hub hat keinen Dark Mode (nur <meta name="theme-color">,
// das ist die Browser-UI-Farbe). Geprüft am Code 21.07.2026, A11Y-SPEC.md Abschnitt 4.
//
// Voraussetzung: npm i -D @axe-core/playwright  (in package.json ergänzt)

import { test, expect } from '@playwright/test';
import { openHub } from '../fixtures/hub';
import AxeBuilder from '@axe-core/playwright';

const WCAG_TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'];

async function runAxe(page: import('@playwright/test').Page, kontext: string) {
  const results = await new AxeBuilder({ page })
    .withTags(WCAG_TAGS)
    // Modul-iframes ausschließen: eigene Dokumente, eigene Test-Suiten.
    .exclude('iframe')
    .analyze();

  const critical = results.violations.filter(
    (v) => v.impact === 'critical' || v.impact === 'serious',
  );
  const minor = results.violations.filter(
    (v) => v.impact === 'moderate' || v.impact === 'minor' || v.impact == null,
  );

  if (minor.length) {
    // eslint-disable-next-line no-console
    console.log(
      `[a11y][${kontext}] ${minor.length} moderate/minor (nicht blockierend):\n` +
        minor.map((v) => `  - ${v.id} (${v.impact}): ${v.help}`).join('\n'),
    );
  }

  expect(
    critical,
    `[a11y][${kontext}] kritische/serious axe-Verstöße:\n` +
      JSON.stringify(
        critical.map((v) => ({
          id: v.id,
          impact: v.impact,
          help: v.help,
          nodes: v.nodes.map((n) => n.target).slice(0, 5),
        })),
        null,
        2,
      ),
  ).toEqual([]);
}

test.describe('KRS Hub — WCAG 2.1 AA (axe-core)', () => {
  test('Shell hat keine kritischen axe-Verstöße', async ({ page }) => {
    await openHub(page);
    await runAxe(page, 'hub/shell');
  });

  test('Jedes iframe hat ein aussagekräftiges title-Attribut', async ({ page }) => {
    await openHub(page);

    const frames = page.locator('iframe');
    const anzahl = await frames.count();
    if (anzahl === 0) {
      test.skip(true, 'Kein Modul geladen — kein iframe im DOM');
    }

    for (let i = 0; i < anzahl; i++) {
      const title = await frames.nth(i).getAttribute('title');
      expect(
        (title || '').trim().length,
        `iframe #${i} hat kein/ein leeres title-Attribut (WCAG 4.1.2)`,
      ).toBeGreaterThan(2);
    }
  });

  test('Topbar-Toggle spiegelt den Zustand in aria-expanded', async ({ page }) => {
    await openHub(page);

    const toggle = page.locator('[aria-expanded]').first();
    if (!(await toggle.isVisible().catch(() => false))) {
      test.skip(true, 'Kein sichtbares Element mit aria-expanded in dieser Ansicht');
    }

    const vorher = await toggle.getAttribute('aria-expanded');
    await toggle.click();
    await expect(toggle).not.toHaveAttribute('aria-expanded', vorher || '');
  });

  // A3 (22.07.2026): Lockscreen war bisher nicht axe-geprüft. Deckt u. a. den
  // Heading-Feinschliff ab (h2→h1, A11Y-SPEC Abschnitt 6.7) — axe würde eine übersprungene
  // Ebene als "heading-order" (moderate) protokollieren, siehe runAxe()-Log.
  test('Lockscreen hat keine kritischen axe-Verstöße', async ({ page }) => {
    await openHub(page);
    await page.locator('.topbar-user').click();
    const item = page.getByRole('menuitem', { name: /Jetzt sperren/i });
    if (!(await item.isVisible().catch(() => false))) {
      test.skip(true, 'Sperren-Option nicht gefunden — UI-Variante');
    }
    await item.click();
    await expect(page.locator('.lock-screen')).toBeVisible();
    await expect(page.locator('.lock-screen h1')).toBeVisible();
    await runAxe(page, 'hub/lockscreen');
  });
});
