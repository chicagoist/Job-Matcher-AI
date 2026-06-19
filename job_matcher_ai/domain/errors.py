from dataclasses import dataclass


class JobMatcherError(Exception):
    """Base error for the entire application."""

    def __init__(self, message: str, code: str = "UNKNOWN") -> None:
        self.code = code
        super().__init__(message)


class ConfigurationError(JobMatcherError):
    """Missing or invalid configuration."""

    def __init__(self, key: str, detail: str = "") -> None:
        msg = f"Configuration error: {key} is missing or invalid"
        if detail:
            msg += f" — {detail}"
        super().__init__(msg, code="CONFIG_ERROR")


class ProviderError(JobMatcherError):
    """Error from a job data provider API."""

    def __init__(self, provider: str, status_code: int, detail: str = "") -> None:
        msg = f"Provider '{provider}' returned HTTP {status_code}"
        if detail:
            msg += f": {detail}"
        super().__init__(msg, code="PROVIDER_ERROR")
        self.provider = provider
        self.status_code = status_code


class ProviderAuthError(ProviderError):
    """Authentication failure with a job provider."""

    def __init__(self, provider: str, detail: str = "") -> None:
        msg = f"Provider '{provider}' authentication failed"
        if detail:
            msg += f": {detail}"
        super().__init__(provider, 401, detail)
        self.code = "PROVIDER_AUTH_ERROR"


class ProviderRateLimitError(ProviderError):
    """Rate limited by a job provider."""

    def __init__(self, provider: str, retry_after: int | None = None) -> None:
        self.retry_after = retry_after
        detail = f"Rate limited, retry after {retry_after}s" if retry_after else "Rate limited"
        super().__init__(provider, 429, detail)
        self.code = "PROVIDER_RATE_LIMIT"


class AIEngineError(JobMatcherError):
    """Error from the AI engine (Ollama, parser, matcher)."""

    def __init__(self, detail: str = "") -> None:
        msg = "AI engine error"
        if detail:
            msg += f": {detail}"
        super().__init__(msg, code="AI_ENGINE_ERROR")


class LLMError(JobMatcherError):
    """Error from the local LLM."""

    def __init__(self, model: str, detail: str = "") -> None:
        msg = f"LLM '{model}' failed"
        if detail:
            msg += f": {detail}"
        super().__init__(msg, code="LLM_ERROR")
        self.model = model


class LLMTimeoutError(LLMError):
    """LLM request timed out."""

    def __init__(self, model: str, timeout: int) -> None:
        msg = f"LLM '{model}' timed out after {timeout}s"
        super().__init__(model, msg)
        self.code = "LLM_TIMEOUT"


class ResumeParseError(JobMatcherError):
    """Failed to parse a resume document."""

    def __init__(self, detail: str = "") -> None:
        msg = "Resume parsing failed"
        if detail:
            msg += f": {detail}"
        super().__init__(msg, code="RESUME_PARSE_ERROR")


class ComplianceError(JobMatcherError):
    """Operation blocked by compliance rules."""

    def __init__(self, rule: str, detail: str = "") -> None:
        msg = f"Compliance rule '{rule}' blocked operation"
        if detail:
            msg += f": {detail}"
        super().__init__(msg, code="COMPLIANCE_ERROR")


@dataclass(frozen=True)
class ErrorCode:
    MISSING_API_KEY = "MISSING_API_KEY"
    PROVIDER_ERROR = "PROVIDER_ERROR"
    PROVIDER_AUTH = "PROVIDER_AUTH"
    PROVIDER_RATE_LIMIT = "PROVIDER_RATE_LIMIT"
    LLM_ERROR = "LLM_ERROR"
    LLM_TIMEOUT = "LLM_TIMEOUT"
    RESUME_PARSE = "RESUME_PARSE"
    COMPLIANCE_BLOCKED = "COMPLIANCE_BLOCKED"
    STORAGE_ERROR = "STORAGE_ERROR"
    VALIDATION_ERROR = "VALIDATION_ERROR"
