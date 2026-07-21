import { test, expect } from '@playwright/test';

const URL = '/notizen/index.html?forceMode=demo';

test.describe('KRS Notizen & Aufgaben — Demo', () => {
  test('lädt Notizen- und Aufgaben-Tab', async ({ page }) => {
    await page.goto(URL);
    await expect(page.getByTestId('tab-notizen')).toBeVisible({ timeout: 15_000 });
    await expect(page.getByTestId('tab-aufgaben')).toBeVisible();
    await expect(page.locator('.demo-pill')).toBeVisible();
  });

  test('legt eine Notiz mit Tag an', async ({ page }) => {
    await page.goto(URL);
    await expect(page.getByTestId('tab-notizen')).toBeVisible({ timeout: 15_000 });
    const before = await page.getByTestId('note-item').count();
    // Seit v2.0 (Things/Apple-Notes-Layout, c637b39) liegt der Composer
    // hinter dem "+"-FAB, statt dauerhaft sichtbar zu sein.
    await page.getByTestId('fab-add').click();
    await expect(page.getByTestId('note-composer')).toBeVisible();
    await page.getByTestId('note-title').fill('Testnotiz Playwright');
    await page.getByTestId('note-body').fill('Inhalt mit #probe');
    await page.getByTestId('note-add').click();
    await expect(page.getByTestId('note-item')).toHaveCount(before + 1);
    await expect(page.getByTestId('tagbar')).toContainText('probe');
  });

  test('legt eine Aufgabe an und hakt sie ab', async ({ page }) => {
    await page.goto(URL);
    await expect(page.getByTestId('tab-aufgaben')).toBeVisible({ timeout: 15_000 });
    await page.getByTestId('tab-aufgaben').click();
    // Composer liegt seit v2.0 hinter dem "+"-FAB (siehe oben).
    await page.getByTestId('fab-add').click();
    await expect(page.getByTestId('task-composer')).toBeVisible();
    await page.getByTestId('task-title').fill('Aufgabe Playwright #orga');
    await page.getByTestId('task-add').click();
    const item = page.locator('[data-testid="task-item"]', { hasText: 'Aufgabe Playwright' });
    await expect(item).toBeVisible();
    // .click() statt .check(): Sobald done=true ist, entfernt Preact die
    // Zeile aus der aktiven Liste — erledigte Aufgaben wandern seit v2.0
    // (Things-Style) hinter den eingeklappten "Erledigt"-Abschnitt
    // (showDone startet false). .check() wartet danach ewig auf eine
    // Checked-Bestätigung an einem bereits aus dem DOM entfernten Knoten
    // (→ Timeout). Ohne diese Selbstverifikation reicht ein normaler Klick.
    await item.getByTestId('task-check').click();
    await page.getByTestId('done-toggle').click();
    await expect(item).toHaveClass(/done/);
  });

  test('Tag-Filter grenzt die Liste ein', async ({ page }) => {
    await page.goto(URL);
    await expect(page.getByTestId('tab-notizen')).toBeVisible({ timeout: 15_000 });
    await page.locator('[data-testid="tagbar"] button', { hasText: 'musik' }).first().click();
    await expect(page.locator('[data-testid="tagbar"] .tag.sel')).toBeVisible();
  });
});
