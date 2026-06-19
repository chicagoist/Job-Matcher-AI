"""Full integration test: consent → search → match → draft (all mocked)."""

import pytest
import pytest_asyncio
import respx

from job_matcher_ai.domain.models import JobSearchQuery
from job_matcher_ai.service.config import AppSettings, EnvConfigProvider
from job_matcher_ai.service.compliance import DefaultComplianceService
from job_matcher_ai.service.orchestrator import (
    DraftOrchestrator,
    MatchOrchestrator,
    SearchAndMatchPipeline,
    SearchOrchestrator,
)
from job_matcher_ai.storage.sqlite_repo import SqliteStorage
from job_matcher_ai.providers.adzuna_client import AdzunaProvider
from job_matcher_ai.ai.ollama_engine import OllamaEngine, TextResumeParser, LLMMatcher
from job_matcher_ai.output.generator import MarkdownDraftGenerator


@pytest_asyncio.fixture
async def container(tmp_path):
    settings = AppSettings(
        db_path=str(tmp_path / "integration.db"),
        adzuna_app_id="test_id",
        adzuna_api_key="test_key",
    )
    storage = SqliteStorage(settings)
    compliance = DefaultComplianceService(storage)
    yield settings, storage, compliance
    await storage.close()


@pytest.mark.asyncio
async def test_full_pipeline(container) -> None:
    settings, storage, compliance = container

    with respx.mock:
        respx.get("https://api.adzuna.com/v1/api/jobs/gb/search/1").respond(
            200,
            json={
                "count": 1,
                "results": [
                    {
                        "id": "42",
                        "title": "Python Engineer",
                        "company": {"display_name": "AI Corp"},
                        "description": "Python, AWS, Docker",
                        "location": {"display_name": "Berlin"},
                        "salary_min": 60000,
                        "salary_max": 90000,
                        "salary_currency": "EUR",
                        "redirect_url": "https://example.com",
                        "contract_type": "permanent",
                    }
                ],
            },
        )
        respx.post("http://localhost:11434/api/generate").respond(
            200,
            json={
                "response": '{"overall": 8, "skills_match": 7, "experience_match": 6, "matched_skills": ["Python", "Docker"], "missing_skills": ["Kubernetes"], "reasoning": "Good match"}'
            },
        )

        await compliance.grant_consent("job_search")
        await compliance.grant_consent("resume_analysis")

        provider = AdzunaProvider("test_id", "test_key")
        llm = OllamaEngine(settings)
        parser = TextResumeParser()
        matcher = LLMMatcher(llm, settings)
        generator = MarkdownDraftGenerator()

        search_orch = SearchOrchestrator([provider], storage, compliance)
        match_orch = MatchOrchestrator(matcher, parser, storage, compliance)
        draft_orch = DraftOrchestrator(generator, storage, compliance)
        pipeline = SearchAndMatchPipeline(search_orch, match_orch, draft_orch)

        query = JobSearchQuery(keywords="python", country="gb")
        result = await search_orch.search(query)
        assert len(result.jobs) == 1

        job = result.jobs[0]
        match_result = await match_orch.match_job(job, "Python developer with Docker experience")
        assert match_result.score.overall > 0
        assert "Python" in match_result.matched_skills

        draft = await draft_orch.create_draft(match_result)
        assert "Python Engineer" in draft.subject
        assert "AI Corp" in draft.subject
        assert "ENTWURF" in draft.body_md

        entries = await storage.query_audit(category="compliance")
        assert len(entries) >= 2

    await llm.close()
