# Job Matcher AI - Agents & Components Guide

This document describes the role of each component ("agent" or "actor") within the **Job Matcher AI** browser extension and how they communicate.

---

## 1. Actor Directory & Roles

### 1.1 The Background Agent (`service-worker.js`)
* **Role**: The central coordinator and brain of the extension. It runs in the background as an ephemeral service worker (Manifest V3).
* **Responsibilities**:
  - Handles the `chrome.action.onClicked` listener to launch or focus the popup window.
  - Monitors window focus changes (`chrome.windows.onFocusChanged`) to track the last-focused normal browser window (`lastNormalWindowId`).
  - Listens to incoming runtime messages (`chrome.runtime.onMessage`) from the Popup and Options UI.
  - Controls text extraction by injecting content scripts into active web tabs.
  - Directly interfaces with the Google Gemini API.

### 1.2 The UI Agent (`popup.js`)
* **Role**: The primary user interface. It runs in a standalone popup window context (`popup.html`).
* **Responsibilities**:
  - Displays match scores, matched/missing skill lists, and the generated cover letter.
  - Triggers the job analysis process by sending `ANALYZE_JOB` messages.
  - Handles local CV uploading and parsing from PDF files.
  - Keeps itself nested within the main browser window bounds using a coordinates polling interval (`startWindowConstrainer`).

### 1.3 The Configuration Agent (`options.js`)
* **Role**: Handles extension settings. It runs in a dedicated options tab (`options.html`).
* **Responsibilities**:
  - Saves/clears the Gemini API key in local storage.
  - Sets the match threshold (default 7/10) and model selection.
  - Renders the historical logs of previous evaluations.

### 1.4 The Extraction Agent (Injected Content Script)
* **Role**: Runs transiently inside the context of the target web page.
* **Responsibilities**:
  - Injected on-the-fly via `chrome.scripting.executeScript`.
  - Walks the target DOM structure, removes page noise (scripts, styles, footer elements), and retrieves clean textual content using `textContent`.

---

## 2. Message Routing & Communication Flow

```
+------------+                  +------------------+                  +-------------------+
|  popup.js  | --(ANALYZE_JOB)-> | service-worker.js| --(Injects)----> | Injected Script   |
|            | <--(ok / error)-- |                  | <--(HTML/Text)-- | (Web Page DOM)    |
+------------+                  +------------------+                  +-------------------+
                                         |
                                (Calls Gemini API)
                                         |
                                         v
                                +------------------+
                                | Google Gemini API|
                                +------------------+
```

1. **`ANALYZE_JOB`**: Sent by `popup.js` to trigger matching.
   - *Payload*: `{ action: "ANALYZE_JOB" }`
   - *Response*: `{ ok: true, result, model, threshold }` or `{ error: string }`
2. **`GET_LAST_NORMAL_WINDOW_ID`**: Used historically or internally to synchronize active windows.
   - *Payload*: `{ action: "GET_LAST_NORMAL_WINDOW_ID" }`
   - *Response*: `{ lastNormalWindowId }`
3. **`AUDIO_SOLVE`**: Sent by `popup.js` when asking a voice question.
   - *Payload*: `{ action: "AUDIO_SOLVE", audioDataUrl, mimeType }`
   - *Response*: `{ ok: true, text, model }`
