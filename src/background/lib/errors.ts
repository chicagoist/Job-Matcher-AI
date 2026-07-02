// ── Basis ───────────────────────────────────────────
export class JobMatcherError extends Error {
  readonly code: string;
  constructor(code: string, message: string) {
    super(message);
    this.code = code;
    this.name = "JobMatcherError";
  }
}

// ── Neutrale Fehler (shared code, kein Provider-Bezug) ──
export class BadRequestError extends JobMatcherError {
  constructor(message: string) {
    super("BAD_REQUEST", message);
    this.name = "BadRequestError";
  }
}

export class ServerError extends JobMatcherError {
  constructor(message: string) {
    super("SERVER", message);
    this.name = "ServerError";
  }
}

export class NetworkError extends JobMatcherError {
  constructor(message: string) {
    super("NETWORK", message);
    this.name = "NetworkError";
  }
}

// ── App-Fehler (kein Provider-Bezug) ──
export class MissingApiKeyError extends JobMatcherError {
  constructor() {
    super("MISSING_API_KEY", "Es wurde kein API-Schlüssel hinterlegt.");
    this.name = "MissingApiKeyError";
  }
}

export class MissingCvError extends JobMatcherError {
  constructor() {
    super("MISSING_CV", "Es wurde kein Lebenslauf hinterlegt.");
    this.name = "MissingCvError";
  }
}

export class PlatformNotSupportedError extends JobMatcherError {
  constructor(url: string) {
    super(
      "PLATFORM_NOT_SUPPORTED",
      `Diese Job-Plattform wird nicht unterstützt: ${url}. Bitte fügen Sie die Stellenanzeige manuell ein.`,
    );
    this.name = "PlatformNotSupportedError";
  }
}

export class JobFetchError extends JobMatcherError {
  constructor(platform: string, reason: string) {
    super("JOB_FETCH_ERROR", `Fehler beim Abruf von ${platform}: ${reason}`);
    this.name = "JobFetchError";
  }
}

// ── Gemini-spezifisch ──
export class GeminiAuthError extends JobMatcherError {
  constructor(message: string) {
    super("GEMINI_AUTH", message);
    this.name = "GeminiAuthError";
  }
}

export class GeminiRateLimitError extends JobMatcherError {
  constructor(message: string) {
    super("GEMINI_RATE_LIMIT", message);
    this.name = "GeminiRateLimitError";
  }
}

export class GeminiBadRequestError extends BadRequestError {
  constructor(message: string) {
    super(message);
    this.code = "GEMINI_BAD_REQUEST";
    this.name = "GeminiBadRequestError";
  }
}

export class GeminiServerError extends ServerError {
  constructor(message: string) {
    super(message);
    this.code = "GEMINI_SERVER";
    this.name = "GeminiServerError";
  }
}

export class GeminiNetworkError extends NetworkError {
  constructor(message: string) {
    super(message);
    this.code = "GEMINI_NETWORK";
    this.name = "GeminiNetworkError";
  }
}

// ── Ollama-spezifisch ──
export class OllamaConnectionError extends NetworkError {
  constructor() {
    super("Ollama läuft nicht. Starte Ollama und versuche es erneut.");
    this.code = "OLLAMA_CONNECTION";
    this.name = "OllamaConnectionError";
  }
}

export class OllamaServerError extends ServerError {
  constructor(message: string) {
    super(message);
    this.code = "OLLAMA_SERVER";
    this.name = "OllamaServerError";
  }
}
