# Change Database

## Protocol

1. **Before ANY change** — search this file for the code location. If marked `WORKING`, do NOT modify without consequence research.
2. **Before ANY change** — commit current state first.
3. **After EVERY change** — add an entry describing what changed, why, and whether the modified code was previously marked as working.
4. **Consequence research** — if touching a `WORKING` location, document what other code depends on it, what could break, and how you verified safety.

---

## Entry Template

```
## YYYY-MM-DD HH:MM — <commit hash or message>

### File: `path/to/file.ts:line`
- **Status before**: WORKING / NEW / BROKEN / UNKNOWN
- **Change**: <what was done>
- **Reason**: <why it was necessary>
- **Consequences considered**: <what was checked>
- **Status after**: WORKING / TEST PENDING / BROKEN
```

---

## Entries

## 2026-07-02 13:44 — 293569a chore: safeSendResponse, popup timeout handling, remove non-working Gemini models, restore tabs.query fallback

### File: `src/background/service-worker.ts:72-83`
- **Status before**: BROKEN (findActiveWebTab returned popup tab when popup focused)
- **Change**: Added lastNormalWindowId lookup before fallback to tabs.query({active:true})
- **Reason**: Popup window is focused when user clicks "Analyze", so tabs.query returned popup tab instead of job page tab
- **Consequences considered**: If lastNormalWindowId is stale, falls through to original behavior
- **Status after**: WORKING

### File: `src/background/service-worker.ts:96-107`
- **Status before**: BROKEN (sendResponse threw unhandled rejection when port closed)
- **Change**: Wrapped sendResponse in safeSendResponse try-catch
- **Reason**: Firefox closes message port after ~30s for runtime.onMessage async responses; if Ollama takes longer, sendResponse throws
- **Consequences considered**: SafeSendResponse silently swallows closed-port errors; popup handles timeout separately
- **Status after**: WORKING

### File: `src/popup/popup.ts:114-148`
- **Status before**: BROKEN (showed raw "Receiving end does not exist" on Ollama timeout)
- **Change**: Added check for "Receiving end does not exist" → friendly message + extracted renderResult()
- **Reason**: Raw Firefox error is confusing; show actionable message telling user to retry
- **Consequences considered**: Friendly message only for this specific error; all other errors unchanged
- **Status after**: WORKING

### File: `src/options/options.html:72-75`
- **Status before**: BROKEN (gemini-2.5-flash and gemini-3.5-flash return invalid JSON; gemini-3.1-flash-lite returns null)
- **Change**: Removed gemini-2.5-flash, gemini-3.1-flash-lite, gemini-3.5-flash from dropdown
- **Reason**: These models don't return valid JSON for the analysis prompt
- **Consequences considered**: User can still use gemini-2.5-flash-lite and gemma-4-26b-a4b-it; if Google releases fixed versions, we can add them back
- **Status after**: WORKING

### File: `src/background/lib/cover-letter.ts:203-216`
- **Status before**: BROKEN (chrome.tabs.get(tabId) fails in Firefox runtime.onMessage due to activeTab limitation)
- **Change**: Restored fallback to chrome.tabs.query({active:true, currentWindow:true}) when chrome.tabs.get fails
- **Reason**: Firefox's activeTab permission may not cover chrome.tabs.get from background message listener; previous code had this fallback
- **Consequences considered**: If both fail, shows "Keine aktive Job-Seite gefunden" — same as before
- **Status after**: WORKING

## 2026-07-02 — Architecture Separation (Strategy Pattern)

### File: `src/background/lib/analysis-provider.ts` (NEW)
- **Status before**: NEW
- **Change**: Created AnalysisProvider interface with analyze(job, threshold) method + JobText / AnalysisResponse types
- **Reason**: Standard interface so cover-letter.ts dispatches to either provider without knowing internals
- **Status after**: WORKING

### File: `src/background/lib/providers/ollama-provider.ts` (NEW)
- **Status before**: NEW
- **Change**: Extracted Ollama analysis path — own CV extraction via pdf-utils, callOllama, fallback-to-Gemini logic, AnalysisResponse with usedFallback
- **Reason**: Encapsulate all Ollama-specific handling in one class; Gemini code paths never see Ollama errors
- **Status after**: WORKING

### File: `src/background/lib/providers/gemini-provider.ts` (NEW)
- **Status before**: NEW
- **Change**: Extracted Gemini analysis path — own CV handling as inline_data, callGemini, no fallback logic
- **Reason**: Encapsulate all Gemini-specific handling in one class
- **Status after**: WORKING

### File: `src/background/lib/cover-letter.ts`
- **Status before**: WORKING
- **Change**: Refactored analyzeJob() as thin dispatcher — reads provider, instantiates OllamaProvider or GeminiProvider, delegates analyze() call, parses result, stores history. solveAudio() checks provider === "gemini", throws BadRequestError otherwise
- **Reason**: Remove coupled if/else branching; prepare for future providers; make code testable via interface
- **Consequences considered**: All public API (return types, error messages) preserved; solveAudio now throws BadRequestError instead of letting Gemini's MissingApiKeyError propagate if user tries audio with Ollama
- **Status after**: WORKING

### File: `src/shared/constants.ts`, `src/shared/storage.ts`
- **Status before**: WORKING
- **Change**: Split single model storage into ollamaModel/geminiModel with separate keys + DEFAULTS. getModel()/setModel() remain as provider-aware proxies. getOllamaModel()/setOllamaModel()/getGeminiModel()/setGeminiModel() added. Auto-migration from old "model" key via fallback chain
- **Reason**: Provider switch should not lose the other provider's model preference; each provider keeps its own last-used model
- **Consequences considered**: Old "model" key remains as migration source; getModel() behavior unchanged (returns current provider's model); setModel() writes to correct sub-key
- **Status after**: WORKING

### File: `src/options/options.ts`
- **Status before**: WORKING
- **Change**: Replaced getModel()/setModel() with getOllamaModel()/setOllamaModel()/getGeminiModel()/setGeminiModel(). Provider switch now sets DEFAULTS.ollamaModel or DEFAULTS.geminiModel into their respective storage keys
- **Reason**: Options page must preserve each provider's model independently
- **Consequences considered**: No functional change for user — model selectors work identically
- **Status after**: WORKING
