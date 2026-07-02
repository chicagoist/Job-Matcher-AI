# Job Matcher AI — Agent Instructions

## 🚫 CRITICAL: Never modify working code

**DO NOT change, refactor, or rewrite any code that is currently working.** Only make changes if:
- The user explicitly reports a bug and asks you to fix it
- The user explicitly asks for a new feature or change

If you are unsure whether code is working, ASK before changing.

## Firefox Extension (TypeScript)

Source in `src/` — Manifest V3, esbuild bundler.

| Command | Purpose |
|---|---|
| `npm install` | Install JS deps |
| `npm run build` | esbuild → `dist/` |
| `npm test` | Vitest (47 unit tests) |
| `npm run lint:ext` | web-ext linter on `dist/` |
| `npm run package` | Build → ZIP in `web-ext-artifacts/` |

## Known quirks

- **One pre-existing TS test failure**: `fetchJobData > fetches StepStone job via JSON-LD` expects `85,000` but gets `85.000 EUR YEAR` (locale format)
- **No CI/CD** — no `.github/`, no Makefile, no pre-commit hooks
- **Cloud fallback**: Extension uses Ollama by default, falls back to Gemini if `allowCloudFallback` is enabled and Ollama fails
- **`activeTab` in Firefox**: `chrome.tabs.get(tabId)` can fail when called from `runtime.onMessage` if the popup was opened via `chrome.windows.create`. Always keep a fallback to `chrome.tabs.query`

## Security

- **No `innerHTML`/`outerHTML`** — Firefox AMO linter flags it as `UNSAFE_VAR_ASSIGNMENT`
- All user data in `chrome.storage.local`
- Gemini API key is user-provided, stored locally
