from abc import ABC, abstractmethod
from collections.abc import AsyncIterator, Sequence

from job_matcher_ai.domain.models import (
    AuditEntry,
    ConsentRecord,
    Draft,
    Job,
    JobSearchQuery,
    MatchResult,
    Resume,
    SearchResult,
)


class JobProvider(ABC):
    @abstractmethod
    async def search(self, query: JobSearchQuery) -> SearchResult:
        ...

    @abstractmethod
    async def get_job(self, job_id: str) -> Job | None:
        ...

    @property
    @abstractmethod
    def provider_name(self) -> str:
        ...


class ResumeParser(ABC):
    @abstractmethod
    async def parse(self, raw_text: str) -> Resume:
        ...

    @abstractmethod
    async def extract_skills(self, resume: Resume) -> list[str]:
        ...


class LLMEngine(ABC):
    @abstractmethod
    async def generate(self, prompt: str, system: str | None = None, **kwargs) -> str:
        ...

    @abstractmethod
    async def generate_stream(self, prompt: str, system: str | None = None) -> AsyncIterator[str]:
        ...


class Matcher(ABC):
    @abstractmethod
    async def match(self, job: Job, resume: Resume) -> MatchResult:
        ...

    @abstractmethod
    async def explain(self, result: MatchResult) -> str:
        ...


class DraftGenerator(ABC):
    @abstractmethod
    async def generate(self, match: MatchResult, style: str = "professional") -> Draft:
        ...


class Storage(ABC):
    @abstractmethod
    async def save_job(self, job: Job) -> None:
        ...

    @abstractmethod
    async def save_match(self, result: MatchResult) -> str:
        ...

    @abstractmethod
    async def save_draft(self, draft: Draft, match_id: str | None = None) -> str:
        ...

    @abstractmethod
    async def save_resume(self, resume: Resume) -> str:
        ...

    @abstractmethod
    async def get_job(self, job_id: str) -> Job | None:
        ...

    @abstractmethod
    async def get_recent_jobs(self, limit: int = 50) -> Sequence[Job]:
        ...

    @abstractmethod
    async def get_drafts(self, limit: int = 20) -> Sequence[Draft]:
        ...

    @abstractmethod
    async def store_consent(self, record: ConsentRecord) -> None:
        ...

    @abstractmethod
    async def get_consent(self, user_id: str) -> ConsentRecord | None:
        ...

    @abstractmethod
    async def append_audit(self, entry: AuditEntry) -> None:
        ...

    @abstractmethod
    async def query_audit(
        self, category: str | None = None, action: str | None = None, limit: int = 100
    ) -> Sequence[AuditEntry]:
        ...

    @abstractmethod
    async def close(self) -> None:
        ...


class ComplianceService(ABC):
    @abstractmethod
    async def check_consent(self, purpose: str, user_id: str = "default") -> bool:
        ...

    @abstractmethod
    async def grant_consent(
        self, purpose: str, user_id: str = "default", expires_days: int | None = None
    ) -> ConsentRecord:
        ...

    @abstractmethod
    async def revoke_consent(self, purpose: str, user_id: str = "default") -> None:
        ...

    @abstractmethod
    async def log_audit(
        self,
        action: str,
        category: str,
        details: str = "",
        success: bool = True,
        duration_ms: int | None = None,
    ) -> None:
        ...

    @abstractmethod
    async def require_draft_review(self) -> bool:
        ...


class ConfigProvider(ABC):
    @abstractmethod
    def get(self, key: str, default: str | None = None) -> str | None:
        ...

    @abstractmethod
    def get_int(self, key: str, default: int | None = None) -> int | None:
        ...

    @abstractmethod
    def get_bool(self, key: str, default: bool | None = None) -> bool | None:
        ...
