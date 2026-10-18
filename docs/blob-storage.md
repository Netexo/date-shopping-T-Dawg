# Privater Speicher für Order a Date

Die vorhandene Integration verwendet `@vercel/blob` und ausschließlich serverseitig
`BLOB_READ_WRITE_TOKEN`. Der Token bestimmt den Store; der Anzeigename wird nicht
im Code konfiguriert. Für das Vercel-Projekt `t-dawg` muss der Token zum bereits
vorhandenen privaten Store `t-dawg-blob-v2` gehören.

## Vercel-Einstellungen

- Den bestehenden Store `t-dawg-blob-v2` unter Storage mit `t-dawg` verbinden.
- `BLOB_READ_WRITE_TOKEN` für Production sowie gegebenenfalls Preview freigeben.
  Keine Variable mit `NEXT_PUBLIC_` anlegen. Keine Tokens ins Repository schreiben.
- Neue Einstellungen wirken bei einem späteren Deployment. Dieses Dokument und
  die lokale Prüfung veröffentlichen nichts automatisch.

## Speicherweg

`POST /api/friendbook` validiert Standort, optionalen Termin, fünf Steckbrief-Felder
und vier Antworten. Jeder Eintrag erhält eine private JSON-Datei unter
`friendbook/v1/`. Erst die bestätigte Speicherung erzeugt die Erfolgsmeldung.
Eintrags-ID und Wiederholungskennung werden für den Checkout im Browser behalten.

`POST /api/orders` prüft die Freundesbuch-Zuordnung und die Übereinstimmung von
Standort und Termin. Produktpreise werden aus dem serverseitigen Katalog
berechnet. Pro Bestellung entsteht eine private JSON-Datei unter
`date-shopping/orders/v1/`, einschließlich Kategorien, Restaurantvariante,
Einzelpreisen, Guthaben und Freundesbuch-ID.

Beide Speicherwege verwenden feste Dateinamen pro Idempotenzkennung sowie
`allowOverwrite: false`. Es gibt keine gemeinsame veränderliche JSON-Datei.
Wiederholungsversuche verwenden dieselbe Kennung. Bestehende Dateien werden
weder gelöscht noch überschrieben.

Die Übersicht unter `/admin` zeigt Bestellungen und Freundesbuch-Einträge ohne
Anmeldung. Sie lädt die Dateien serverseitig aus dem privaten Blob Store.
Die API-Routen bieten weiterhin nur das Speichern per POST an.

Die dauerhaften Daten liegen im Blob Store, nicht im Dateisystem einer Function.
Neue Serverinstanzen lesen denselben Store erneut. Bei einem Store-Wechsel
werden Dateien aus dem alten Store nicht automatisch migriert oder gelöscht.

## Prüfung und Grenzen

Die Tests simulieren die privaten SDK-Aufrufe und prüfen Speicherung, Fehler,
parallele Wiederholungen, Zuordnung, Preise und neue Serverinstanzen.
Ein Test gegen den echten Store erfordert dessen serverseitigen Token. Ohne
lokal verfügbaren Token ist kein echter Lese-/Schreibtest durchgeführt.

Lokal: `node --test tests/*.test.mjs` und `npm run build -- --webpack`.
Webpack wird genutzt, weil der Turbopack-Build in dieser lokalen Umgebung bei
früheren Prüfungen ohne Fortschritt stehen blieb; das Build-Script bleibt erhalten.
