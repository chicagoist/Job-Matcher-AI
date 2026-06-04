import { GEMINI_ENDPOINT, TIMEOUTS } from "../../shared/constants.js";
import { responseSchema } from "./prompts.js";
import {
  GeminiAuthError,
  GeminiBadRequestError,
  GeminiNetworkError,
  GeminiRateLimitError,
  GeminiServerError,
  JobMatcherError,
} from "./errors.js";

function sleep(ms) {
  return new Promise((res) => setTimeout(res, ms));
}

function withTimeout(ms) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), ms);
  return { signal: ctrl.signal, cancel: () => clearTimeout(timer) };
}

function classifyStatus(status, message) {
  if (status === 401 || status === 403) return new GeminiAuthError(message);
  if (status === 429) return new GeminiRateLimitError(message);
  if (status >= 400 && status < 500) return new GeminiBadRequestError(message);
  if (status >= 500) return new GeminiServerError(message);
  return new GeminiNetworkError(message);
}

function isRetryable(err) {
  if (err instanceof GeminiRateLimitError) return true;
  if (err instanceof GeminiServerError) return true;
  if (err instanceof GeminiNetworkError) return true;
  return false;
}

export async function callGemini(req) {
  const url = `${GEMINI_ENDPOINT}/${encodeURIComponent(req.model)}:generateContent?key=${encodeURIComponent(req.apiKey)}`;
  const body = {
    systemInstruction: { parts: [{ text: req.systemInstruction }] },
    contents: [{ role: "user", parts: req.userParts }],
    generationConfig: {
      temperature: req.temperature ?? 0.4,
      maxOutputTokens: req.maxOutputTokens ?? 8192,
      responseMimeType: "application/json",
      responseSchema,
    },
  };

  let lastError = null;
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
      const json = await res.json();
      console.log("Gemini raw response JSON:", json);
      if (!res.ok) {
        const msg = json.error?.message ?? `HTTP ${res.status}`;
        throw classifyStatus(res.status, msg);
      }
      const candidate = json.candidates?.[0];
      if (candidate) {
        console.log("Gemini Candidate Finish Reason:", candidate.finishReason);
        console.log("Gemini Safety Ratings:", candidate.safetyRatings);
      }
      const text = candidate?.content?.parts?.[0]?.text;
      console.log("Gemini raw response text:", text);
      if (typeof text !== "string" || text.length === 0) {
        throw new GeminiServerError("Leere Antwort vom Modell.");
      }
      return { text, model: req.model, raw: json };
    } catch (e) {
      cancel();
      const err = normalizeError(e);
      console.error("Gemini API call failed with error:", err);
      lastError = err;
      if (isRetryable(err) && attempt < TIMEOUTS.maxRetries) {
        await sleep(TIMEOUTS.retryBackoffMs * Math.pow(2, attempt));
        continue;
      }
      throw err;
    }
  }
  throw lastError instanceof Error
    ? lastError
    : new GeminiNetworkError("Anfrage fehlgeschlagen.");
}

function normalizeError(e) {
  if (e instanceof JobMatcherError) return e;
  if (e instanceof Error && e.name === "AbortError") {
    return new GeminiNetworkError("Zeit\u00fcberschreitung bei der Anfrage.");
  }
  if (e instanceof Error) {
    return new GeminiNetworkError(e.message);
  }
  return new GeminiNetworkError("Unbekannter Netzwerkfehler.");
}
