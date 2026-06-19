import pytest

from job_matcher_ai.domain.models import Job, Location, MatchResult, MatchScore, Resume
from job_matcher_ai.output.generator import MarkdownDraftGenerator


@pytest.mark.asyncio
async def test_markdown_draft_generator() -> None:
    job = Job(id="j1", provider="adzuna", title="Python Developer", company="Tech GmbH",
              description="Python job", location=Location(display_name="Berlin", country="DE"))
    resume = Resume(raw_text="I know Python", id="r1")
    score = MatchScore(overall=8.5, skills_match=9.0, experience_match=7.0)
    match = MatchResult(job=job, resume=resume, score=score, matched_skills=["Python", "Docker"])

    generator = MarkdownDraftGenerator()
    draft = await generator.generate(match, style="professional")
    assert "Python Developer" in draft.subject
    assert "Tech GmbH" in draft.subject
    assert "Bewerbung" in draft.body_md
    assert "ENTWURF" in draft.body_md
    assert draft.requires_manual_review is True


@pytest.mark.asyncio
async def test_draft_contains_score() -> None:
    job = Job(id="j2", provider="adzuna", title="Dev", company="Co",
              description="desc", location=Location(display_name="Remote"))
    resume = Resume(raw_text="test")
    score = MatchScore(overall=7.0, skills_match=6.0, experience_match=8.0)
    match = MatchResult(job=job, resume=resume, score=score)
    generator = MarkdownDraftGenerator()
    draft = await generator.generate(match)
    assert "7.0" in draft.body_md
