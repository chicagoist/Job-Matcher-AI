export const STORAGE_KEYS = {
  apiKey: "geminiKey",
  cvData: "cvData",
  cvFileName: "cvFileName",
  cvUploadedAt: "cvUploadedAt",
  threshold: "threshold",
  model: "model",
  history: "history",
};

export const DEFAULTS = {
  threshold: 7,
  model: "gemini-2.5-flash",
  maxJobTextChars: 10_000,
  maxCvBytes: 5 * 1024 * 1024,
  maxHistoryEntries: 20,
};

export const GEMINI_ENDPOINT = "https://generativelanguage.googleapis.com/v1beta/models";

export const TIMEOUTS = {
  apiRequestMs: 60_000,
  retryBackoffMs: 800,
  maxRetries: 2,
};
