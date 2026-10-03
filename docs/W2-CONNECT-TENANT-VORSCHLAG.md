# Connect: vorgesehene Flag-Konfiguration

Der bestehende Connect-Tenant enthält reserviert `features: {}`. Für spätere Integration ausschließlich ersetzen durch:

```js
features: { unterricht: false, hausaufgaben: false, bbb: false }
```

In dieser Session keine Connect-Datei geändert: Dort liegt der uncommittete M1a-Stand. Keine neuen Connect-Funktionen; serverseitige Features/RPCs sind die Autorisierung. Änderungen erst mit dem bestehenden Produkt-/Tenant-Bau zusammenführen, damit kein zweiter konkurrierender Bau entsteht.
