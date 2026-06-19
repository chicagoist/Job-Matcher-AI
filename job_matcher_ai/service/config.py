import os
from dataclasses import dataclass, field

from job_matcher_ai.domain.errors import ConfigurationError
from job_matcher_ai.domain.interfaces import ConfigProvider


@dataclass
class EnvConfigProvider(ConfigProvider):
    prefix: str = "JOB_MATCHER_"
    _cache: dict[str, str] = field(default_factory=dict, init=False, repr=False)

    def _resolve_key(self, key: str) -> str:
        env_key = key.upper().replace(".", "_")
        if not env_key.startswith(self.prefix):
            env_key = f"{self.prefix}{env_key}"
        return env_key

    def get(self, key: str, default: str | None = None) -> str | None:
        env_key = self._resolve_key(key)
        if env_key not in self._cache:
            self._cache[env_key] = os.environ.get(env_key, "") or ""
        val = self._cache.get(env_key) or ""
        return val if val else default

    def get_int(self, key: str, default: int | None = None) -> int | None:
        val = self.get(key)
        if val is None:
            return default
        try:
            return int(val)
        except (ValueError, TypeError):
            return default

    def get_bool(self, key: str, default: bool | None = None) -> bool | None:
        val = self.get(key)
        if val is None:
            return default
        return val.lower() in ("1", "true", "yes", "on")

    def require(self, key: str) -> str:
        val = self.get(key)
        if val is None:
            raise ConfigurationError(key)
        return val


@dataclass
class AppSettings:
    ollama_base_url: str = "http://localhost:11434"
    ollama_model: str = "llama3.2:3b"
    ollama_timeout: int = 120
    db_path: str = "~/.job-matcher/data.db"
    adzuna_app_id: str = ""
    adzuna_api_key: str = ""
    indeed_api_key: str = ""
    indeed_publisher_id: str = ""
    log_level: str = "INFO"
    default_country: str = "gb"
    max_jobs_per_search: int = 50

    @classmethod
    def from_env(cls, provider: ConfigProvider) -> "AppSettings":
        return cls(
            ollama_base_url=provider.get("OLLAMA_BASE_URL") or "http://localhost:11434",
            ollama_model=provider.get("OLLAMA_MODEL") or "llama3.2:3b",
            ollama_timeout=provider.get_int("OLLAMA_TIMEOUT") or 120,
            db_path=provider.get("DB_PATH") or "~/.job-matcher/data.db",
            adzuna_app_id=provider.get("ADZUNA_APP_ID") or "",
            adzuna_api_key=provider.get("ADZUNA_API_KEY") or "",
            indeed_api_key=provider.get("INDEED_API_KEY") or "",
            indeed_publisher_id=provider.get("INDEED_PUBLISHER_ID") or "",
            log_level=provider.get("LOG_LEVEL") or "INFO",
            default_country=provider.get("DEFAULT_COUNTRY") or "gb",
            max_jobs_per_search=provider.get_int("MAX_JOBS_PER_SEARCH") or 50,
        )
