import { test, expect, openHub } from '../fixtures/hub';

// Contract-Test (G3-PRUEFBERICHT-2026-07-16.md, Befund INT-1):
// parseUsersCSV baut das Zeilen-Objekt, das 1:1 als `payload` an
// AdminService._post({action:'upsert', table:'users', payload}) geht.
// Das Backend (supabase/functions/dashboard-admin/validation.mjs,
// UPSERT_TABLE_FIELDS.users) akzeptiert dafür NUR diese Felder — jedes
// zusätzliche Feld (z. B. das früher hartcodierte `role: 'member'`) lässt
// den Produktiv-Import mit HTTP 400 abbrechen. Im Demo-Modus fällt das
// nicht auf, weil saveUser dort den lokalen Store nutzt (kein Netzwerk-Call)
// — deshalb prüft dieser Test den rohen parseUsersCSV-Output direkt gegen
// die Backend-Allowlist, statt sich auf den Demo-Roundtrip zu verlassen.
const BACKEND_ALLOWED_USER_FIELDS = ['id', 'kuerzel', 'name', 'vorname', 'email'];

test.describe('KRS Hub — CSV-Import Payload-Contract (INT-1)', () => {
  test('parseUsersCSV liefert nur Backend-erlaubte Felder', async ({ page }) => {
    await openHub(page, { user: 'Ko' });

    const csv = 'Kürzel;Name;Vorname;E-Mail\nQu;Quast;Tom;qu@realschule-schriesheim.de\nRo;Roth;Ann;ro@realschule-schriesheim.de';
    const result = await page.evaluate((csvText) => {
      // @ts-ignore — Testhook, siehe index.html: "Für Module/Tests erreichbar"
      return window.KRSHub.parseUsersCSV(csvText);
    }, csv);

    expect(result.errors).toEqual([]);
    expect(result.valid.length).toBe(2);

    for (const row of result.valid) {
      const disallowed = Object.keys(row).filter((f) => !BACKEND_ALLOWED_USER_FIELDS.includes(f));
      expect(disallowed, `Payload enthält vom Backend nicht erlaubte Felder: ${disallowed.join(', ')}`).toEqual([]);
    }
    expect(result.valid[0]).not.toHaveProperty('role');
  });
});
