import { GEMINI_ENDPOINT, TIMEOUTS } from "../../shared/constants.js";
import { sleep, withTimeout } from "../../shared/utils.js";
import { responseSchema } from "./prompts.js";
import {
  GeminiAuthError,
  GeminiBadRequestError,
  GeminiNetworkError,
  GeminiRateLimitError,
  GeminiServerError,
  JobMatcherError,
} from "./errors.js";

export type GeminiPart =
  | { text: string }
  | { inline_data: { mime_type: string; data: string } };

export interface GeminiRequest {
  systemInstruction: string;
  userParts: GeminiPart[];
  model: string;
  apiKey: string;
  temperature?: number;
  maxOutputTokens?: number;
}

export interface GeminiResponse {
  text: string;
  model: string;
  raw: unknown;
}

interface GeminiPartWire {
  text?: string;
  inline_data?: { mime_type?: string; data?: string };
}
interface GeminiCandidate {
  content?: { parts?: GeminiPartWire[] };
}
interface GeminiResponseWire {
  candidates?: GeminiCandidate[];
  error?: { message?: string; status?: string; code?: number };
}
function classifyStatus(status: number, message: string): JobMatcherError {
  if (status === 401 || status === 403) return new GeminiAuthError(message);
  if (status === 429) return new GeminiRateLimitError(message);
  if (status >= 400 && status < 500) return new GeminiBadRequestError(message);
  if (status >= 500) return new GeminiServerError(message);
  return new GeminiNetworkError(message);
}

function isRetryable(err: unknown): boolean {
  if (err instanceof GeminiRateLimitError) return true;
  if (err instanceof GeminiServerError) return true;
  if (err instanceof GeminiNetworkError) return true;
  return false;
}

export async function callGemini(req: GeminiRequest): Promise<GeminiResponse> {
  const url = `${GEMINI_ENDPOINT}/${encodeURIComponent(req.model)}:generateContent?key=${encodeURIComponent(req.apiKey)}`;
  const body = {
    systemInstruction: { parts: [{ text: req.systemInstruction }] },
    contents: [{ role: "user", parts: req.userParts }],
    generationConfig: {
      temperature: req.temperature ?? 0.4,
      maxOutputTokens: req.maxOutputTokens ?? 2048,
      responseMimeType: "application/json",
      responseSchema,
    },
  };

  let lastError: unknown = null;
  for (let attempt = 0; attempt <= TIMEOUTS.maxRetries; attempt++) {
    const { signal, cancel } = withTimeout(TIMEOUTS.apiRequestMs);
    try {
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
        signal,
      });
      cancel();
      const json = (await res.json()) as GeminiResponseWire;
      if (!res.ok) {
        const msg = json.error?.message ?? `HTTP ${res.status}`;
        throw classifyStatus(res.status, msg);
      }
      const text = json.candidates?.[0]?.content?.parts?.[0]?.text;
      if (typeof text !== "string" || text.length === 0) {
        throw new GeminiServerError("Leere Antwort vom Modell.");
      }
      return { text, model: req.model, raw: json };
    } catch (e: unknown) {
      cancel();
      const err = normalizeError(e);
      lastError = err;
      if (isRetryable(err) && attempt < TIMEOUTS.maxRetries) {
        await sleep(TIMEOUTS.retryBackoffMs * Math.pow(2, attempt));
        continue;
      }
      throw err;
    }
  }
  // Should be unreachable, but TS needs a return / throw.
  throw lastError instanceof Error
    ? lastError
    : new GeminiNetworkError("Anfrage fehlgeschlagen.");
}

function normalizeError(e: unknown): JobMatcherError {
  if (e instanceof JobMatcherError) return e;
  if (e instanceof Error && e.name === "AbortError") {
    return new GeminiNetworkError("Zeitüberschreitung bei der Anfrage.");
  }
  if (e instanceof Error) {
    return new GeminiNetworkError(e.message);
  }
  return new GeminiNetworkError("Unbekannter Netzwerkfehler.");
}


