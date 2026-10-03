# W2 SECURITY-DEFINER-Inventur (Metadaten)

**3. Oktober 2026 · read-only live geprüft · Einzelabnahme offen.**

Live: 73 SECURITY-DEFINER-Funktionen in public; 61 für authenticated, 0 für anon ausführbar. Historische 51/16 sind überholt.

Jede Zeile benötigt Body-Review, Aufrufstellenprüfung und synthetischen Negativtest in vollständigem Staging. Metadaten und Advisor-Warnungen allein sind kein Urteil über Ausnutzbarkeit. Schreibende RPCs werden nicht pauschal mit geratenen Parametern in Produktion aufgerufen.

| Funktion | authenticated | anon | search_path | Urteil / Test |
|---|---|---|---|---|
| `_buchung_offene_koffer(p_buchung_id bigint)` | false | false | `["search_path=public"]` | Body-Review und Rollen-Negativtest offen |
| `ack_post(p_post_id bigint)` | true | false | `["search_path=public"]` | Body-Review und Rollen-Negativtest offen |
| `ack_status(p_post_id bigint)` | true | false | `["search_path=public"]` | Body-Review und Rollen-Negativtest offen |
| `auto_link_app_user()` | true | false | `["search_path=public"]` | E-Mail-Matching live bestätigt; lokaler W2-01a-Entwurf; Vollstaging-Test offen |
| `buchung_rueckgabe_nachziehen(p_buchung_id bigint)` | false | false | `["search_path=public"]` | Body-Review und Rollen-Negativtest offen |
| `buchung_zeit_vorbei(p_datum date, p_bis integer)` | true | false | `["search_path=public"]` | Body-Review und Rollen-Negativtest offen |
| `can_add_conversation_member(p_conversation_id bigint)` | true | false | `["search_path=public"]` | Body-Review und Rollen-Negativtest offen |
| `create_team(p_name text, p_description text, p_icon_text text, p_icon_color text)` | true | false | `["search_path=public"]` | Body-Review und Rollen-Negativtest offen |
| `get_app_user_id()` | true | false | `["search_path=public"]` | E-Mail-Matching live bestätigt; lokaler W2-01a-Entwurf; Vollstaging-Test offen |
| `get_kollegium_public()` | true | false | `["search_path=public"]` | Body-Review und Rollen-Negativtest offen |
| `get_or_create_dm(p_other_user_id bigint)` | true | false | `["search_path=public"]` | Body-Review und Rollen-Negativtest offen |
| `get_user_conversation_ids()` | true | false | `["search_path=public"]` | Body-Review und Rollen-Negativtest offen |
| `get_user_team_ids()` | true | false | `["search_path=public"]` | Body-Review und Rollen-Negativtest offen |
| `guard_user_role_change()` | false | false | `["search_path=\"\""]` | Body-Review und Rollen-Negativtest offen |
| `handle_new_auth_user()` | true | false | `["search_path=public"]` | E-Mail-Matching live bestätigt; lokaler W2-01a-Entwurf; Vollstaging-Test offen |
| `hub_infos_touch()` | true | false | `["search_path=public"]` | Body-Review und Rollen-Negativtest offen |
| `is_app_admin()` | true | false | `["search_path=public"]` | Body-Review und Rollen-Negativtest offen |
| `is_conversation_member(conv_id bigint)` | true | false | `["search_path=public"]` | Body-Review und Rollen-Negativtest offen |
| `is_global_admin()` | true | false | `["search_path=public"]` | E-Mail-Matching live bestätigt; lokaler W2-01a-Entwurf; Vollstaging-Test offen |
| `is_hub_editor()` | true | false | `["search_path=public"]` | Body-Review und Rollen-Negativtest offen |
| `is_ipad_admin()` | true | false | `["search_path=public"]` | Body-Review und Rollen-Negativtest offen |
| `is_platform_owner()` | true | false | `["search_path=public"]` | E-Mail-Matching live bestätigt; lokaler W2-01a-Entwurf; Vollstaging-Test offen |
| `is_team_admin(p_team_id text)` | true | false | `["search_path=public"]` | Body-Review und Rollen-Negativtest offen |
| `is_team_member(p_team_id text)` | true | false | `["search_path=public"]` | Body-Review und Rollen-Negativtest offen |
| `kalender_retention()` | false | false | `["search_path=public"]` | Body-Review und Rollen-Negativtest offen |
| `krs_ack_post_team(p_post_id bigint, p_uid bigint)` | false | false | `["search_path=public"]` | Body-Review und Rollen-Negativtest offen |
| `krs_admin_users()` | true | false | `["search_path=\"\""]` | Body-Review und Rollen-Negativtest offen |
| `krs_can_read_object(p_name text, p_owner text)` | true | false | `["search_path=\"\""]` | Body-Review und Rollen-Negativtest offen |
| `krs_hook_secret()` | false | false | `["search_path=\"\""]` | Body-Review und Rollen-Negativtest offen |
| `krs_is_quiet(p_user bigint, p_at timestamp with time zone)` | false | false | `["search_path=\"\""]` | Body-Review und Rollen-Negativtest offen |
| `krs_my_profile()` | true | false | `["search_path=\"\""]` | Body-Review und Rollen-Negativtest offen |
| `krs_name_change_ok(p_user_id bigint, p_old text, p_new text)` | true | false | `["search_path=\"\""]` | Body-Review und Rollen-Negativtest offen |
| `krs_notify_hook()` | false | false | `["search_path=\"\""]` | Body-Review und Rollen-Negativtest offen |
| `krs_quiet_users(p_users bigint[], p_at timestamp with time zone)` | false | false | `["search_path=\"\""]` | Body-Review und Rollen-Negativtest offen |
| `pool_frei_pro_stunde(p_typ text, p_standort text, p_datum date, p_von integer, p_bis integer, p_exclude_buchung_id bigint)` | false | false | `["search_path=public"]` | Body-Review und Rollen-Negativtest offen |
| `rls_i_am_users_admin()` | true | false | `["search_path=public"]` | Body-Review und Rollen-Negativtest offen |
| `rls_my_admin_team_ids()` | true | false | `["search_path=public"]` | Body-Review und Rollen-Negativtest offen |
| `rls_my_conversation_ids()` | true | false | `["search_path=public"]` | Body-Review und Rollen-Negativtest offen |
| `rls_my_team_ids()` | true | false | `["search_path=public"]` | Body-Review und Rollen-Negativtest offen |
| `rpc_auslastung(p_von date, p_bis date)` | true | false | `["search_path=public"]` | Body-Review und Rollen-Negativtest offen |
| `rpc_auto_return_due(p_stunde integer)` | true | false | `["search_path=public"]` | Body-Review und Rollen-Negativtest offen |
| `rpc_buchung_loeschen(p_buchung_id bigint)` | true | false | `["search_path=public"]` | Body-Review und Rollen-Negativtest offen |
| `rpc_buchung_stornieren(p_buchung_id bigint)` | true | false | `["search_path=public"]` | Body-Review und Rollen-Negativtest offen |
| `rpc_buchung_zurueckgeben(p_buchung_id bigint)` | true | false | `["search_path=public"]` | Body-Review und Rollen-Negativtest offen |
| `rpc_buchungen_offen_admin()` | true | false | `["search_path=public"]` | Body-Review und Rollen-Negativtest offen |
| `rpc_check_kapazitaet(p_koffer_id bigint, p_datum date, p_von integer, p_bis integer, p_exclude_buchung_id bigint)` | true | false | `["search_path=public"]` | Body-Review und Rollen-Negativtest offen |
| `rpc_check_kapazitaet_pool(p_typ text, p_standort text, p_datum date, p_von integer, p_bis integer, p_exclude_buchung_id bigint)` | true | false | `["search_path=public"]` | Body-Review und Rollen-Negativtest offen |
| `rpc_checkout(p_barcode text, p_idempotency_key text, p_buchung_id bigint)` | true | false | `["search_path=public"]` | Body-Review und Rollen-Negativtest offen |
| `rpc_koffer_ausser_betrieb(p_koffer_id bigint, p_ausser_betrieb boolean, p_grund text)` | true | false | `["search_path=public"]` | Body-Review und Rollen-Negativtest offen |
| `rpc_koffer_melden(p_koffer_id bigint, p_art text, p_anzahl integer, p_geraete text, p_text text, p_buchung_id bigint)` | true | false | `["search_path=public"]` | Body-Review und Rollen-Negativtest offen |
| `rpc_koffer_meldung_erledigen(p_id bigint, p_notiz text)` | true | false | `["search_path=public"]` | Body-Review und Rollen-Negativtest offen |
| `rpc_koffer_meldung_wieder_oeffnen(p_id bigint)` | true | false | `["search_path=public"]` | Body-Review und Rollen-Negativtest offen |
| `rpc_koffer_meldungen_admin(p_status text, p_koffer_id bigint)` | true | false | `["search_path=public"]` | Body-Review und Rollen-Negativtest offen |
| `rpc_koffer_meldungen_offen()` | true | false | `["search_path=public"]` | Body-Review und Rollen-Negativtest offen |
| `rpc_mark_channel_read(p_channel_id bigint)` | true | false | `["search_path=public"]` | Body-Review und Rollen-Negativtest offen |
| `rpc_mark_conversation_read(p_conversation_id bigint)` | true | false | `["search_path=public"]` | Body-Review und Rollen-Negativtest offen |
| `rpc_mark_thread_read(p_parent_id bigint)` | true | false | `["search_path=public"]` | Body-Review und Rollen-Negativtest offen |
| `rpc_nightly_reset()` | false | false | `["search_path=public"]` | Body-Review und Rollen-Negativtest offen |
| `rpc_nutzung_pro_person(p_von date, p_bis date)` | true | false | `["search_path=public"]` | Body-Review und Rollen-Negativtest offen |
| `rpc_reserviere(p_koffer_id bigint, p_datum date, p_von integer, p_bis integer, p_zweck text)` | true | false | `["search_path=public"]` | Body-Review und Rollen-Negativtest offen |
| `rpc_reserviere_pool(p_typ text, p_standort text, p_datum date, p_von integer, p_bis integer, p_anzahl integer, p_zweck text)` | true | false | `["search_path=public"]` | Body-Review und Rollen-Negativtest offen |
| `rpc_return(p_barcode text, p_idempotency_key text)` | true | false | `["search_path=public"]` | Body-Review und Rollen-Negativtest offen |
| `rpc_station_checkout(p_lehrer_code text, p_barcode text, p_von integer, p_bis integer, p_idempotency_key text)` | true | false | `["search_path=public"]` | Body-Review und Rollen-Negativtest offen |
| `rpc_station_return(p_barcode text, p_idempotency_key text)` | true | false | `["search_path=public"]` | Body-Review und Rollen-Negativtest offen |
| `rpc_unread_channel_counts(p_channel_ids bigint[])` | true | false | `["search_path=public"]` | Body-Review und Rollen-Negativtest offen |
| `rpc_unread_conversation_counts(p_conversation_ids bigint[])` | true | false | `["search_path=public"]` | Body-Review und Rollen-Negativtest offen |
| `rpc_unread_thread_counts(p_channel_ids bigint[])` | true | false | `["search_path=public"]` | Body-Review und Rollen-Negativtest offen |
| `rpc_unread_urgent(p_limit integer)` | true | false | `["search_path=public"]` | Body-Review und Rollen-Negativtest offen |
| `set_membership_hidden(p_kind text, p_id bigint, p_hidden boolean)` | true | false | `["search_path=public"]` | Body-Review und Rollen-Negativtest offen |
| `team_files_before_write()` | false | false | `["search_path=\"\""]` | Body-Review und Rollen-Negativtest offen |
| `team_files_has_children(p_id uuid)` | true | false | `["search_path=\"\""]` | Body-Review und Rollen-Negativtest offen |
| `toggle_reaction(p_target_type text, p_target_id bigint, p_user_id bigint, p_emoji text)` | true | false | `["search_path=public"]` | Body-Review und Rollen-Negativtest offen |
| `vote_poll(p_post_id bigint, p_option_id integer)` | true | false | `["search_path=\"\""]` | Body-Review und Rollen-Negativtest offen |

## Edge / Realtime

Live-Metadaten: dashboard-admin v11 (JWT-Gateway an), kalender-sync v3 (an), kalender-feed v4 (aus), notify-email v8 (aus), notify-push v6 (aus). Gateway-Einstellung allein bestätigt keine Autorisierung im Body. Schüler-JWT-Tests offen; Mail/Push beim Test serverseitig blockieren.

Connect index.html, subscribePresence: Kanal online-users enthält presence-Konfiguration, aber kein private:true. Live-Serverkonfiguration und realtime.messages-Policies prüfen; Zugriff mit synthetischem JWT in Staging testen. Dieser Befund ist keine Live-Leckbestätigung.

