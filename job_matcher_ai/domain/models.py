from datetime import datetime
from decimal import ROUND_HALF_UP, Decimal
from enum import Enum, auto
from typing import NewType

from pydantic import BaseModel, Field, field_validator

JobId = NewType("JobId", str)
ProviderName = NewType("ProviderName", str)
ResumeId = NewType("ResumeId", str)


class JobType(str, Enum):
    FULL_TIME = "full_time"
    PART_TIME = "part_time"
    CONTRACT = "contract"
    PERMANENT = "permanent"
    INTERNSHIP = "internship"
    TEMPORARY = "temporary"


class JobSource(str, Enum):
    ADZUNA = "adzuna"
    INDEED = "indeed"


class SalaryPeriod(str, Enum):
    YEARLY = "yearly"
    MONTHLY = "monthly"
    HOURLY = "hourly"
    DAILY = "daily"


class Salary(BaseModel):
    min: float | None = None
    max: float | None = None
    currency: str = "EUR"
    period: SalaryPeriod = SalaryPeriod.YEARLY
    is_estimated: bool = False


class Location(BaseModel):
    display_name: str
    area: list[str] = Field(default_factory=list)
    latitude: float | None = None
    longitude: float | None = None
    country: str = ""
    is_remote: bool = False


class Job(BaseModel):
    id: JobId
    provider: ProviderName
    title: str
    company: str
    description: str
    location: Location
    salary: Salary | None = None
    url: str = ""
    posted_at: datetime | None = None
    job_type: JobType | None = None
    category: str = ""
    tags: list[str] = Field(default_factory=list)


class Skill(BaseModel):
    name: str
    category: str = "general"
    weight: float = 1.0


class Experience(BaseModel):
    title: str
    company: str
    start_date: str = ""
    end_date: str | None = None
    description: str = ""


class Education(BaseModel):
    degree: str
    institution: str
    field: str = ""
    year: int | None = None


class Resume(BaseModel):
    id: ResumeId = ResumeId("")
    raw_text: str
    skills: list[Skill] = Field(default_factory=list)
    experience: list[Experience] = Field(default_factory=list)
    education: list[Education] = Field(default_factory=list)
    title: str = ""
    summary: str = ""
    languages: list[str] = Field(default_factory=list)
    certifications: list[str] = Field(default_factory=list)
    yoe: float | None = None


class MatchScore(BaseModel):
    overall: float = Field(ge=0.0, le=10.0)
    skills_match: float = Field(default=0.0, ge=0.0, le=10.0)
    experience_match: float = Field(default=0.0, ge=0.0, le=10.0)

    @field_validator("overall")
    @classmethod
    def overall_must_be_within_range(cls, v: float) -> float:
        d = Decimal(str(v)).quantize(Decimal("0.1"), rounding=ROUND_HALF_UP)
        return float(d)


class MatchResult(BaseModel):
    job: Job
    resume: Resume
    score: MatchScore
    matched_skills: list[str] = Field(default_factory=list)
    missing_skills: list[str] = Field(default_factory=list)
    suggested_questions: list[str] = Field(default_factory=list)
    reasoning: str = ""
    explanation: str = ""
    generated_at: datetime = Field(default_factory=datetime.now)
    requires_human_review: bool = True

    @field_validator("requires_human_review")
    @classmethod
    def enforce_human_review(cls, v: bool) -> bool:
        return True


class Draft(BaseModel):
    match: MatchResult
    subject: str = ""
    body_md: str = ""
    recipient_name: str = ""
    recipient_email: str = ""
    recipient_title: str = ""
    generated_at: datetime = Field(default_factory=datetime.now)
    requires_manual_review: bool = True
    reviewed: bool = False

    @field_validator("requires_manual_review")
    @classmethod
    def enforce_manual_mode(cls, v: bool) -> bool:
        return True


class JobSearchQuery(BaseModel):
    keywords: str = ""
    location: str = ""
    country: str = "gb"
    page: int = 1
    results_per_page: int = 20
    salary_min: float | None = None
    salary_max: float | None = None
    job_type: JobType | None = None
    max_days_old: int = 30
    remote_only: bool = False
    sort_by: str = "relevance"


class SearchResult(BaseModel):
    jobs: list[Job] = Field(default_factory=list)
    total: int = 0
    page: int = 1
    provider: ProviderName = ProviderName("")
    query: JobSearchQuery | None = None
    error: str | None = None


class ConsentRecord(BaseModel):
    id: str = ""
    user_id: str = "default"
    consent_type: str = "data_processing"
    granted_at: datetime = Field(default_factory=datetime.now)
    expires_at: datetime | None = None
    revoked_at: datetime | None = None
    version: str = "1.0"
    ip_address: str = ""
    user_agent: str = ""

    @property
    def is_valid(self) -> bool:
        if self.revoked_at:
            return False
        if self.expires_at and self.expires_at < datetime.now():
            return False
        return True


class AuditEntry(BaseModel):
    id: str = ""
    timestamp: datetime = Field(default_factory=datetime.now)
    action: str = ""
    category: str = ""
    details: str = ""
    user_id: str = "default"
    ip_address: str = ""
    duration_ms: int | None = None
    success: bool = True


class ProcessingPurpose(Enum):
    JOB_SEARCH = auto()
    RESUME_ANALYSIS = auto()
    MATCH_SCORING = auto()
    DRAFT_GENERATION = auto()
    COMPLIANCE_AUDIT = auto()
    DATA_MAINTENANCE = auto()
