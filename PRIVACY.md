# Datenschutzerklärung

Job Matcher AI besteht aus zwei unabhängigen Anwendungen: der **Firefox-Erweiterung** (TypeScript) und dem **Python CLI** (Python). Beide verarbeiten personenbezogene Daten ausschließlich lokal und DSGVO-konform. Es findet kein Tracking, keine Profilbildung und keine Weitergabe an Dritte durch den Anbieter statt.

---

## 1. Firefox-Erweiterung

### Welche Daten werden erhoben?

- **Gemini-API-Schlüssel** (von Nutzerinnen und Nutzern selbst eingegeben)
- **Lebenslauf** (PDF-Datei, freiwillig hochgeladen)
- **Stellenanzeigen-Text** (aus dem aktiven Tab gelesen)
- **Sprachaufnahmen** (nur während aktiver Aufnahme, werden direkt an die Gemini-API gesendet und nicht dauerhaft gespeichert)
- **Analyseergebnisse und Verlauf** (Bewertung, Begründung, Anschreiben, Modellname, Zeitstempel)

Alle diese Daten werden ausschließlich in `chrome.storage.local` des Browsers gespeichert. Sie verlassen den Browser nur, wenn Sie eine Aktion auslösen, die Gemini benötigt.

### Wohin werden Daten gesendet?

Bei aktiver Nutzung (Stelle prüfen, Sprachfrage) wird eine Anfrage an `https://generativelanguage.googleapis.com/` gesendet. Inhalt der Anfrage:

- Bei „Stelle prüfen": der extrahierte Text der aktuellen Seite, der hinterlegte Lebenslauf (als Base64-PDF), System- und Nutzer-Prompts.
- Bei „Sprachfrage": die aufgenommene Audiodatei.

Es werden **keine** Daten an andere Server gesendet. Es gibt **keine** Telemetrie, **keine** Nutzungsstatistik, **keine** Fehlerberichte durch den Anbieter.

---

## 2. Python CLI

### Welche Daten werden verarbeitet?

- **Lebenslauf-Text** (freiwillig als Kommandozeilen-Argument übergeben)
- **Stellenanzeigen** (über offizielle Job-APIs abgerufen)
- **Analyseergebnisse und Entwürfe** (Bewertung, Anschreiben, Zeitstempel)
- **Consent-Einwilligungen** (DSGVO-konformes Opt-In)
- **Audit-Log** (vollständige Aufzeichnung aller Datenverarbeitungsvorgänge)

### Wohin werden Daten gesendet?

- **Ollama (lokales LLM)**: Läuft standardmäßig auf `http://localhost:11434`. Ihre Daten verlassen **niemals** Ihren Rechner.
- **Adzuna-API**: Bei der Jobsuche wird eine Anfrage an `https://api.adzuna.com/` gesendet. Es werden nur die Suchparameter (Keywords, Ort) übermittelt – **keine** personenbezogenen Daten.
- **Indeed Partner API**: Analog zu Adzuna – nur Suchparameter, keine Personenbezüge.

Es werden **keine** Daten an andere Server gesendet. Es gibt **keine** Telemetrie, **keine** Nutzungsstatistik, **keine** Fehlerberichte durch den Anbieter.

### Besonderheiten

- **Draft-Only-Modus**: Alle generierten Anschreiben sind **ausschließlich Entwürfe**. Es erfolgt kein automatischer Versand. Jeder Draft ist als `requires_manual_review = True` markiert.
- **Kein Web Scraping**: Das Python CLI verwendet ausschließlich offizielle API-Schnittstellen (Adzuna, Indeed). Es werden keine Daten von Job-Plattformen gescrapt.

---

## 3. Gemeinsame Bestimmungen

### Wer hat Zugriff?

- Sie selbst (über den Browser und/oder das Terminal).
- Google (über die Gemini-API der Firefox-Erweiterung, unterliegt den Nutzungsbedingungen und der Datenschutzerklärung von Google).
- Adzuna/Indeed (über die API-Abfragen des Python CLI, nur Suchparameter).
- Kein anderer Empfänger.

### Aufbewahrung und Löschung

**Firefox-Erweiterung:**
- Der API-Schlüssel kann in den Einstellungen jederzeit entfernt werden.
- Der Lebenslauf kann in den Einstellungen jederzeit gelöscht werden.
- Der Verlauf kann in den Einstellungen jederzeit geleert werden.
- Beim Deinstallieren der Erweiterung werden alle gespeicherten Daten aus dem Browser gelöscht.

**Python CLI:**
- Die SQLite-Datenbank (`~/.job-matcher/data.db`) kann jederzeit gelöscht werden.
- Consent kann jederzeit über `job-matcher consent revoke` widerrufen werden.
- Das Audit-Log kann über die CLI eingesehen werden.

### Rechtsgrundlage

Die Verarbeitung erfolgt auf Grundlage von Art. 6 Abs. 1 lit. a DSGVO (Einwilligung) – Sie entscheiden jederzeit selbst, welche Daten Sie hinterlegen und welche Aktionen Sie auslösen. Das Python CLI bietet zusätzlich ein explizites Consent-Management mit vollständigem Audit-Trail gemäß Art. 30 DSGVO.

### Kontakt

Bei Fragen zum Datenschutz wenden Sie sich an die im Add-on-Profil hinterlegte Kontaktadresse auf addons.mozilla.org.
