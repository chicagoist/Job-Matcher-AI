# Datenschutzerklärung

Diese Erweiterung verarbeitet personenbezogene Daten ausschließlich lokal im Browser des Nutzers. Es findet kein Tracking, keine Profilbildung und keine Weitergabe an Dritte durch den Anbieter der Erweiterung statt.

## Welche Daten werden erhoben?

- **Gemini-API-Schlüssel** (von Nutzerinnen und Nutzern selbst eingegeben)
- **Lebenslauf** (PDF-Datei, freiwillig hochgeladen)
- **Stellenanzeigen-Text** (aus dem aktiven Tab gelesen)
- **Sprachaufnahmen** (nur während aktiver Aufnahme, werden direkt an die Gemini-API gesendet und nicht dauerhaft gespeichert)
- **Analyseergebnisse und Verlauf** (Bewertung, Begründung, Anschreiben, Modellname, Zeitstempel)

Alle diese Daten werden ausschließlich in `chrome.storage.local` des Browsers gespeichert. Sie verlassen den Browser nur, wenn Sie eine Aktion auslösen, die Gemini benötigt.

## Wohin werden Daten gesendet?

Bei aktiver Nutzung (Stelle prüfen, Sprachfrage) wird eine Anfrage an `https://generativelanguage.googleapis.com/` gesendet. Inhalt der Anfrage:

- Bei „Stelle prüfen": der extrahierte Text der aktuellen Seite, der hinterlegte Lebenslauf (als Base64-PDF), System- und Nutzer-Prompts.
- Bei „Sprachfrage": die aufgenommene Audiodatei.

Es werden **keine** Daten an andere Server gesendet. Es gibt **keine** Telemetrie, **keine** Nutzungsstatistik, **keine** Fehlerberichte durch den Anbieter.

## Wer hat Zugriff?

- Sie selbst (über den Browser und die Erweiterung).
- Google (über die Gemini-API, unterliegt den Nutzungsbedingungen und der Datenschutzerklärung von Google).
- Kein anderer Empfänger.

## Aufbewahrung und Löschung

- Der API-Schlüssel kann in den Einstellungen jederzeit entfernt werden.
- Der Lebenslauf kann in den Einstellungen jederzeit gelöscht werden.
- Der Verlauf kann in den Einstellungen jederzeit geleert werden.
- Beim Deinstallieren der Erweiterung werden alle gespeicherten Daten aus dem Browser gelöscht.

## Rechtsgrundlage

Die Verarbeitung erfolgt auf Grundlage von Art. 6 Abs. 1 lit. a DSGVO (Einwilligung) – Sie entscheiden jederzeit selbst, welche Daten Sie hinterlegen und welche Aktionen Sie auslösen.

## Kontakt

Bei Fragen zum Datenschutz wenden Sie sich an die im Add-on-Profil hinterlegte Kontaktadresse auf addons.mozilla.org.
