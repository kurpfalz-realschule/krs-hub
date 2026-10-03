# W2 Startvorbereitung — Testnachweis

**3. Oktober 2026 · lokale synthetische Umgebung, keine Stagingabnahme**

| Prüfung | Ergebnis |
|---|---|
| Hub vor W2, vollständige Suite | 95 bestanden, 1 übersprungen, 2 rot (98 Tests) |
| Hub nach W2, vollständige Suite | 101 bestanden, 1 übersprungen, 2 rot (104 Tests) |
| Neue W2-Flag-Tests im vollen Lauf | 6/6 bestanden |
| Finaler W2-Nachlauf einschließlich fehlendem Lader | 7/7 bestanden |
| Finaler Navigations-/Shell-Nachlauf | 9/9 bestanden |
| Fokus-Gegenprobe mit unveränderter Basis e72bd91 | 4 bestanden, 1 rot (5 Wiederholungen) |
| Lokale PostgreSQL-Rollen-/Flag-Prüfung | bestanden, Ausgabe `w2/evidence/sql-local.txt` |
| Flag-Deaktivierung und exakter lokaler Funktion-/Policy-Undo | bestanden |
| Hub Build und Artefaktprüfung | bestanden, Version 3.33.0 konsistent, 20 Dateien |
| Connect-/iPad-Regressionslauf | nicht ausgeführt; deren Code ist unverändert; zwingend vor Staging-/Liveabnahme |
| Echte Supabase-REST-/Storage-/Edge-/Realtime-Matrix | offen, keine Staginginstanz |

Vor W2: Admin-Demo-Löschen scheiterte bei `page.goto` mit `ERR_INSUFFICIENT_RESOURCES` (System meldete auch PostgreSQL-Dateideskriptor-Mangel). Im Nachher-Lauf bestanden. Zweiter Baselinefehler: „gleiche Remote-Version“ ist im Test hart auf **3.23.0** gesetzt, während die Basis **3.32.0** ist; das Updatebanner erscheint damit erwartbar. Screenshot/Fehlerkontext geprüft. Test außerhalb des W2-Scopes nicht geändert.

Nach W2: Derselbe veraltete Update-Test rot; zusätzlich A11y-Fokus-Test einmal rot (Auswahl schon Login, Fokus noch Lehrer). Derselbe Befund ist in M1a vom 3. Oktober bereits beschrieben. Keine Timeout-Erhöhung, kein W2-bezogener Admin-Fokusumbau. Gezielter Nachlauf und Zusatzfall „Flag-Skript fehlt“ siehe `w2/evidence/hub-targeted.txt`.

Die vollständige Suite ist ausdrücklich **nicht grün**. Keine Releasefreigabe daraus ableiten. W2-Browsersmokes verwenden synthetische Flag-Client-Fixtures, keine produktiven Flag-Schreibvorgänge. PostgreSQL-Modell enthält nur die für diese Entwürfe benötigten Tabellen/Policies/Funktionen; keine vollständige KRS-Baseline. Die produktiven ALL-/Admin-Policies, Privilegien und Helfer sind im echten Staging vollständig zu testen.

W2-01b wurde wegen offener Gate A/B nicht implementiert. Metadateninventur ist vollständig, Sicherheitsurteile je RPC/Edge und der vollständige Leak-Test bleiben offen. Auch Triggerkonkurrenz, Session-Rechteentzug, Auth-Signup, Restore, Commercial-Hosting/Origins und BBB-Servertest sind nicht als bestanden markiert.

Gezielter Nachlauf: 9 bestanden, 1 übersprungen, 1 rot (bekannter Fokus-Test), darin alle sieben W2-Fälle grün. Die Gegenprobe setzte ausschließlich index.html vorübergehend auf e72bd91 zurück; 4/5 bestanden, 1/5 derselbe Fokusfehler. W2-index.html anschließend automatisch wiederhergestellt. Ausgabe `w2/evidence/hub-focus-baseline-countercheck.txt`.
