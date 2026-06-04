import type { AppMessage } from "./types.js";

export function isAppMessage(value: unknown): value is AppMessage {
  if (typeof value !== "object" || value === null) return false;
  const v = value as { action?: unknown };
  return (
    typeof v.action === "string" &&
    [
      "TOGGLE_PANEL",
      "ANALYZE_JOB",
      "AUDIO_SOLVE",
      "OPEN_OPTIONS",
      "COPY_TO_CLIPBOARD",
    ].includes(v.action)
  );
}

export function sendAppMessage<T = unknown>(message: AppMessage): Promise<T> {
  return new Promise((resolve, reject) => {
    try {
      chrome.runtime.sendMessage(message, (response: T) => {
        const err = chrome.runtime.lastError;
        if (err) {
          reject(new Error(err.message ?? "Unbekannter Fehler"));
          return;
        }
        resolve(response);
      });
    } catch (e) {
      reject(e);
    }
  });
}
