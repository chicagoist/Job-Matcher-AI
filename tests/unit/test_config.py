import os

from job_matcher_ai.domain.errors import ConfigurationError
from job_matcher_ai.service.config import AppSettings, EnvConfigProvider


def test_env_config_provider_get() -> None:
    os.environ["JOB_MATCHER_TEST_KEY"] = "test_value"
    provider = EnvConfigProvider()
    val = provider.get("test_key")
    assert val == "test_value"
    del os.environ["JOB_MATCHER_TEST_KEY"]


def test_env_config_provider_get_fallback() -> None:
    provider = EnvConfigProvider()
    val = provider.get("nonexistent_key", default="fallback")
    assert val == "fallback"


def test_env_config_provider_require_missing() -> None:
    provider = EnvConfigProvider()
    try:
        provider.require("no_such_key")
        assert False
    except ConfigurationError:
        pass


def test_env_config_provider_get_int() -> None:
    os.environ["JOB_MATCHER_INT_KEY"] = "42"
    provider = EnvConfigProvider()
    val = provider.get_int("int_key")
    assert val == 42
    del os.environ["JOB_MATCHER_INT_KEY"]


def test_env_config_provider_get_bool_true() -> None:
    os.environ["JOB_MATCHER_BOOL_KEY"] = "true"
    provider = EnvConfigProvider()
    val = provider.get_bool("bool_key")
    assert val is True
    del os.environ["JOB_MATCHER_BOOL_KEY"]


def test_env_config_provider_get_bool_false() -> None:
    os.environ["JOB_MATCHER_BOOL_KEY"] = "false"
    provider = EnvConfigProvider()
    val = provider.get_bool("bool_key")
    assert val is False
    del os.environ["JOB_MATCHER_BOOL_KEY"]


def test_app_settings_from_env() -> None:
    os.environ["JOB_MATCHER_OLLAMA_MODEL"] = "test-model"
    provider = EnvConfigProvider()
    settings = AppSettings.from_env(provider)
    assert settings.ollama_model == "test-model"
    assert settings.ollama_base_url == "http://localhost:11434"
    del os.environ["JOB_MATCHER_OLLAMA_MODEL"]
