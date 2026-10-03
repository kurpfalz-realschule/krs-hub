# Welle 2 — isolierte Startvorbereitung

**3. Oktober 2026 · W2-00 lokal implementiert, W2-01a als lokaler SQL-Entwurf getestet. Keine Staging-/Produktionsabnahme.**

Maßgeblich: Sprint Welle 2, Abschnitt 12, und Marktstart-Sprint vom 3. Oktober im Elternprojekt. Die historische Produktionsanweisung aus Abschnitt 11 wird nicht ausgeführt.

## Bestand und Sicherheitsstand

- Sichtbare Supabase-Projekte: ausschließlich `krs-connect`, `ooejsfixxiuobrpqgfqm`, Irland; keine Branches. Kein Staging bestätigt, keine neue kostenpflichtige Instanz angelegt.
- Live keine W2-Objekte (`school_features`, `students`, `courses`, Aufgaben, Meetings, Audit) und kein `is_staff()`. Der alte Hub-Eintrag `schueler-hub` ist ein vorhandener externer Link; er ist keine Umsetzung des neuen W2-Unterrichtsmoduls.
- 55 aktive Kollegiumsprofile, alle `auth_id` verknüpft; sieben Auth-Identitäten ohne Profil. Keine Namen oder E-Mails aus der Datenbank übernommen.
- `get_app_user_id`, `is_global_admin`, `is_platform_owner` und beide Auth-Verknüpfungstrigger verwenden weiterhin E-Mail-Matching.
- `users_select_auth` und `koffer_select` haben bereits Profilprüfung. Alte `images_read`-/`uploads_*`-Policies fehlen. Öffentliche `untis_*`-Objekte fehlen vollständig; historische Policy-Umbauten dürfen daher nicht blind ausgeführt werden. Kofferzugriff auf aktive Profile enger fassen; Stundenraster liest weiterhin `true`.
- Read-only RLS-Gegenprobe mit synthetischem JWT ohne Profil: users **0**, koffer_physisch **0**, storage.objects **0**, stundenraster **9** sichtbare Zeilen. Kein Konto angelegt, keine realen Datenzeilen ausgegeben, Transaktion zurückgerollt.
- SECURITY DEFINER: **73** public-Funktionen, **61** für authenticated, **0** für anon. [Vollständige Metadatenliste](W2-SECDEF-INVENTUR.md); Body-/RPC-Einzeltests offen.
- Connect enthält `online-users` Presence ohne `private:true`, einschließlich Anzeigenamen. Serverseitige Realtime-Konfiguration und negativer Beitrittstest offen; lokale Codebeobachtung bestätigt noch kein live ausgenutztes Leck.
- Sicherheits-Advisors erneut gelesen, Zusammenfassung in `w2/evidence/security-advisor-summary.json`: u.a. veränderlicher Suchpfad `touch_updated_at`, deaktivierte Passwortprüfung, GraphQL-Metadaten und ausführbare Definer-RPCs. Keine pauschale Änderung solcher Grants; Zugriff einzeln prüfen. [Suchpfad-Erklärung](https://supabase.com/docs/guides/database/database-linter?lint=0011_function_search_path_mutable), [Passwortprüfung](https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection).

S-2 ist damit **nicht vollständig neu abgenommen**. Signup-aus, geschützte Sicherung/Restore und Gate A/B bleiben offen. Keine Schülerkonten und keine W2-01b-Tabellen erzeugt.

## Lokale Umsetzung

Separate Kopie von Hub-Commit `e72bd91` auf `welle2/w2-00-staging`, Version **3.33.0** (lokale Kandidatennummer, vor Integration erneut vergeben). M1-Arbeitsbäume bleiben unverändert. Der Hub enthält weiter historische KRS-Konfiguration: diese Kopie ist kein deployfähiges neutrales Staging. Nur Demo-Tests mit synthetischen Fixtures ausführen; vor echtem Staging M2/M3-Konfiguration/Baseline herstellen.

- W2-00: Tabelle/SELECT-RLS/minimale Grants, alle drei Flags aus; `feature_on` als Invoker, da Lesen der nicht sensiblen Flags genügt. Direkte Schreibrechte explizit entfernt.
- Unterrichtskachel nur bei Serverflag true und Tenant-Flag nicht false; Tenantdefaults alle false. Platzhalter unter `modules/unterricht.html`. Neuladen bei Login, Fokus und alle 60 Sekunden; Fehler schalten Sichtbarkeit aus. Kein Realtime. Logout/ältere Antworten können Freigabe nicht wiederherstellen. Direkter Hash öffnet deaktiviertes Modul nicht; Abschalten entfernt bereits geöffnetes iframe.
- Keine neue Schüleroberfläche, Kurse, Hausaufgaben oder BBB-Integration. Lehrkraft-/Schüler-Origins sind noch nicht eingerichtet.
- W2-01a: aktive `auth_id`-Identität ohne E-Mail-Fallback, Staff-Gate für Koffer/Stundenraster, Schutz beider Auth-Trigger und `users.email` für **synthetische** Domain `student.w2.invalid`. Schulbezogene Pseudodomain vor echter Migration festlegen. Definer nur für rekursionsfreie Profil-/Rollenprüfung und privilegierte Trigger; fester Suchpfad, explizite Grants.
- `w2/drafts/*.sql` sind lokale Entwürfe, ausdrücklich keine Deploymentmigrationen. Isolationsmarker verhindert versehentliche Ausführung auf bestehender Produktion. Supabase CLI und Docker fehlen; nach Bestandsabgleich CLI-generierte Migrationen mit `supabase migration new` anlegen, keine erfundenen Migrationstimestamps.
- Rollback: Flag-Deaktivierung erhält Daten. UNDO testet ausschließlich exakte lokale Funktions-/Policy-Snapshots; vor Migration vollständige Staging-Snapshots erzeugen. Kein DROP/CASCADE-Produktionsrollback.

## Wiederholung

PostgreSQL 18 aus vorhandenem Homebrew gestartet unter `/tmp/krs-w2-pg-data`, Unix-Socket `/tmp/krs-w2-pg-socket`, Port 55483, ausschließlich Loopback. Das ist ein minimales synthetisches Testmodell, **kein Supabase-Staging**. Produktiv ist PostgreSQL 17; Test gegen echte Supabase-Instanz bleibt erforderlich. `w2/tests/run-local.sh` erstellt pro Lauf eine neue synthetische Datenbank und nimmt keine externe Datenbank-URL entgegen.

Lokale SQL-Prüfung: `./w2/tests/run-local.sh` (vorher Testserver starten). Hub: `./node_modules/.bin/playwright test --project=hub`. Build: `npm run build:site` und `npm run verify:site`. Abhängigkeiten hier nur verlinkt, nicht neu installiert. Belege in `w2/evidence/`.

## Nächster Schritt

1. Getrennte Staging-Instanz festlegen; Kosten/Organisation/Region vor Anlage klären. Öffentliches Signup aus nachweisen; leere vollständige M3-Baseline ohne KRS-Daten herstellen.
2. S-2 anhand tatsächlicher Objekte/Functions/Realtime vollständig prüfen, Restore belegen. Offene sieben Auth-Konten durch zuständige Person beurteilen.
3. W2-00/W2-01a Entwürfe an diesen geprüften Stand anpassen, Migrationen erstellen, Rollenmatrix einschließlich REST/Edge/Storage/Views auf Staging testen.
4. Erst bei Gate A/B grün W2-01b mit Identitätsexklusivität auch bei konkurrierenden Writes und kompletter Leak-Matrix umsetzen.

Zugriff zur Einordnung: [KRS-Produktion](https://supabase.com/dashboard/project/ooejsfixxiuobrpqgfqm), [Auth-Providers](https://supabase.com/dashboard/project/ooejsfixxiuobrpqgfqm/auth/providers). Keine Staging-URL vorhanden. Aktuelle Architektur gegen [Supabase RLS-Dokumentation](https://supabase.com/docs/guides/database/postgres/row-level-security) und [Funktionen](https://supabase.com/docs/guides/database/functions) geprüft. Changelog-Markdown über Web-Tool nicht abrufbar, Shell-Netzwerk blockiert; vollständige Changelog-Prüfung bleibt offen.
