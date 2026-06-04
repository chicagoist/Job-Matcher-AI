import { STORAGE_KEYS, DEFAULTS } from "./constants.js";

export async function getApiKey() {
  const r = await chrome.storage.local.get(STORAGE_KEYS.apiKey);
  const k = r[STORAGE_KEYS.apiKey];
  return typeof k === "string" && k.length > 0 ? k : null;
}

export async function setApiKey(key) {
  await chrome.storage.local.set({ [STORAGE_KEYS.apiKey]: key });
}

export async function clearApiKey() {
  await chrome.storage.local.remove(STORAGE_KEYS.apiKey);
}

export async function getCv() {
  const r = await chrome.storage.local.get([
    STORAGE_KEYS.cvData,
    STORAGE_KEYS.cvFileName,
    STORAGE_KEYS.cvUploadedAt,
  ]);
  const dataUrl = r[STORAGE_KEYS.cvData];
  if (typeof dataUrl !== "string" || dataUrl.length === 0) return null;
  const fileName = r[STORAGE_KEYS.cvFileName];
  const uploadedAt = r[STORAGE_KEYS.cvUploadedAt];
  return {
    dataUrl,
    meta: {
      fileName: typeof fileName === "string" ? fileName : "lebenslauf.pdf",
      uploadedAt: typeof uploadedAt === "number" ? uploadedAt : Date.now(),
      sizeBytes: estimateBase64Bytes(dataUrl),
    },
  };
}

export async function setCv(dataUrl, fileName) {
  const meta = {
    fileName,
    uploadedAt: Date.now(),
    sizeBytes: estimateBase64Bytes(dataUrl),
  };
  await chrome.storage.local.set({
    [STORAGE_KEYS.cvData]: dataUrl,
    [STORAGE_KEYS.cvFileName]: fileName,
    [STORAGE_KEYS.cvUploadedAt]: meta.uploadedAt,
  });
  return meta;
}

export async function clearCv() {
  await chrome.storage.local.remove([
    STORAGE_KEYS.cvData,
    STORAGE_KEYS.cvFileName,
    STORAGE_KEYS.cvUploadedAt,
  ]);
}

export async function getThreshold() {
  const r = await chrome.storage.local.get(STORAGE_KEYS.threshold);
  const v = r[STORAGE_KEYS.threshold];
  if (typeof v !== "number" || !Number.isFinite(v)) return DEFAULTS.threshold;
  return Math.min(10, Math.max(1, Math.round(v)));
}

export async function setThreshold(value) {
  const clamped = Math.min(10, Math.max(1, Math.round(value)));
  await chrome.storage.local.set({ [STORAGE_KEYS.threshold]: clamped });
}

export async function getModel() {
  const r = await chrome.storage.local.get(STORAGE_KEYS.model);
  const v = r[STORAGE_KEYS.model];
  return typeof v === "string" && v.length > 0 ? v : DEFAULTS.model;
}

export async function setModel(model) {
  await chrome.storage.local.set({ [STORAGE_KEYS.model]: model });
}

export async function getHistory() {
  const r = await chrome.storage.local.get(STORAGE_KEYS.history);
  const h = r[STORAGE_KEYS.history];
  return Array.isArray(h) ? h : [];
}

export async function appendHistory(entry) {
  const current = await getHistory();
  const next = [entry, ...current].slice(0, DEFAULTS.maxHistoryEntries);
  await chrome.storage.local.set({ [STORAGE_KEYS.history]: next });
}

export async function clearHistory() {
  await chrome.storage.local.remove(STORAGE_KEYS.history);
}

function estimateBase64Bytes(dataUrl) {
  const idx = dataUrl.indexOf(",");
  const b64 = idx >= 0 ? dataUrl.slice(idx + 1) : dataUrl;
  return Math.floor((b64.length * 3) / 4);
}
