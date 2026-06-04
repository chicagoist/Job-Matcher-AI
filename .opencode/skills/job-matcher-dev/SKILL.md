---
name: job-matcher-dev
description: >
  Development workflow for the Job Matcher AI Firefox extension. Includes
  build, test, debug, and release commands. Use when the task involves
  building, running, or debugging the extension.
---

# Job Matcher AI — Development Workflow

## Quick Start

```powershell
# Build the extension
npm run build

# Run with Firefox portable (opens browser window)
npx web-ext run --source-dir=dist --firefox="C:\Users\ValeriiDundukov\AppData\Local\FirefoxPortable\FirefoxPortableDeveloper\App\Firefox64\firefox.exe"

# Lint
npx web-ext lint --source-dir=dist
```

## Debug Mode

Add `--devtools` or `--verbose` to `web-ext run` to see console output:

```powershell
npx web-ext run --source-dir=dist --devtools --firefox="..."
```

This opens the Browser Toolbox (Ctrl+Shift+J) for the extension.

## Watch Mode (auto-rebuild on changes)

```powershell
npm run build:watch
```

Then in another terminal:
```powershell
npx web-ext run --source-dir=dist --firefox="..."
```

The extension auto-reloads when `dist/` files change.

## Build for Release

```powershell
npm run build
npx web-ext build --source-dir=dist --artifacts-dir=web-ext-artifacts --overwrite-dest
```

Produces a `.zip` in `web-ext-artifacts/` for AMO upload.

## Architecture Rules (do not violate)

1. **NEVER use `action.default_popup`** — use `chrome.action.onClicked` + `chrome.windows.create`
2. **NEVER use TypeScript** — all source is plain `.js`
3. **NEVER bundle fonts** — use system-ui stack
4. **NEVER use `chrome.i18n`** — hardcode German strings
5. **NEVER add `<all_urls>`** — only `generativelanguage.googleapis.com`
6. **File input MUST be in the real window** — not in a separate upload page
7. **Popup MUST close only manually** — no auto-close on focus loss
8. **Colors MUST be Ubuntu purple (#772953) + orange (#E95420)**

## Common Issues

| Symptom | Fix |
|---------|-----|
| Popup closes on file picker | Wrong architecture: using `default_popup` instead of `chrome.windows.create` |
| CV not showing after upload | Check `chrome.storage.local` keys: `cvData`, `cvFileName`, `cvUploadedAt` |
| "Kein aktiver Tab" | Missing `tabId` in message payload; popup must call `chrome.tabs.query` first |
| "Einstellungen" crashes | Missing `options_ui` in `manifest.json` |
| Icon not showing | PNG must have zlib header (`deflateSync`, not `deflateRawSync`) |
| Gemini returns non-JSON | `responseSchema` not supported by model; check model compatibility |
