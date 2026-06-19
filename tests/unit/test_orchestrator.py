import pytest
import pytest_asyncio

from job_matcher_ai.domain.models import Job, JobSearchQuery, Location, Resume
from job_matcher_ai.service.config import AppSettings
from job_matcher_ai.storage.sqlite_repo import SqliteStorage
from job_matcher_ai.service.compliance import DefaultComplianceService
from job_matcher_ai.service.orchestrator import SearchOrchestrator, DraftOrchestrator


class MockProvider:
    provider_name = "mock"

    async def search(self, query):
        from job_matcher_ai.domain.models import SearchResult
        return SearchResult(
            jobs=[
                Job(id="mock_1", provider="mock", title="Engineer", company="Co",
                    description="desc", location=Location(display_name="Remote")),
            ],
            total=1, page=1, provider="mock",
        )

    async def get_job(self, job_id):
        return None


class MockGenerator:
    async def generate(self, match, style="professional"):
        from job_matcher_ai.domain.models import Draft
        return Draft(match=match, subject="Test", body_md="## Test")


class MockMatcher:
    async def match(self, job, resume):
        from job_matcher_ai.domain.models import MatchResult, MatchScore
        return MatchResult(
            job=job, resume=resume,
            score=MockScore(overall=8.0, skills_match=7.0, experience_match=6.0),
        )

    async def explain(self, result):
        return "explanation"


class MockScore:
    overall = 8.0
    skills_match = 7.0
    experience_match = 6.0

    def model_dump_json(self):
        return '{"overall":8.0,"skills_match":7.0,"experience_match":6.0}'


class MockParser:
    async def parse(self, raw_text):
        return Resume(raw_text=raw_text, title="Test")

    async def extract_skills(self, resume):
        return ["Python"]


@pytest_asyncio.fixture
async def storage(tmp_path):
    s = SqliteStorage(AppSettings(db_path=str(tmp_path / "orch.db")))
    yield s
    await s.close()


@pytest.mark.asyncio
async def test_search_orchestrator_no_consent(storage: SqliteStorage) -> None:
    compliance = DefaultComplianceService(storage)
    orch = SearchOrchestrator([MockProvider()], storage, compliance)
    try:
        await orch.search(JobSearchQuery(keywords="python"))
        assert False, "Should have raised"
    except PermissionError:
        pass


@pytest.mark.asyncio
async def test_search_orchestrator_with_consent(storage: SqliteStorage) -> None:
    compliance = DefaultComplianceService(storage)
    await compliance.grant_consent("job_search")
    orch = SearchOrchestrator([MockProvider()], storage, compliance)
    result = await orch.search(JobSearchQuery(keywords="python"))
    assert len(result.jobs) == 1
    assert result.jobs[0].title == "Engineer"
