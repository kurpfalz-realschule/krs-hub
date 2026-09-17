/*!
 * krs-native.js — Brücke zwischen der nativen iOS-Hülle und dem KRS Hub
 * Kurpfalz-Realschule Schriesheim · gehört ins Repo krs-hub, neben index.html
 *
 * ------------------------------------------------------------------------
 * GRUNDREGEL: Diese Datei darf im normalen Browser NICHTS verändern.
 * Läuft sie nicht in der App, setzt sie `available = false`, legt No-op-
 * Funktionen an und beendet sich. Der Hub verhält sich dann exakt wie heute.
 * ------------------------------------------------------------------------
 *
 * Sie erledigt vier Dinge, die im WKWebView sonst kaputt sind oder fehlen:
 *
 *   1. Sichere Bereiche (Notch, Home-Indikator) als CSS-Variablen bereitstellen.
 *   2. Externe Links abfangen — `window.open`/`target="_blank"` tun im
 *      WKWebView sonst schlicht gar nichts, der Link wirkt "kaputt".
 *      Im Hub 3.14.0 hängen vier Links so (Untis, Homepage, Kalender, …).
 *   3. Push-Benachrichtigungen (APNs) statt der Web-Notification-API, die im
 *      WKWebView nicht existiert.
 *   4. Eine eng begrenzte RPC-Brücke, damit KRS Connect im iframe native
 *      Funktionen nutzen kann — Capacitor spritzt seine Brücke nur in den
 *      obersten Rahmen ein, das iframe erreicht sie nicht selbst.
 *
 * Dazu: Face ID als Angebot (`unlock()`, siehe 3b) und Sitzungs-Spiegelung als
 * Rückfallebene für einen PIN-Login (siehe PERSIST_KEYS — auf dem aktuellen Hub
 * wirkungslos).
 *
 * Version: 1.0.0
 */
