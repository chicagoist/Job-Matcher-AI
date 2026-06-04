import { isAppMessage } from "../shared/message-contracts.js";
import { analyzeJob, solveAudio } from "./lib/cover-letter.js";
import { JobMatcherError, MissingApiKeyError, MissingCvError } from "./lib/errors.js";
// Remember the tab the user was viewing when they clicked the extension icon.
let lastActiveTabId = null;
// Track the last focused normal browser window ID.
let lastNormalWindowId = null;

// Initialize lastNormalWindowId by finding the currently focused or any normal window.
chrome.windows.getAll({ populate: false }).then((windows) => {
  const normalWindows = windows.filter((w) => w.type === "normal");
  if (normalWindows.length > 0) {
    const focused = normalWindows.find((w) => w.focused);
    lastNormalWindowId = focused ? focused.id : normalWindows[normalWindows.length - 1].id;
  }
}).catch(() => {});

// Track changes in window focus to always know which normal window the user was using.
chrome.windows.onFocusChanged.addListener(async (windowId) => {
  if (windowId === chrome.windows.WINDOW_ID_NONE) return;
  try {
    const win = await chrome.windows.get(windowId);
    if (win.type === "normal") {
      lastNormalWindowId = windowId;
    }
  } catch {
    // Ignore errors for closed/internal windows
  }
});

chrome.action.onClicked.addListener(async (tab) => {
  // Save the tab the user is looking at (the job page).
  if (tab?.id) lastActiveTabId = tab.id;

  // Stateless window check: see if a popup window with our popup.html is already open.
  const windows = await chrome.windows.getAll({ populate: true });
  const existingWindow = windows.find((win) =>
    win.tabs?.some((t) => t.url && t.url.includes("popup.html"))
  );

  if (existingWindow && existingWindow.id !== undefined) {
    try {
      await chrome.windows.update(existingWindow.id, { focused: true });
      return;
    } catch {
      // Ignore and proceed to create one if focusing failed
    }
  }

  let left = undefined;
  let top = undefined;
  if (lastNormalWindowId) {
    try {
      const mainWin = await chrome.windows.get(lastNormalWindowId);
      if (mainWin.left !== undefined && mainWin.width !== undefined && mainWin.top !== undefined) {
        left = Math.round(mainWin.left + mainWin.width - 440);
        top = Math.round(mainWin.top + 80);
      }
    } catch {
      // Ignore
    }
  }

  await chrome.windows.create({
    url: chrome.runtime.getURL("popup.html"),
    type: "popup",
    width: 420,
    height: 560,
    left: left,
    top: top,
    focused: true,
  });
});

// Find the active tab in the last-focused normal browser window.
// This avoids returning our own popup window's tab (moz-extension://).
async function findActiveWebTab() {
  let targetWindowId = lastNormalWindowId;
  if (!targetWindowId) {
    const allWindows = await chrome.windows.getAll({ populate: false });
    const normalWindows = allWindows.filter((w) => w.type === "normal");
    if (normalWindows.length === 0) return null;
    const target = normalWindows.find((w) => w.focused) || normalWindows[normalWindows.length - 1];
    targetWindowId = target.id;
  }

  try {
    const tabs = await chrome.tabs.query({ active: true, windowId: targetWindowId });
    return tabs[0] ?? null;
  } catch {
    // Target window might have been closed, fallback to any normal window
    const allWindows = await chrome.windows.getAll({ populate: false });
    const normalWindows = allWindows.filter((w) => w.type === "normal");
    if (normalWindows.length === 0) return null;
    const target = normalWindows.find((w) => w.focused) || normalWindows[normalWindows.length - 1];
    try {
      const tabs = await chrome.tabs.query({ active: true, windowId: target.id });
      return tabs[0] ?? null;
    } catch {
      return null;
    }
  }
}

// Resolve which tab to operate on:
// 1. If the sender is a content script (NOT our extension popup/options), use its tab.
// 2. Try findActiveWebTab() to pick the current active web tab.
// 3. Fall back to the tab stored when the user clicked the icon.
async function resolveWebTabId(sender) {
  const extUrlPrefix = chrome.runtime.getURL("");
  if (sender.tab?.id != null && sender.url && !sender.url.startsWith(extUrlPrefix)) {
    return sender.tab.id;
  }

  const webTab = await findActiveWebTab();
  if (webTab?.id != null) return webTab.id;

  return lastActiveTabId ?? undefined;
}

chrome.runtime.onMessage.addListener((raw, sender, sendResponse) => {
  if (!isAppMessage(raw)) return;
  const message = raw;

  resolveWebTabId(sender).then((tabId) => {
    return handleMessage(message, tabId);
  })
    .then((response) => sendResponse(response))
    .catch((err) => {
      sendResponse({ error: toErrorMessage(err) });
    });
  return true;
});

async function handleMessage(message, tabId) {
  switch (message.action) {
    case "GET_LAST_NORMAL_WINDOW_ID": {
      return { lastNormalWindowId };
    }
    case "ANALYZE_JOB": {
      if (!tabId) {
        return { error: "Kein aktiver Tab verf\u00fcgbar." };
      }
      try {
        const { result, model, threshold } = await analyzeJob({
          tabId,
          jobText: message.jobText,
          jobSource: message.jobSource,
        });
        return { ok: true, result, model, threshold };
      } catch (e) {
        return { error: toErrorMessage(e) };
      }
    }
    case "AUDIO_SOLVE": {
      try {
        const { text, model } = await solveAudio(message.audioDataUrl, message.mimeType ?? "audio/webm");
        return { ok: true, text, model };
      } catch (e) {
        return { error: toErrorMessage(e) };
      }
    }
    default:
      return { error: "Unbekannte Aktion." };
  }
}

function toErrorMessage(e) {
  if (e instanceof MissingApiKeyError) return e.message;
  if (e instanceof MissingCvError) return e.message;
  if (e instanceof JobMatcherError) return e.message;
  if (e instanceof Error) return e.message;
  return "Unbekannter Fehler.";
}
