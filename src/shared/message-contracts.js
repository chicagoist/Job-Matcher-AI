const ACTIONS = ["ANALYZE_JOB", "AUDIO_SOLVE", "TOGGLE_PANEL", "OPEN_OPTIONS", "COPY_TO_CLIPBOARD"];

export function isAppMessage(value) {
  if (typeof value !== "object" || value === null) return false;
  return typeof value.action === "string" && ACTIONS.includes(value.action);
}

export function sendAppMessage(message) {
  return new Promise((resolve, reject) => {
    try {
      chrome.runtime.sendMessage(message, (response) => {
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
