import { test, expect, openHub } from '../fixtures/hub';

const openTab = (page, id: string) =>
  page.locator(`[data-testid="admin-tab-${id}"]`).click();

async function openAdmin(page, user?: string) {
  await openHub(page, user ? { user } : {});
  await page.getByTestId('sidebar-admin').click();
  await expect(page.getByTestId('admin-panel')).toBeVisible();
}

test.describe('KRS Hub — Admin-Panel (Demo)', () => {
  test('Superadmin öffnet das Panel ohne PIN', async ({ page }) => {
    await openAdmin(page, 'Ko');
    await expect(page.getByTestId('admin-lehrer')).toBeVisible();
    // Demo-Kollegium ist seit 26dcd05 anonymisiert (8 Platzhalter statt
    // vorher 14 Klarnamen) — bewusste Datenschutz-Verbesserung, kein Bug.
    await expect(page.getByTestId('lehrer-row')).toHaveCount(8);
    await expect(page.getByTestId('lehrer-togglerole').first()).toBeVisible();
  });

  test('Lehrkraft anlegen und CSV prüfen', async ({ page }) => {
    await openAdmin(page, 'Ko');
    const before = await page.getByTestId('lehrer-row').count();
    await page.getByTestId('lehrer-kuerzel').fill('Zz');
    await page.getByTestId('lehrer-name').fill('Zander');
    await page.getByTestId('lehrer-add').click();
    await expect(page.getByTestId('lehrer-row')).toHaveCount(before + 1);

    await page.getByTestId('lehrer-csv').fill(
      'Kürzel;Name;Vorname;E-Mail\nQu;Quast;Tom;qu@realschule-schriesheim.de\nRo;Roth;Ann;ro@realschule-schriesheim.de',
    );
    await page.getByTestId('lehrer-csv-preview').click();
    await expect(page.getByTestId('lehrer-csv-result')).toContainText('2 gültig');
  });

  test('Koffer lässt sich im Demo-Store anlegen', async ({ page }) => {
    await openAdmin(page, 'Ko');
    await openTab(page, 'koffer');
    await expect(page.getByTestId('koffer-row')).toHaveCount(3);
    await page.getByTestId('koffer-barcode').fill('KOFFER-NEU');
    await page.getByTestId('koffer-bez').fill('Test-Koffer');
    await page.getByTestId('koffer-add').click();
    await expect(page.getByTestId('koffer-row')).toHaveCount(4);
  });

  test('Mitgliedschaft lässt sich toggeln', async ({ page }) => {
    await openAdmin(page, 'Ko');
    await openTab(page, 'mitglieder');
    const toggle = page.getByTestId('mitglieder-toggle').first();
    const before = await toggle.innerText();
    await toggle.click();
    await expect(toggle).not.toHaveText(before);
  });

  test('Klassenarbeit lässt sich über die Demo-Bridge löschen', async ({ page }) => {
    await openAdmin(page, 'Ko');
    await openTab(page, 'ka');
    await expect(page.getByTestId('ka-row')).toHaveCount(2);
    await page.getByTestId('ka-delete').first().click();
    await expect(page.getByTestId('ka-row')).toHaveCount(1);
  });

  test('Normaler Admin sieht keinen Rollen-Umschalter', async ({ page }) => {
    await openAdmin(page);
    await expect(page.getByTestId('admin-lehrer')).toBeVisible();
    await expect(page.getByTestId('lehrer-togglerole')).toHaveCount(0);
  });
});
