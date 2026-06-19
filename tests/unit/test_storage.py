import pytest
import pytest_asyncio

from job_matcher_ai.domain.models import Job, Location, Resume, MatchResult, MatchScore, Draft, AuditEntry, ConsentRecord
from job_matcher_ai.service.config import AppSettings
from job_matcher_ai.storage.sqlite_repo import SqliteStorage


@pytest_asyncio.fixture
async def storage(tmp_path):
    settings = AppSettings(db_path=str(tmp_path / "test.db"))
    s = SqliteStorage(settings)
    yield s
    await s.close()


@pytest.mark.asyncio
async def test_save_and_get_job(storage: SqliteStorage) -> None:
    job = Job(
        id="adzuna_999",
        provider="adzuna",
        title="Python Developer",
        company="Test GmbH",
        description="Nice job",
        location=Location(display_name="Berlin", country="DE"),
    )
    await storage.save_job(job)
    loaded = await storage.get_job("adzuna_999")
    assert loaded is not None
    assert loaded.title == "Python Developer"
    assert loaded.company == "Test GmbH"


@pytest.mark.asyncio
async def test_get_nonexistent_job(storage: SqliteStorage) -> None:
    loaded = await storage.get_job("nonexistent")
    assert loaded is None


@pytest.mark.asyncio
async def test_recent_jobs(storage: SqliteStorage) -> None:
    for i in range(3):
        j = Job(
            id=f"job_{i}",
            provider="adzuna",
            title=f"Job {i}",
            company="Co",
            description="desc",
            location=Location(display_name="Remote"),
        )
        await storage.save_job(j)
    jobs = await storage.get_recent_jobs(limit=10)
    assert len(jobs) == 3


@pytest.mark.asyncio
async def test_save_resume(storage: SqliteStorage) -> None:
    resume = Resume(raw_text="I am a Python developer", id="res_1")
    await storage.save_resume(resume)
    # indirect: check resume exists via match


@pytest.mark.asyncio
async def test_save_match(storage: SqliteStorage) -> None:
    job = Job(id="j1", provider="adzuna", title="Dev", company="C", description="d",
              location=Location(display_name="Remote"))
    resume = Resume(raw_text="test", id="r1")
    score = MatchScore(overall=8.0, skills_match=7.0, experience_match=6.0)
    match = MatchResult(job=job, resume=resume, score=score)
    await storage.save_job(job)
    await storage.save_resume(resume)
    await storage.save_match(match)


@pytest.mark.asyncio
async def test_save_draft(storage: SqliteStorage) -> None:
    job = Job(id="j2", provider="adzuna", title="Dev", company="C", description="d",
              location=Location(display_name="Remote"))
    resume = Resume(raw_text="test", id="r2")
    score = MatchScore(overall=8.0, skills_match=7.0, experience_match=6.0)
    match = MatchResult(job=job, resume=resume, score=score)
    draft = Draft(match=match, subject="Application", body_md="## Hello")
    await storage.save_job(job)
    await storage.save_resume(resume)
    match_id = await storage.save_match(match)
    await storage.save_draft(draft, match_id=match_id)
    drafts = await storage.get_drafts()
    assert len(drafts) >= 1


@pytest.mark.asyncio
async def test_consent_lifecycle(storage: SqliteStorage) -> None:
    rec = ConsentRecord(user_id="user1", consent_type="data_processing")
    await storage.store_consent(rec)
    loaded = await storage.get_consent("user1")
    assert loaded is not None
    assert loaded.consent_type == "data_processing"
    assert loaded.is_valid is True


@pytest.mark.asyncio
async def test_audit_log(storage: SqliteStorage) -> None:
    await storage.append_audit(AuditEntry(action="test", category="unit_test", details="testing"))
    entries = await storage.query_audit(category="unit_test")
    assert len(entries) >= 1
    assert entries[0].action == "test"
    assert entries[0].success is True
