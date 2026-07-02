import { OLLAMA_CHAT_ENDPOINT, TIMEOUTS } from "../../shared/constants.js";
import { sleep, withTimeout } from "../../shared/utils.js";
import { OllamaConnectionError, OllamaServerError, JobMatcherError } from "./errors.js";

export interface OllamaRequest {
  host: string;
  model: string;
  systemPrompt: string;
  userContent: string;
  temperature?: number;
  maxTokens?: number;
}

export interface OllamaResponse {
  text: string;
  model: string;
}

interface OllamaResponseWire {
  message?: { content?: string };
  error?: string;
  model?: string;
}

function isRetryable(err: unknown): boolean {
  if (err instanceof OllamaServerError) return true;
  if (err instanceof OllamaConnectionError) return false;
  if (err instanceof TypeError) return true;
  return false;
}

function normalizeError(e: unknown): JobMatcherError {
  if (e instanceof JobMatcherError) return e;
  if (e instanceof Error && e.name === "AbortError") {
    return new OllamaServerError("Zeitüberschreitung bei der Anfrage an Ollama.");
  }
  if (e instanceof TypeError) {
    return new OllamaConnectionError();
  }
  if (e instanceof Error) {
    return new OllamaServerError(e.message);
  }
  return new OllamaServerError("Unbekannter Fehler bei der Verbindung zu Ollama.");
}

export async function callOllama(req: OllamaRequest): Promise<OllamaResponse> {
  const url = `${req.host.replace(/\/+$/, "")}${OLLAMA_CHAT_ENDPOINT}`;
  const body = {
    model: req.model,
    messages: [
      { role: "system", content: req.systemPrompt },
      { role: "user", content: req.userContent },
    ],
    stream: false,
    format: "json" as const,
    options: {
      temperature: req.temperature ?? 0.5,
      num_predict: req.maxTokens ?? 4096,
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
      const json = (await res.json()) as OllamaResponseWire;
      if (!res.ok) {
        const msg = json.error ?? `HTTP ${res.status}`;
        throw new OllamaServerError(msg);
      }
      const text = json.message?.content;
      if (typeof text !== "string" || text.length === 0) {
        throw new OllamaServerError("Leere Antwort von Ollama.");
      }
      return { text, model: json.model ?? req.model };
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
  throw lastError instanceof Error
    ? lastError
    : new OllamaServerError("Anfrage an Ollama fehlgeschlagen.");
}
