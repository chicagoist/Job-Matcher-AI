---
description: >
  Job Matcher AI — Firefox MV3 extension that analyzes job postings and
  generates cover letters via Gemini AI. Use ONLY when the task involves this
  specific extension project.
mode: subagent
model: anthropic/claude-sonnet-4-6
permission:
  edit: allow
  bash: allow
  read: allow
---

# Job Matcher AI — Project Context

## Architecture (final)

```
Firefox toolbar icon
  ↓ chrome.action.onClicked
chrome.windows.create({url: 'popup.html', type: 'popup'})
  → echtes Browser-Fenster (NIEMALS default_popup)
  → bleibt offen bei Datei-Dialog / Focus-Verlust
  → schließt nur via manuellem Klick
  ↓
Popup-Fenster: API-Key, Lebenslauf (PDF), Stelle prüfen, Ergebnis
  ↓ chrome.runtime.sendMessage({action: "ANALYZE_JOB", tabId})
Background Service Worker
  ↓ chrome.scripting.executeScript (activeTab)
Job-Text extrahieren → Gemini API → Ergebnis → storage.history
```

## Session Bug-Fix History (don't repeat these mistakes)

| Bug | Root Cause | Fix |
|-----|-----------|-----|
| Injected panel not showing | content-script + Shadow DOM fails in FF MV3 | Switch to popup architecture |
| `default_popup` closes on file picker | Firefox closes popups on focus loss | Remove `default_popup`, use `chrome.windows.create` |
| CV filename not displayed | Upload handler incomplete | Fixed `updateCvStatus()` with date display |
| "Einstellungen" crashes | `chrome.runtime.openOptionsPage()` needs `options_ui` | Added `options_ui` to manifest |
| "Kein aktiver Tab verfügbar" | `sender.tab?.id` is undefined from popup | Pass `tabId` in message payload |
| Popup closes during PDF upload | Firefox action popup focus loss | Real window via `chrome.windows.create` |
| TypeScript errors | TS type complexity with extension APIs | Rewrote everything in plain JS |
| Ubuntu font not loading | Bundled woff2 fonts | Switched to system-ui font stack |
| Icon not showing in toolbar | Generated PNG missing zlib header | Use user's own `icon.png` (14410 bytes) |
| `responseMimeType` JSON error | Model doesn't support `responseSchema` | Keep schema but handle non-JSON gracefully |

## Key Requirements

- **Plain JavaScript** (NO TypeScript — all files are `.js`)
- **Firefox MV3 only** (Gecko `>= 128.0`, tested on FF 151 beta portable)
- **Popup is a real window** (`chrome.windows.create`), NOT `action.default_popup`
- **Popup closes only manually** — never auto-close on focus loss or file dialog
- **Colors**: Ubuntu purple `#772953` (primary), orange `#E95420` (accent)
- **Font**: system-ui stack (`-apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, sans-serif`)
- **UI language**: German (all strings hardcoded, no `chrome.i18n`)
- **File upload**: `<input type="file">` directly in popup (works because real window)
- **CV storage**: base64 data URL in `chrome.storage.local`
- **Job extraction**: `chrome.scripting.executeScript` with DOM selectors (priority list)
- **Gemini API**: `responseMimeType: "application/json"` with `responseSchema`
- **Host permissions**: ONLY `https://generativelanguage.googleapis.com/*`
- **Permissions**: `activeTab`, `scripting`, `storage`
- **Portable Firefox path**: `C:\Users\ValeriiDundukov\AppData\Local\FirefoxPortable\FirefoxPortableDeveloper\App\Firefox64\firefox.exe`

## File Structure

```
src/
├── manifest.json          # MV3 manifest, NO default_popup
├── background/
│   ├── service-worker.js  # onClicked → window.create + message router
│   └── lib/
│       ├── cover-letter.js   # Analysis orchestration
│       ├── gemini-client.js  # Gemini API caller with retry
│       ├── prompts.js        # System prompt + responseSchema
│       ├── result-parser.js  # JSON response → AnalysisResult
│       ├── job-extractor.js  # DOM extraction logic
│       └── errors.js         # Error classes
├── popup/
│   ├── popup.html  # Main UI (opened via chrome.windows.create)
│   ├── popup.js    # UI logic: setup, upload, analyze, display
│   └── popup.css   # Purple + orange theme
├── options/
│   ├── options.html  # Settings page
│   ├── options.js    # Model, threshold, history, CV management
│   └── options.css   # Settings theme
└── shared/
    ├── constants.js         # STORAGE_KEYS, DEFAULTS, TIMEOUTS
    ├── storage.js           # chrome.storage.local wrapper
    ├── message-contracts.js # Message validation helper
    └── utils.js             # formatBytes, dataUrlToBase64, detectMime, cryptoRandomId
```

## Common Commands

```powershell
npm run build
npx web-ext run --source-dir=dist --firefox="C:\Users\ValeriiDundukov\AppData\Local\FirefoxPortable\FirefoxPortableDeveloper\App\Firefox64\firefox.exe"
npx web-ext lint --source-dir=dist
```

## Build Pipeline

1. `esbuild.config.mjs` bundles 3 entry points as IIFE:
   - `src/background/service-worker.js` → `dist/background.js`
   - `src/popup/popup.js` → `dist/popup.js`
   - `src/options/options.js` → `dist/options.js`
2. Static files copied: `manifest.json`, `icon.png`, `*.html`, `*.css`
3. Target: `firefox128`
4. Minify disabled in watch mode
