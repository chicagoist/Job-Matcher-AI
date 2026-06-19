from datetime import datetime

from job_matcher_ai.domain.models import (
    Draft,
    Job,
    JobSearchQuery,
    Location,
    MatchResult,
    MatchScore,
    Resume,
    Salary,
    SalaryPeriod,
    Skill,
)


def test_job_full_construction() -> None:
    job = Job(
        id="adzuna_123",
        provider="adzuna",
        title="Software Engineer",
        company="Tech Corp",
        description="Great job",
        location=Location(display_name="Berlin", country="DE"),
        salary=Salary(min=50000, max=80000, currency="EUR"),
    )
    assert job.title == "Software Engineer"
    assert job.provider == "adzuna"
    assert job.salary is not None
    assert job.salary.min == 50000


def test_job_default_fields() -> None:
    job = Job(id="test_1", provider="adzuna", title="Dev", company="Co", description="desc",
              location=Location(display_name="Remote", is_remote=True))
    assert job.tags == []
    assert job.job_type is None
    assert job.location.is_remote is True


def test_match_score_rounding() -> None:
    s = MatchScore(overall=7.55, skills_match=8.24, experience_match=6.33)
    assert s.overall == 7.6


def test_match_score_invalid_overall_negative() -> None:
    try:
        MatchScore(overall=-1, skills_match=0, experience_match=0)
        assert False, "Should have raised"
    except Exception:
        pass


def test_match_score_invalid_overall_too_high() -> None:
    try:
        MatchScore(overall=11, skills_match=0, experience_match=0)
        assert False, "Should have raised"
    except Exception:
        pass


def test_match_result_always_requires_review() -> None:
    job = Job(id="j1", provider="adzuna", title="T", company="C", description="d",
              location=Location(display_name="Remote"))
    resume = Resume(raw_text="test")
    score = MatchScore(overall=8.0, skills_match=7.0, experience_match=6.0)
    result = MatchResult(job=job, resume=resume, score=score)
    assert result.requires_human_review is True


def test_draft_always_requires_manual_review() -> None:
    job = Job(id="j1", provider="adzuna", title="T", company="C", description="d",
              location=Location(display_name="Remote"))
    resume = Resume(raw_text="test")
    score = MatchScore(overall=8.0, skills_match=7.0, experience_match=6.0)
    match = MatchResult(job=job, resume=resume, score=score)
    draft = Draft(match=match, subject="Hello", body_md="## Application")
    assert draft.requires_manual_review is True


def test_search_query_defaults() -> None:
    q = JobSearchQuery(keywords="python")
    assert q.country == "gb"
    assert q.page == 1
    assert q.results_per_page == 20
    assert q.max_days_old == 30
    assert q.remote_only is False


def test_resume_defaults() -> None:
    r = Resume(raw_text="Some text")
    assert r.skills == []
    assert r.experience == []
    assert r.yoe is None


def test_salary_min_max() -> None:
    s = Salary(min=0, max=100000, period=SalaryPeriod.YEARLY)
    assert s.period == SalaryPeriod.YEARLY
    assert s.is_estimated is False


def test_location_area() -> None:
    loc = Location(display_name="Munich", area=["Bavaria", "Germany"])
    assert len(loc.area) == 2


def test_skill_default_weight() -> None:
    sk = Skill(name="Python")
    assert sk.weight == 1.0
    assert sk.category == "general"
