# Job Matcher AI - Development Rules & Code Guidelines

Any agent or developer contributing to this repository MUST strictly follow these rules to maintain security, privacy, and compatibility with the Firefox extension ecosystem.

---

## Rule 1: No Unsafe DOM Assignments (Strictly No `innerHTML`)
Mozilla's static analysis engine strictly flags usages of `innerHTML` or `outerHTML` as `UNSAFE_VAR_ASSIGNMENT`.
*   **Rule**: NEVER write to `innerHTML` or `outerHTML`.
*   **Alternative**: Use secure DOM creation methods:
    - Clear children: `el.replaceChildren()`
    - Create tags: `const div = document.createElement("div")`
    - Safe text setting: `div.textContent = "Safe Text"`
    - Raw text nodes: `div.appendChild(document.createTextNode("Some text"))`

---

## Rule 2: Keep Extension Settings Local & Private
*   **Rule**: Do not add outbound telemetry, tracking pixels, third-party logging libraries, or developer servers.
*   **Storage**: All user-sensitive data (Gemini API keys, uploaded resume PDFs, and historical evaluation entries) must be stored locally in `chrome.storage.local`.
*   **Host Permissions**: Only access the active tab and the official Google Gemini API domain (`https://generativelanguage.googleapis.com/*`). Do not add unsolicited hosts to `host_permissions` in `manifest.json`.

---

## Rule 3: Graceful Truncation Handling (Robust Parsing)
*   **Rule**: Never assume the Gemini API returns clean, complete JSON. If the model hits safety triggers or output token limits, the response will be truncated.
*   **Action**: All JSON parsing must pass through the `extractJson()` wrapper in `result-parser.js`.
*   **Fallback**: If a response is truncated, the parser should attempt to repair it using `repairTruncatedJson()`. If fields are missing after repair, supply defaults (e.g. score of `1`, default description, and empty array listings) rather than throwing errors.

---

## Rule 4: Tab Resolution and Messaging Safety
*   **Rule**: Never run scripts on `sender.tab.id` without validating the sender's origin.
*   **Background**: Internal extension pages (like popup windows or option panels) have their own tab IDs in Firefox/Chrome. Executing scripts on these tab IDs will crash or inject script into the extension page context.
*   **Validation**: Check `sender.url` using the prefix `chrome.runtime.getURL("")`. If it originates from our extension, fallback to tracking the last-focused normal browser window tab.

---

## Rule 5: Keep the Popup Window Constrained
*   **Rule**: The popup window must not be allowed to float off-screen or outside the parent browser boundaries.
*   **Action**: Maintain the window position constrainer polling interval inside `popup.js`. If the user moves the popup outside the borders of the last focused normal window, reposition it to snap back inside the viewport boundaries.
*   **DPI/Scale Safety**: Always check that window bounds (left, top, width, height) are valid numbers before performing mathematical constraints, and round values using `Math.round()` when passing them to `chrome.windows.update`.
