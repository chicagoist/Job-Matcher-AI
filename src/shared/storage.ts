import { STORAGE_KEYS, DEFAULTS } from "./constants.js";
import type {
  HistoryEntry,
  PanelPosition,
  CvMetadata,
} from "./types.js";

export async function getApiKey(): Promise<string | null> {
  const r = await chrome.storage.local.get(STORAGE_KEYS.apiKey);
  const k = r[STORAGE_KEYS.apiKey];
  return typeof k === "string" && k.length > 0 ? k : null;
}

export async function setApiKey(key: string): Promise<void> {
  await chrome.storage.local.set({ [STORAGE_KEYS.apiKey]: key });
}

export async function clearApiKey(): Promise<void> {
  await chrome.storage.local.remove(STORAGE_KEYS.apiKey);
}

export async function getOllamaHost(): Promise<string> {
  const r = await chrome.storage.local.get(STORAGE_KEYS.ollamaHost);
  const v = r[STORAGE_KEYS.ollamaHost];
  return typeof v === "string" && v.length > 0 ? v : DEFAULTS.ollamaHost;
}

export async function setOllamaHost(host: string): Promise<void> {
  await chrome.storage.local.set({ [STORAGE_KEYS.ollamaHost]: host });
}

export async function getProvider(): Promise<string> {
  const r = await chrome.storage.local.get(STORAGE_KEYS.provider);
  const v = r[STORAGE_KEYS.provider];
  return typeof v === "string" && (v === "ollama" || v === "gemini") ? v : DEFAULTS.provider;
}

export async function setProvider(provider: string): Promise<void> {
  await chrome.storage.local.set({ [STORAGE_KEYS.provider]: provider });
}

export async function getCvText(): Promise<string | null> {
  const r = await chrome.storage.local.get(STORAGE_KEYS.cvText);
  const v = r[STORAGE_KEYS.cvText];
  return typeof v === "string" && v.length > 0 ? v : null;
}

export async function setCvText(text: string): Promise<void> {
  await chrome.storage.local.set({ [STORAGE_KEYS.cvText]: text });
}

export async function clearCvText(): Promise<void> {
  await chrome.storage.local.remove(STORAGE_KEYS.cvText);
}

export interface StoredCv {
  dataUrl: string;
  meta: CvMetadata;
}

export async function getCv(): Promise<StoredCv | null> {
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

export async function setCv(dataUrl: string, fileName: string): Promise<CvMetadata> {
  const meta: CvMetadata = {
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

export async function clearCv(): Promise<void> {
  await chrome.storage.local.remove([
    STORAGE_KEYS.cvData,
    STORAGE_KEYS.cvText,
    STORAGE_KEYS.cvFileName,
    STORAGE_KEYS.cvUploadedAt,
  ]);
}

export async function getThreshold(): Promise<number> {
  const r = await chrome.storage.local.get(STORAGE_KEYS.threshold);
  const v = r[STORAGE_KEYS.threshold];
  if (typeof v !== "number" || !Number.isFinite(v)) return DEFAULTS.threshold;
  return Math.min(10, Math.max(1, Math.round(v)));
}

export async function setThreshold(value: number): Promise<void> {
  const clamped = Math.min(10, Math.max(1, Math.round(value)));
  await chrome.storage.local.set({ [STORAGE_KEYS.threshold]: clamped });
}

export async function getModel(): Promise<string> {
  const r = await chrome.storage.local.get(STORAGE_KEYS.model);
  const v = r[STORAGE_KEYS.model];
  return typeof v === "string" && v.length > 0 ? v : DEFAULTS.model;
}

export async function setModel(model: string): Promise<void> {
  await chrome.storage.local.set({ [STORAGE_KEYS.model]: model });
}

export async function getPanelPosition(): Promise<PanelPosition | null> {
  const r = await chrome.storage.local.get(STORAGE_KEYS.panelPosition);
  const p = r[STORAGE_KEYS.panelPosition];
  if (
    p &&
    typeof p === "object" &&
    typeof (p as PanelPosition).left === "number" &&
    typeof (p as PanelPosition).top === "number"
  ) {
    return p as PanelPosition;
  }
  return null;
}

export async function setPanelPosition(pos: PanelPosition): Promise<void> {
  await chrome.storage.local.set({ [STORAGE_KEYS.panelPosition]: pos });
}

export async function getHistory(): Promise<HistoryEntry[]> {
  const r = await chrome.storage.local.get(STORAGE_KEYS.history);
  const h = r[STORAGE_KEYS.history];
  return Array.isArray(h) ? (h as HistoryEntry[]) : [];
}

export async function appendHistory(entry: HistoryEntry): Promise<void> {
  const current = await getHistory();
  const next = [entry, ...current].slice(0, DEFAULTS.maxHistoryEntries);
  await chrome.storage.local.set({ [STORAGE_KEYS.history]: next });
}

export async function clearHistory(): Promise<void> {
  await chrome.storage.local.remove(STORAGE_KEYS.history);
}

function estimateBase64Bytes(dataUrl: string): number {
  const idx = dataUrl.indexOf(",");
  const b64 = idx >= 0 ? dataUrl.slice(idx + 1) : dataUrl;
  return Math.floor((b64.length * 3) / 4);
}
