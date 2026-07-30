// =====================================================================
// KRS Hub — Admin-Sektion „Login-Status" (Sprint Launch September, 30.07.2026)
//
// Prüft im DEMO-Modus (forceMode=demo&forceUser=Ko, Superadmin-Pfad):
//   - Tab ist erreichbar, Liste + Zusammenfassung erscheinen
//   - Filter „nur noch nie eingeloggt" (Default) vs. „alle"
//   - Bestätigungsdialog vor dem Versand (Abbrechen/Senden, ESC)
//   - Ergebnis-Anzeige nach dem Versand
//   - A11Y-Basics: Dialog-Rolle, aria-checked am Filter, aria-labels
//
// Demo-Daten sind Platzhalter (Lehrkraft B…H, @example.org) — keine echten
// Namen/Adressen. Der echte Mailversand läuft nur produktiv über die
// admin-gated Edge Function und wird hier NICHT ausgelöst.
// =====================================================================
import { test, expect, openHub } from '../fixtures/hub';

async function openLoginStatus(page) {
  await openHub(page, { user: 'Ko' });
  await page.getByTestId('sidebar-admin').click();
  await expect(page.getByTestId('admin-panel')).toBeVisible();
  await page.getByTestId('admin-tab-login').click();
  await expect(page.getByTestId('admin-login')).toBeVisible();
}

test.describe('KRS Hub — Login-Status (Demo)', () => {
  test('zeigt Zusammenfassung und standardmäßig nur die Nicht-Eingeloggten', async ({ page }) => {
    await openLoginStatus(page);

    // Demo-Kollegium: 8 Platzhalter, davon 5 nie eingeloggt (L3, L4, L6, L7, L8)
    await expect(page.getByTestId('login-summary')).toContainText('8 Lehrkräfte');
    await expect(page.getByTestId('login-summary')).toContainText('5 noch nie eingeloggt');

    // Filter ist prominent und standardmäßig aktiv
    const nurNie = page.getByTestId('login-filter-never');
    await expect(nurNie).toHaveAttribute('aria-checked', 'true');
    await expect(page.getByTestId('login-row')).toHaveCount(5);
    await expect(page.getByTestId('login-badge-never')).toHaveCount(5);
  });

  test('Umschalten auf „alle" zeigt das ganze Kollegium', async ({ page }) => {
    await openLoginStatus(page);
    await page.getByTestId('login-filter-all').click();
    await expect(page.getByTestId('login-filter-all')).toHaveAttribute('aria-checked', 'true');
    await expect(page.getByTestId('login-row')).toHaveCount(8);
    // Eingeloggte Kolleg:innen zeigen ein Datum statt „noch nie eingeloggt"
    await expect(page.getByTestId('login-row').last()).toContainText('zuletzt am');
  });

  test('Sammel-Versand fragt vorher nach und lässt sich abbrechen', async ({ page }) => {
    await openLoginStatus(page);
    const sendAll = page.getByTestId('login-send-all');
    await expect(sendAll).toContainText('5');
    await sendAll.click();

    const dialog = page.getByTestId('login-confirm');
    await expect(dialog).toBeVisible();
    await expect(dialog).toHaveAttribute('role', 'dialog');
    await expect(dialog).toHaveAttribute('aria-modal', 'true');
    await expect(dialog).toContainText('5 Mails');

    await page.getByTestId('login-confirm-cancel').click();
    await expect(dialog).toHaveCount(0);
    // Abbrechen heißt: nichts passiert, kein Ergebnisblock
    await expect(page.getByTestId('login-result')).toHaveCount(0);
  });

  test('ESC schließt nur den Bestätigungsdialog, nicht das Admin-Panel', async ({ page }) => {
    await openLoginStatus(page);
    await page.getByTestId('login-send-all').click();
    await expect(page.getByTestId('login-confirm')).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(page.getByTestId('login-confirm')).toHaveCount(0);
    await expect(page.getByTestId('admin-panel')).toBeVisible();
  });

  test('Einzel-Versand: Bestätigen zeigt Ergebnis und Toast', async ({ page }) => {
    await openLoginStatus(page);
    await page.getByTestId('login-send-one').first().click();
    await expect(page.getByTestId('login-confirm')).toContainText('1 Mail');
    await page.getByTestId('login-confirm-ok').click();

    await expect(page.getByTestId('login-confirm')).toHaveCount(0);
    const result = page.getByTestId('login-result');
    await expect(result).toBeVisible();
    await expect(result).toContainText('1 verschickt');
    await expect(result).toContainText('0 nicht');
  });

  test('A11Y: Buttons haben sprechende Labels, Fokus landet im Dialog', async ({ page }) => {
    await openLoginStatus(page);
    await expect(page.getByTestId('login-filter-never')).toHaveAttribute('aria-label', /noch nie eingeloggt/);
    await expect(page.getByTestId('login-send-one').first()).toHaveAttribute('aria-label', /Zugangsmail an /);
    await expect(page.getByTestId('login-reload')).toHaveAttribute('aria-label', 'Liste neu laden');

    await page.getByTestId('login-send-one').first().click();
    await expect(page.getByTestId('login-confirm-ok')).toBeFocused();
  });
});
