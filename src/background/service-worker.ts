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

chrome.action.onClicked.addListener((tab) => {
  if (tab.id === undefined) return;
  chrome.tabs
    .sendMessage(tab.id, { action: "TOGGLE_PANEL" } satisfies AppMessage)
    .catch(() => {});
});

chrome.runtime.onMessage.addListener((raw, sender, sendResponse) => {
  if (!isAppMessage(raw)) return;
  const message = raw;
  void handleMessage(message, sender.tab?.id)
    .then((response) => sendResponse(response))
    .catch((err: unknown) => {
      sendResponse({ error: toErrorMessage(err) });
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