(function () {
  'use strict';

  var VERSION = '1.0.0';
  var LOG = '[krs-native]';

  // Welche Herkünfte dürfen die RPC-Brücke benutzen? Muss zu den Modulen in
  // CONFIG.MODULES passen. Bewusst als Liste, nicht als Wildcard.
  var RPC_ORIGINS = ['https://kurpfalz-realschule.github.io'];

  // Diese sessionStorage-Schlüssel überleben in der App den Kaltstart.
  // Alles andere bleibt flüchtig.
  //
  // STAND 13.09.2026 — bitte lesen, bevor jemand hier etwas erwartet:
  //   Der LIVE-Hub (3.14.0) meldet sich über Supabase Auth an
  //   (`signInWithPassword`) und legt die Sitzung dort in localStorage ab.
  //   localStorage überlebt den Kaltstart im WKWebView von sich aus — das
  //   Abmelde-Problem besteht auf diesem Hub also gar nicht, und die
  //   Spiegelung unten läuft schlicht ins Leere (die Schlüssel existieren
  //   nicht, also passiert nichts).
  //
  //   Die Spiegelung stammt aus einem lokal gefundenen, NIE GEPUSHTEN Hub-Stand
  //   2.1.0-phase2 mit PIN-Login und sessionStorage. Sie bleibt als Rückfall-
  //   ebene drin, weil sie nichts kostet und bei einem Rückgriff auf den
  //   PIN-Login sofort wieder greift. Wer sicher ist, dass der PIN-Login nie
  //   wiederkommt, kann PERSIST_KEYS leeren.
  var PERSIST_KEYS = ['krs_session', 'krs_pin_data'];

  var cap = window.Capacitor;
  var isNative = !!(cap && cap.isNativePlatform && cap.isNativePlatform());
  var P = (cap && cap.Plugins) || {};

  // APNs hat zwei getrennte Umgebungen, und ein Token aus der einen wird in der
  // anderen abgelehnt (Apple antwortet „BadDeviceToken"). Die Zuordnung ist:
  //
  //   Xcode direkt aufs Gerät (Debug)  → sandbox
  //   TestFlight und App Store         → production
  //
  // Capacitor setzt `DEBUG` aus der Build-Konfiguration. Fehlt der Wert, nehmen
  // wir production an — das ist der Fall, der die Kolleg:innen betrifft.
  var PRODUKTIV_BUILD = !(cap && cap.DEBUG === true);

  // ─────────────────────────────────────────────────────────────
  // Browser-Fall: sofort aussteigen
  // ─────────────────────────────────────────────────────────────
  if (!isNative) {
    window.KRSNative = {
      version: VERSION,
      available: false,
      platform: 'web',
      ready: Promise.resolve(false),
      haptic: function () {},
      openExternal: function (url) { window.open(url, '_blank', 'noopener'); },
      share: function () { return Promise.resolve(false); },
      enablePush: function () { return Promise.resolve({ ok: false, reason: 'web' }); },
      pushStatus: function () { return Promise.resolve({ granted: false, token: null }); },
      unlock: function () { return Promise.resolve(true); },
      hideSplash: function () {}
    };
    return;
  }

  function log() {
    try { console.log.apply(console, [LOG].concat([].slice.call(arguments))); } catch (e) {}
  }
  function warn() {
    try { console.warn.apply(console, [LOG].concat([].slice.call(arguments))); } catch (e) {}
  }

  /** Ruft eine Plugin-Methode auf und wirft nie — fehlende Plugins dürfen die App nicht stoppen. */
  function call(plugin, method, args) {
    var p = P[plugin];
    if (!p || typeof p[method] !== 'function') {
      return Promise.reject(new Error('Plugin ' + plugin + '.' + method + ' fehlt'));
    }
    try { return Promise.resolve(p[method](args || {})); }
    catch (e) { return Promise.reject(e); }
  }
  function safe(promise, fallback) {
    return promise.then(null, function (e) { warn(e && e.message); return fallback; });
  }

  // ─────────────────────────────────────────────────────────────
  // 1. Sichere Bereiche als CSS-Variablen
  //    --krs-safe-top/-bottom/-left/-right stehen danach überall zur Verfügung.
  //    Ohne das klebt die Kopfzeile unter der Uhr und die unterste Schaltfläche
  //    liegt auf dem Home-Indikator.
  // ─────────────────────────────────────────────────────────────
  function applySafeAreas() {
    var css = [
      ':root{',
      '--krs-safe-top:env(safe-area-inset-top,0px);',
      '--krs-safe-bottom:env(safe-area-inset-bottom,0px);',
      '--krs-safe-left:env(safe-area-inset-left,0px);',
      '--krs-safe-right:env(safe-area-inset-right,0px);',
      '}',
      // Der Hub selbst legt die Safe-Area bereits einmal auf .shell. Zusätzliche
      // Abstände auf body würden den oberen Rand verdoppeln und #root über die
      // sichtbare WebView-Höhe hinausschieben (abgeschnittene untere Tab-Leiste).
      'html[data-krs-native] body{',
      'box-sizing:border-box;',
      '}',
      // Gummiband-Scrollen des Dokuments aus: sonst zieht man in Listen den
      // ganzen Rahmen mit und sieht den grauen WebView-Grund.
      'html[data-krs-native],html[data-krs-native] body{overscroll-behavior-y:none;}',
      // Doppeltipp-Zoom und Textauswahl auf Bedienelementen abschalten —
      // in einer App fühlt sich beides wie ein Fehler an.
      'html[data-krs-native] button,html[data-krs-native] [role="button"]{',
      '-webkit-touch-callout:none;-webkit-user-select:none;user-select:none;',
      '}'
    ].join('');
    var el = document.createElement('style');
    el.id = 'krs-native-css';
    el.textContent = css;
    (document.head || document.documentElement).appendChild(el);
    document.documentElement.setAttribute('data-krs-native', 'ios');
  }

  // ─────────────────────────────────────────────────────────────
  // 2. Externe Links in den System-Browser
  // ─────────────────────────────────────────────────────────────
  function openExternal(url) {
    if (!url) return Promise.resolve(false);
    return safe(call('Browser', 'open', { url: String(url), presentationStyle: 'popover' }), false)
      .then(function () { return true; });
  }

  function interceptExternalLinks() {
    // a) window.open ersetzen. Im WKWebView passiert sonst gar nichts.
    var nativeOpen = window.open;
    window.open = function (url) {
      if (url && /^https?:/i.test(String(url))) { openExternal(url); return null; }
      try { return nativeOpen.apply(window, arguments); } catch (e) { return null; }
    };

    // b) Klicks auf target="_blank" abfangen (Capture-Phase, damit React
    //    nichts vorwegnimmt).
    document.addEventListener('click', function (ev) {
      var a = ev.target && ev.target.closest && ev.target.closest('a[href]');
      if (!a) return;
      var href = a.getAttribute('href') || '';
      if (!/^https?:/i.test(href)) return;                 // mailto:, tel: → iOS regelt das
      var external = a.target === '_blank' ||
                     href.indexOf(location.origin) !== 0;
      if (!external) return;
      ev.preventDefault();
      openExternal(href);
    }, true);
  }

  // ─────────────────────────────────────────────────────────────
  // 3. Session über den Kaltstart retten
  //
  // WICHTIG — warum localStorage und nicht der Schlüsselbund:
  //   Der Hub liest seinen Anmeldezustand SYNCHRON beim Start. Jeder
  //   Plugin-Aufruf (Schlüsselbund, Preferences) ist dagegen asynchron und
  //   antwortet erst, wenn der Hub längst als "abgemeldet" gerendert hat.
  //   Eine asynchrone Wiederherstellung käme also immer zu spät und würde nur
  //   ein sichtbares Umspringen der Oberfläche erzeugen.
  //   localStorage ist synchron UND überlebt im WKWebView den Kaltstart —
  //   damit ist die Wiederherstellung fertig, bevor der Hub die erste Zeile
  //   Anwendungscode ausführt.
  //
  //   Zur Sicherheit: dieser localStorage liegt in der Sandbox der App, nicht
  //   im Safari-Profil. Keine andere App und keine Website kommt heran. Den
  //   Zugriffsschutz auf dem entsperrten Gerät übernimmt die Auto-Sperre des
  //   Hubs (`krs_hub_autolock`), optional mit Face ID über unlock() (3b).
  // ─────────────────────────────────────────────────────────────
  var MIRROR_PREFIX = 'krs_native_persist_';

  /** Läuft synchron und sofort — vor dem Anwendungscode des Hubs. */
  function restoreSessionSync() {
    var restored = 0;
    PERSIST_KEYS.forEach(function (k) {
      try {
        if (sessionStorage.getItem(k) !== null) return;      // schon da, nichts tun
        var v = localStorage.getItem(MIRROR_PREFIX + k);
        if (v !== null) { sessionStorage.setItem(k, v); restored++; }
      } catch (e) {}
    });
    if (restored) log(restored + ' Sitzungsschlüssel wiederhergestellt');
    return restored;
  }

  function mirrorSession() {
    // ACHTUNG, Fallstrick:
    //   `sessionStorage.setItem = fn` funktioniert NICHT. Storage-Objekte haben
    //   einen Setter für benannte Eigenschaften — die Zuweisung legt einen
    //   EINTRAG mit dem Schlüssel "setItem" an, statt die Methode zu ersetzen.
    //   Der Hub würde weiter die Originalmethode aufrufen, die Spiegelung liefe
    //   ins Leere, und auf dem iPhone wäre man nach jedem Start abgemeldet —
    //   ohne jede Fehlermeldung. (Von den Tests in tests/bridge.test.mjs
    //   aufgedeckt.)
    //
    //   Verlässlich ist nur der Prototyp. Wir fassen dort an und lassen alles
    //   durch, was nicht die Sitzung des Hubs betrifft — insbesondere bleibt
    //   localStorage unberührt.
    var proto = Object.getPrototypeOf(sessionStorage) || window.Storage.prototype;
    var origSet = proto.setItem;
    var origRemove = proto.removeItem;
    var origClear = proto.clear;
    var ss = sessionStorage;

    var betrifftSitzung = function (self, key) {
      return self === ss && PERSIST_KEYS.indexOf(key) !== -1;
    };

    proto.setItem = function (k, v) {
      origSet.call(this, k, v);
      if (betrifftSitzung(this, k)) {
        try { origSet.call(localStorage, MIRROR_PREFIX + k, String(v)); } catch (e) {}
      }
    };
    proto.removeItem = function (k) {
      origRemove.call(this, k);
      if (betrifftSitzung(this, k)) {
        try { origRemove.call(localStorage, MIRROR_PREFIX + k); } catch (e) {}
      }
    };
    // Abmelden muss die Spiegelung sicher mitlöschen — sonst wäre man nach
    // dem nächsten Start wieder angemeldet.
    proto.clear = function () {
      var warSitzung = this === ss;
      origClear.call(this);
      if (warSitzung) {
        PERSIST_KEYS.forEach(function (k) {
          try { origRemove.call(localStorage, MIRROR_PREFIX + k); } catch (e) {}
        });
      }
    };
  }

  /** Vollständig abmelden — auch die Spiegelung. Für den Abmelden-Knopf. */
  function forgetSession() {
    PERSIST_KEYS.forEach(function (k) {
      try { sessionStorage.removeItem(k); } catch (e) {}
      try { localStorage.removeItem(MIRROR_PREFIX + k); } catch (e) {}
    });
  }

  // ─────────────────────────────────────────────────────────────
  // 3b. Face ID — als ANGEBOT, nicht als eigener Sperrbildschirm
  //
  // Der Hub hat seit 3.x eine eigene Auto-Sperre (Inaktivitäts-Timer,
  // `sessionStorage.krs_hub_locked`, Einstellung `krs_hub_autolock`). Die Brücke
  // baut deshalb bewusst KEINEN zweiten Sperrbildschirm — zwei konkurrierende
  // Overlays wären schlimmer als gar kein Face ID.
  //
  // Stattdessen: `unlock()` fragt Face ID ab und gibt true/false zurück. Wer den
  // Sperrbildschirm des Hubs pflegt, hängt es dort mit einer Zeile ein:
  //
  //     if (window.KRSNative?.available) {
  //       const ok = await window.KRSNative.unlock('KRS Schule entsperren');
  //       if (ok) entsperren();
  //     }
  //
  // Ist kein Face ID eingerichtet oder bricht jemand ab, liefert unlock() false —
  // der Hub bleibt dann einfach bei seinem bisherigen Weg (Passwort).
  // ─────────────────────────────────────────────────────────────
  function biometryAvailable() {
    return safe(call('BiometricAuthNative', 'checkBiometry'), null)
      .then(function (r) { return !!(r && r.isAvailable); });
  }

  function unlock(reason) {
    return biometryAvailable().then(function (ok) {
      if (!ok) return false;   // kein Face ID eingerichtet → Aufrufer entscheidet
      return call('BiometricAuthNative', 'internalAuthenticate', {
        reason: reason || 'KRS Schule entsperren',
        cancelTitle: 'Abbrechen',
        allowDeviceCredential: true,
        iosFallbackTitle: 'Code eingeben'
      }).then(function () { return true; }, function () { return false; });
    });
  }

  // ─────────────────────────────────────────────────────────────
  // 4. Push-Benachrichtigungen
  // ─────────────────────────────────────────────────────────────
  var pushToken = null;
  var pushTapHandlers = [];

  function enablePush() {
    return call('PushNotifications', 'checkPermissions')
      .then(function (p) {
        if (p.receive === 'granted') return p;
        return call('PushNotifications', 'requestPermissions');
      })
      .then(function (p) {
        if (p.receive !== 'granted') return { ok: false, reason: 'denied' };
        return call('PushNotifications', 'register').then(function () {
          return { ok: true };
        });
      })
      .then(null, function (e) { return { ok: false, reason: e && e.message }; });
  }

  /**
   * Schreibt den APNs-Gerätetoken nach public.push_tokens.
   *
   * Warum über den Client des Hubs (`window.KRSHub.getClient`) und nicht über
   * einen eigenen: Die Tabelle ist per RLS auf `user_id = get_app_user_id()`
   * abgeriegelt. Nur mit der bestehenden, angemeldeten Sitzung geht der Schreib-
   * vorgang durch — ein frischer Client ohne Sitzung würde abgewiesen.
   *
   * Der Aufruf ist ein upsert auf `token`: Meldet sich auf demselben iPad eine
   * andere Lehrkraft an, wandert die Zeile mit. Sonst bekäme die vorherige
   * weiter deren Benachrichtigungen.
   *
   * Scheitert irgendetwas davon, passiert nichts weiter — ohne Eintrag gibt es
   * eben keine Benachrichtigungen, die App bleibt voll benutzbar.
   */
  function tokenHinterlegen(token) {
    if (!token) return;
    var hub = window.KRSHub;
    if (!hub || typeof hub.getClient !== 'function') {
      warn('window.KRSHub.getClient fehlt — Token nicht hinterlegt. '
         + 'Fehlt die Zeile in der index.html des Hubs?');
      return;
    }
    Promise.resolve()
      .then(function () { return hub.getClient(); })
      .then(function (sb) {
        if (!sb || !sb.auth) throw new Error('kein Supabase-Client');
        return sb.auth.getSession().then(function (r) {
          var session = r && r.data && r.data.session;
          if (!session) throw new Error('nicht angemeldet');
          // users.id über die bestehende RPC — dieselbe, die auch die RLS nutzt.
          return sb.rpc('get_app_user_id').then(function (res) {
            var uid = res && res.data;
            if (!uid) throw new Error('keine app_user_id');
            return sb.from('push_tokens').upsert({
              user_id: uid,
              token: token,
              platform: 'ios',
              // Sandbox-Token (Xcode-Build vom Gerät) funktionieren NICHT am
              // Produktiv-Gateway. Capacitor sagt uns das nicht, aber Debug-
              // Builds sind an der aktivierten Entwicklerkonsole erkennbar.
              environment: PRODUKTIV_BUILD ? 'production' : 'sandbox',
              disabled_at: null,
              disabled_reason: null,
              updated_at: new Date().toISOString()
            }, { onConflict: 'token' });
          });
        });
      })
      .then(function (r) {
        if (r && r.error) warn('Token nicht hinterlegt:', r.error.message);
        else log('Gerätetoken hinterlegt');
      }, function (e) { warn('Token nicht hinterlegt:', e && e.message); });
  }

  function wirePush() {
    var pn = P.PushNotifications;
    if (!pn || !pn.addListener) return;

    pn.addListener('registration', function (t) {
      pushToken = t && t.value;
      log('APNs-Token erhalten');
      window.dispatchEvent(new CustomEvent('krs-native-pushtoken', { detail: { token: pushToken } }));
      tokenHinterlegen(pushToken);
    });

    pn.addListener('registrationError', function (e) {
      warn('Push-Registrierung fehlgeschlagen:', e && e.error);
    });

    // Tippt jemand auf eine Benachrichtigung, springen wir ins richtige Modul.
    pn.addListener('pushNotificationActionPerformed', function (ev) {
      var data = (ev && ev.notification && ev.notification.data) || {};
      pushTapHandlers.forEach(function (h) { try { h(data); } catch (e) {} });
      if (data.module) {
        try { location.hash = String(data.module); } catch (e) {}
      }
      window.dispatchEvent(new CustomEvent('krs-native-pushtap', { detail: data }));
    });
  }

  // ─────────────────────────────────────────────────────────────
  // 5. RPC-Brücke für das Connect-iframe
  //    Bewusst eine kurze, feste Liste — das iframe bekommt KEINEN Zugriff
  //    auf Schlüsselbund, Dateien oder beliebige Plugins.
  // ─────────────────────────────────────────────────────────────
  var RPC = {
    isNative: function () { return Promise.resolve({ native: true, platform: 'ios', version: VERSION }); },
    haptic: function (a) { return safe(call('Haptics', 'impact', { style: (a && a.style) || 'MEDIUM' }), null); },
    openExternal: function (a) { return openExternal(a && a.url); },
    share: function (a) {
      return safe(call('Share', 'share', {
        title: a && a.title, text: a && a.text, url: a && a.url,
        dialogTitle: 'Teilen'
      }), null);
    },
    enablePush: function () { return enablePush(); },
    pushStatus: function () { return Promise.resolve({ token: pushToken }); },
    netStatus: function () { return safe(call('Network', 'getStatus'), { connected: navigator.onLine }); }
  };

  function wireRpc() {
    window.addEventListener('message', function (ev) {
      if (RPC_ORIGINS.indexOf(ev.origin) === -1) return;
      var m = ev.data;
      if (!m || m.type !== 'KRS_NATIVE_RPC' || !m.id) return;
      var fn = RPC[m.method];
      var reply = function (ok, payload) {
        try {
          ev.source.postMessage({
            type: 'KRS_NATIVE_RPC_RESULT', id: m.id, ok: ok,
            value: ok ? payload : undefined,
            error: ok ? undefined : String(payload)
          }, ev.origin);
        } catch (e) {}
      };
      if (!fn) return reply(false, 'unbekannte Methode: ' + m.method);
      Promise.resolve()
        .then(function () { return fn(m.args || {}); })
        .then(function (v) { reply(true, v === undefined ? null : v); },
              function (e) { reply(false, (e && e.message) || e); });
    });

    // Modulen mitteilen, dass sie in der App laufen — sobald sie sich melden.
    window.addEventListener('message', function (ev) {
      if (RPC_ORIGINS.indexOf(ev.origin) === -1) return;
      if (!ev.data || ev.data.type !== 'KRS_NATIVE_HELLO') return;
      try {
        ev.source.postMessage({ type: 'KRS_NATIVE_READY', platform: 'ios', version: VERSION }, ev.origin);
      } catch (e) {}
    });
  }

  // ─────────────────────────────────────────────────────────────
  // 6. App-Zustand: nach dem Zurückkehren aufwecken
  // ─────────────────────────────────────────────────────────────
  function wireAppState() {
    var app = P.App;
    if (!app || !app.addListener) return;
    app.addListener('appStateChange', function (s) {
      if (!s || !s.isActive) return;
      // Supabase-Realtime hängt nach längerem Hintergrund gern. Der bestehende
      // Code in Connect lauscht auf 'online' und 'visibilitychange' — wir
      // stoßen beides an, statt in Connect neue Sonderwege zu bauen.
      try { window.dispatchEvent(new Event('online')); } catch (e) {}
      try { document.dispatchEvent(new Event('visibilitychange')); } catch (e) {}
      window.dispatchEvent(new CustomEvent('krs-native-resume'));
    });
  }

  // ─────────────────────────────────────────────────────────────
  // Start
  //
  // Reihenfolge ist nicht beliebig: restoreSessionSync() MUSS als Erstes und
  // synchron laufen, damit die Session steht, bevor der Hub sie ausliest.
  // Alles Asynchrone kommt danach.
  // ─────────────────────────────────────────────────────────────
  restoreSessionSync();
  mirrorSession();

  applySafeAreas();
  interceptExternalLinks();
  wirePush();
  wireRpc();
  wireAppState();

  // KEINE eigene Sperre beim Start.
  //
  // Der Hub bringt seit 3.x eine eigene Auto-Sperre mit (Inaktivitäts-Timer,
  // `sessionStorage.krs_hub_locked`, Einstellung `krs_hub_autolock`, opt-in pro
  // Gerät). Ein zweiter Sperrbildschirm aus der Brücke wäre ein konkurrierendes
  // UI: zwei Overlays, zwei Zustände, unklar, welches gewinnt.
  //
  // Stattdessen stellt die Brücke `KRSNative.unlock()` und
  // `KRSNative.biometryAvailable()` bereit. Wer den Sperrbildschirm des Hubs
  // pflegt, kann Face ID dort mit einer Zeile anbieten:
  //
  //     if (window.KRSNative?.available) {
  //       const ok = await window.KRSNative.unlock('KRS Schule entsperren');
  //       if (ok) entsperren();
  //     }
  //
  // Bis dahin bleibt Face ID ungenutzt — bewusst, nicht vergessen.
  var ready = Promise.resolve()
    .then(function () {
      // Capacitor LIGHT bedeutet dunkle Statusleisten-Symbole auf hellem Grund.
      safe(call('StatusBar', 'setStyle', { style: 'LIGHT' }), null);
      return true;
    })
    .then(null, function (e) { warn(e); return true; });

  window.KRSNative = {
    version: VERSION,
    available: true,
    platform: 'ios',
    ready: ready,
    haptic: function (style) { return RPC.haptic({ style: style }); },
    openExternal: openExternal,
    share: function (o) { return RPC.share(o || {}); },
    enablePush: enablePush,
    pushStatus: function () { return Promise.resolve({ token: pushToken }); },
    onPushTap: function (fn) { if (typeof fn === 'function') pushTapHandlers.push(fn); },
    unlock: unlock,
    biometryAvailable: biometryAvailable,
    forgetSession: forgetSession,
    hideSplash: function () { return safe(call('SplashScreen', 'hide', { fadeOutDuration: 200 }), null); }
  };

  // Startbild ausblenden, sobald der Hub wirklich steht — nicht nach Stoppuhr.
  // launchAutoHide ist in capacitor.config.ts aus, damit es kein Weiß-Blitzen gibt.
  ready.then(function () {
    var hide = function () { window.KRSNative.hideSplash(); };
    if (document.readyState === 'complete') setTimeout(hide, 300);
    else window.addEventListener('load', function () { setTimeout(hide, 300); });
    // Notbremse: nach 8 s auf jeden Fall weg, sonst hängt die App im Startbild.
    setTimeout(hide, 8000);
  });

  log('bereit, Version ' + VERSION);
})();
