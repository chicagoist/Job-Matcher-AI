# Änderungsverlauf

Alle wesentlichen Änderungen an diesem Projekt werden in dieser Datei festgehalten.

Das Format orientiert sich an [Keep a Changelog](https://keepachangelog.com/de/1.1.0/),
dieses Projekt folgt der [Semantic Versioning](https://semver.org/lang/de/)-Spezifikation.

## [1.0.0] – 2026-06-03

### Hinzugefügt
- Komplettes Refactoring: TypeScript, esbuild, native JS-Ausgabe.
- Modulare Architektur: `shared/`, `background/`, `content/`, `options/`.
- Gemini-Client mit Retry, Exponential-Backoff, Timeout und strukturiertem JSON-Schema.
- Strukturierte Antworten (Bewertung, Begründung, Anschreiben, Sprache, passende und fehlende Fähigkeiten).
- Deutsche Oberfläche mit `chrome.i18n` und `_locales/de/messages.json`.
- Eigene Options-Seite (API-Schlüssel, Modell, Schwellwert, CV-Verwaltung, Verlauf).
- Lokales Speichern von API-Schlüssel, Lebenslauf, Verlauf, Schwellwert, Modell, Panel-Position.
- Drag-&-Drop-Panel mit persistierter Position.
- XSS-sichere Ausgabe (ausschließlich `textContent` und `replaceChildren`).
- Tastenkürzel `Alt+J` zum Umschalten des Panels.
- Größenwarnung beim Upload großer PDFs (> 5 MB).
- Bestätigungsdialog bei großen Lebensläufen.
- Hosting-Heuristik für StepStone, Indeed, XING, LinkedIn, Arbeitsagentur, HeyJobs, Jobvector, Stellenanzeigen, Kimeta, Monster, Jobware.
- Fallback auf semantische Selektoren (`<main>`, `<article>`, `[role=main]`, gängige Klassen/IDs).
- Inhaltliche Sicherheitsrichtlinie (CSP) im Manifest.
- AMO-konformes `data_collection_permissions`-Feld.
- Ubuntu-Farbpalette und gebündelte Ubuntu-Schrift (OFL) im Add-on.
- Auto Dark Mode via `prefers-color-scheme`.
- ARIA-Rollen, Tastatur-Navigation, `prefers-reduced-motion`-Respekt.
- Vitest-Testgerüst (Parser, Gemini-Client, Message-Contracts).
- ESLint, Prettier, TypeScript-Strict.
- Build-Skript für signierfähige ZIP-Datei.
- `web-ext lint` läuft fehlerfrei (0 Fehler, 0 Warnungen, 0 Hinweise).
- `README.md` und `PRIVACY.md` auf Deutsch.

### Geändert
- Anzeige der Anschreiben-Ausgabe als editierbares Textfeld mit „In die Zwischenablage kopieren"-Button.
- Fehlertypen als `JobMatcherError`-Hierarchie mit getypten Subklassen.

### Sicherheit
- Kein `innerHTML` mehr mit dynamischen Werten.
- Keine externen Schriftarten oder Skripte (CSP).
- API-Schlüssel nur in `chrome.storage.local`.

### Entfernt
- Inline-Styles im Content-Skript.
- Hartkodierte russische UI-Strings.
