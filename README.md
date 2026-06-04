# Job Matcher

Firefox-Erweiterung, die Stellenanzeigen analysiert und automatisch ein passendes Anschreiben erzeugt, sobald die Übereinstimmung mit dem hinterlegten Lebenslauf einen konfigurierbaren Schwellwert (Standard 8/10) erreicht.

Die Analyse und Texterstellung erfolgt über die Gemini API von Google. Das Add-on läuft komplett im Browser, ist auf Deutsch lokalisiert und folgt der Ubuntu-Designsprache (Farbpalette und Schriftart).

## Funktionen

- **Stelle prüfen**: extrahiert den Text der aktuellen Seite, vergleicht ihn mit dem hinterlegten Lebenslauf und erzeugt eine Bewertung (1–10) sowie – bei ausreichender Übereinstimmung – ein Anschreiben.
- **Sprachfrage**: stellt eine freie Frage per Mikrofon, Gemini antwortet auf Deutsch.
- **Lebenslauf**: PDF-Datei wird lokal im Browser gespeichert (Data-URL, max. 5 MB). Größenwarnung bei Überschreitung.
- **Einstellungen**: API-Schlüssel, Modell (`gemini-2.5-flash` Standard, `gemini-2.5-pro`, `gemini-2.0-flash`), Schwellwert (1–10), Verlauf.
- **Drag & Drop**: das Panel lässt sich per Header verschieben, die Position wird gespeichert.
- **Tastenkürzel**: `Alt+J` schaltet das Panel ein/aus.
- **Sprachausgabe**: das Anschreiben wird in der Sprache der Original-Stellenanzeige verfasst (DE, EN, etc.).
- **Verlauf**: die letzten 20 Analysen werden lokal gespeichert und sind in den Einstellungen einsehbar.

## Datenschutz

Alle Daten – API-Schlüssel, Lebenslauf (PDF), Verlauf, Panel-Position – werden ausschließlich in `chrome.storage.local` des Browsers gespeichert. Es gibt keinen Server des Anbieters, keinen Tracker, keine Telemetrie.

Einzige ausgehende Verbindung: Anfrage an `https://generativelanguage.googleapis.com/…` (Gemini). Weitere Informationen in `PRIVACY.md`.

## Installation (Entwickler)

Voraussetzungen: Node.js 18+ und npm.

```bash
npm install
npm run typecheck
npm test
npm run build
```

Das gebaute Add-on liegt in `dist/`. Zum Verpacken als signierfähiges ZIP:

```bash
npx web-ext build --source-dir=dist --artifacts-dir=web-ext-artifacts --overwrite-dest
```

## Lokale Installation (unsigniert)

1. `about:debugging#/runtime/this-firefox` in Firefox öffnen.
2. „Temporäres Add-on laden…" → `dist/manifest.json` auswählen.

## Veröffentlichung bei AMO

1. Auf <https://addons.mozilla.org/de/developers/> einloggen.
2. Add-on über „Neue Version einreichen" hochladen.
3. Quell-Tarball mit `web-ext build --source-dir=src` separat hochladen (für manche Lizenzen Pflicht).

Signatur über die AMO-API ist optional:

```bash
AMO_JWT_ISSUER=…  AMO_JWT_SECRET=…  npx web-ext sign --source-dir=dist --artifacts-dir=web-ext-artifacts
```

## Entwicklung

- `npm run build:watch` – esbuild im Watch-Modus
- `npm run lint` – ESLint
- `npm run format` – Prettier
- `npm test` – Vitest

## Lizenz

MIT. Die Ubuntu-Schriftart ist unter der SIL Open Font License lizenziert (siehe `src/assets/fonts/`).
