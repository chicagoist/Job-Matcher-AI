import { isAppMessage } from "../shared/message-contracts.js";
import type { AppMessage, AnalyzeJobRequest } from "../shared/types.js";
import { analyzeJob, solveAudio } from "./lib/cover-letter.js";
import {
  JobMatcherError,
  MissingApiKeyError,
  MissingCvError,
  OllamaConnectionError,
  OllamaServerError,
} from "./lib/errors.js";

declare const self: typeof globalThis;

let lastActiveTabId: number | undefined;
let lastNormalWindowId: number | undefined;

chrome.windows.getAll({ populate: false }).then((windows) => {
  const normalWindows = windows.filter((w) => w.type === "normal");
  if (normalWindows.length > 0) {
    const focused = normalWindows.find((w) => w.focused);
    lastNormalWindowId = focused ? focused.id : normalWindows[normalWindows.length - 1].id;
  }
}).catch(() => {});

chrome.windows.onFocusChanged.addListener(async (windowId) => {
  if (windowId === chrome.windows.WINDOW_ID_NONE) return;
  try {
    const win = await chrome.windows.get(windowId);
    if (win.type === "normal") {
      lastNormalWindowId = windowId;
    }
  } catch {}
});

chrome.action.onClicked.addListener(async (tab) => {
  if (tab?.id) lastActiveTabId = tab.id;

  const windows = await chrome.windows.getAll({ populate: true });
  const existingWindow = windows.find((win) =>
    win.tabs?.some((t) => t.url && t.url.includes("popup.html"))
  );
  if (existingWindow && existingWindow.id !== undefined) {
    try {
      await chrome.windows.update(existingWindow.id, { focused: true });
      return;
    } catch {}
  }

  let left: number | undefined;
  let top: number | undefined;
  if (lastNormalWindowId) {
    try {
      const mainWin = await chrome.windows.get(lastNormalWindowId);
      if (mainWin.left !== undefined && mainWin.width !== undefined && mainWin.top !== undefined) {
        left = Math.round(mainWin.left + mainWin.width - 440);
        top = Math.round(mainWin.top + 80);
      }
    } catch {}
  }

  await chrome.windows.create({
    url: chrome.runtime.getURL("popup.html"),
    type: "popup",
    width: 420,
    height: 560,
    left,
    top,
    focused: true,
  });
});

async function findActiveWebTab(): Promise<number | undefined> {
  if (lastNormalWindowId) {
    try {
      const tabs = await chrome.tabs.query({ active: true, windowId: lastNormalWindowId });
      if (tabs[0]?.id) return tabs[0].id;
    } catch {}
  }
  const extPrefix = chrome.runtime.getURL("");
  const tabs = await chrome.tabs.query({ active: true });
  const webTab = tabs.find((t) => t.id && t.url && !t.url.startsWith(extPrefix));
  return webTab?.id;
}

async function resolveWebTabId(sender: chrome.runtime.MessageSender): Promise<number | undefined> {
  const extUrlPrefix = chrome.runtime.getURL("");
  if (sender.tab?.id != null && sender.url && !sender.url.startsWith(extUrlPrefix)) {
    return sender.tab.id;
  }
  const webTabId = await findActiveWebTab();
  if (webTabId) return webTabId;
  if (lastActiveTabId) return lastActiveTabId;
  return undefined;
}

function safeSendResponse(sendResponse: (r: unknown) => void, response: unknown): void {
  try { sendResponse(response); } catch {}
}

chrome.runtime.onMessage.addListener((raw, sender, sendResponse) => {
  if (!isAppMessage(raw)) return;
  const message = raw;
  void resolveWebTabId(sender).then((tabId) =>
    handleMessage(message, tabId)
  )
    .then((response) => safeSendResponse(sendResponse, response))
    .catch((err: unknown) => {
      safeSendResponse(sendResponse, { error: toErrorMessage(err) });
    });
  return true;
});

async function handleMessage(message: AppMessage, tabId: number | undefined) {
  switch (message.action) {
    case "ANALYZE_JOB": {
      if (tabId === undefined) {
        return { error: "Kein aktiver Tab verfügbar." };
      }
      const payload = (message.payload ?? {}) as AnalyzeJobRequest;
      try {
        const { result, model, threshold, usedFallback, usedProvider } = await analyzeJob({
          tabId,
          jobText: payload.jobText,
          jobSource: payload.jobSource,
          jobUrl: payload.jobUrl,
        });
        return { ok: true, result, model, threshold, usedFallback, usedProvider };
      } catch (e) {
        return { error: toErrorMessage(e) };
      }
    }
    case "AUDIO_SOLVE": {
      try {
        const payload = (message.payload ?? {}) as { audioDataUrl: string; mimeType?: string };
        const { text, model } = await solveAudio(payload.audioDataUrl, payload.mimeType ?? "audio/webm");
        return { ok: true, text, model };
      } catch (e) {
        return { error: toErrorMessage(e) };
      }
    }
    case "TOGGLE_PANEL":
    case "OPEN_OPTIONS":
    case "COPY_TO_CLIPBOARD":
      return { error: "Aktion wird im Content-Skript verarbeitet." };
  }
}

function toErrorMessage(e: unknown): string {
  if (e instanceof MissingApiKeyError) return e.message;
  if (e instanceof MissingCvError) return e.message;
  if (e instanceof JobMatcherError) return e.message;
  if (e instanceof Error) return e.message;
  return "Unbekannter Fehler.";
}
