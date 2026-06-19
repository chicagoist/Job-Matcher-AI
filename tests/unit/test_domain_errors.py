from job_matcher_ai.domain.errors import (
    ConfigurationError,
    ProviderAuthError,
    ProviderError,
    ProviderRateLimitError,
    LLMError,
    LLMTimeoutError,
    ComplianceError,
)


def test_configuration_error() -> None:
    err = ConfigurationError("API_KEY")
    assert "API_KEY" in str(err)
    assert err.code == "CONFIG_ERROR"


def test_provider_error() -> None:
    err = ProviderError("adzuna", 500, "Server error")
    assert err.provider == "adzuna"
    assert err.status_code == 500
    assert "Server error" in str(err)
    assert err.code == "PROVIDER_ERROR"


def test_provider_auth_error() -> None:
    err = ProviderAuthError("adzuna")
    assert err.status_code == 401
    assert err.code == "PROVIDER_AUTH_ERROR"


def test_provider_rate_limit() -> None:
    err = ProviderRateLimitError("adzuna", retry_after=60)
    assert err.status_code == 429
    assert err.retry_after == 60


def test_llm_error() -> None:
    err = LLMError("llama3.2", "timeout")
    assert err.model == "llama3.2"
    assert err.code == "LLM_ERROR"


def test_llm_timeout_error() -> None:
    err = LLMTimeoutError("llama3.2", 120)
    assert err.model == "llama3.2"
    assert "120" in str(err)
    assert err.code == "LLM_TIMEOUT"


def test_compliance_error() -> None:
    err = ComplianceError("no_consent")
    assert "no_consent" in str(err)
    assert err.code == "COMPLIANCE_ERROR"
