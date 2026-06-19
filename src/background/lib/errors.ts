export class JobMatcherError extends Error {
  readonly code: string;
  constructor(code: string, message: string) {
    super(message);
    this.code = code;
    this.name = "JobMatcherError";
  }
}

export class MissingApiKeyError extends JobMatcherError {
  constructor() {
    super("MISSING_API_KEY", "Es wurde kein Gemini-API-Schlüssel hinterlegt.");
    this.name = "MissingApiKeyError";
  }
}

export class MissingCvError extends JobMatcherError {
  constructor() {
    super("MISSING_CV", "Es wurde kein Lebenslauf hinterlegt.");
    this.name = "MissingCvError";
  }
}

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

export class GeminiBadRequestError extends JobMatcherError {
  constructor(message: string) {
    super("GEMINI_BAD_REQUEST", message);
    this.name = "GeminiBadRequestError";
  }
}

export class GeminiServerError extends JobMatcherError {
  constructor(message: string) {
    super("GEMINI_SERVER", message);
    this.name = "GeminiServerError";
  }
}

export class GeminiNetworkError extends JobMatcherError {
  constructor(message: string) {
    super("GEMINI_NETWORK", message);
    this.name = "GeminiNetworkError";
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
