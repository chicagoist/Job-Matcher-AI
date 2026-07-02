/**
 * Gemeinsame Hilfsfunktionen für alle Module.
 */

/** Menschenlesbare Dateigröße. */
export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

/** Base64-Daten aus einer Data-URL extrahieren. */
export function dataUrlToBase64(dataUrl: string): string {
  const idx = dataUrl.indexOf(",");
  return idx >= 0 ? dataUrl.slice(idx + 1) : dataUrl;
}

/** MIME-Typ aus einer Data-URL erkennen. */
export function detectMime(dataUrl: string): string {
  const m = /^data:([^;,]+)/.exec(dataUrl);
  return m && m[1] ? m[1] : "application/pdf";
}

/** Zufällige UUID erzeugen. */
export function cryptoRandomId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

/** Promise-basierte Verzögerung. */
export function sleep(ms: number): Promise<void> {
  return new Promise((res) => setTimeout(res, ms));
}

/** AbortSignal mit Timeout erzeugen. */
export function withTimeout(ms: number): { signal: AbortSignal; cancel: () => void } {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), ms);
  return { signal: ctrl.signal, cancel: () => clearTimeout(timer) };
}
