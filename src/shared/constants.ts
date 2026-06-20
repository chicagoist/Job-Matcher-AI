export const STORAGE_KEYS = {
  apiKey: "geminiKey",
  ollamaHost: "ollamaHost",
  provider: "provider",
  cvData: "cvData",
  cvText: "cvText",
  cvFileName: "cvFileName",
  cvUploadedAt: "cvUploadedAt",
  threshold: "threshold",
  model: "model",
  panelPosition: "panelPosition",
  history: "history",
} as const;

export const DEFAULTS = {
  threshold: 8,
  model: "llama3.2:3b-instruct-q4_K_M",
  maxJobTextChars: 10_000,
  maxCvBytes: 5 * 1024 * 1024,
  maxHistoryEntries: 20,
  fetchTimeoutMs: 15_000,
  ollamaHost: "http://localhost:11434",
  provider: "ollama",
} as const;

export const GEMINI_ENDPOINT = "https://generativelanguage.googleapis.com/v1beta/models";
export const OLLAMA_CHAT_ENDPOINT = "/api/chat";
export const OLLAMA_TAGS_ENDPOINT = "/api/tags";

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
