export const STORAGE_KEYS = {
  apiKey: "geminiKey",
  cvData: "cvData",
  cvFileName: "cvFileName",
  cvUploadedAt: "cvUploadedAt",
  threshold: "threshold",
  model: "model",
  panelPosition: "panelPosition",
  history: "history",
} as const;

export const DEFAULTS = {
  threshold: 8,
  model: "gemini-2.5-flash",
  maxJobTextChars: 10_000,
  maxCvBytes: 5 * 1024 * 1024,
  maxHistoryEntries: 20,
  fetchTimeoutMs: 15_000,
} as const;

export const GEMINI_ENDPOINT = "https://generativelanguage.googleapis.com/v1beta/models";

export const TIMEOUTS = {
  apiRequestMs: 60_000,
  retryBackoffMs: 800,
  maxRetries: 2,
} as const;

export const KNOWN_JOB_HOSTS: ReadonlyArray<string> = [
  "stepstone.de",
  "stepstone.com",
  "indeed.com",
  "indeed.de",
  "xing.com",
  "linkedin.com",
  "arbeitsagentur.de",
  "heyjobs.co",
  "jobvector.de",
  "stellenanzeigen.de",
  "kimeta.de",
  "monster.de",
  "jobware.de",
];
