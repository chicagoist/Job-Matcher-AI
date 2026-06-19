import pytest
import respx

from job_matcher_ai.ai.ollama_engine import OllamaEngine, TextResumeParser, LLMMatcher
from job_matcher_ai.domain.models import Job, Location, Resume
from job_matcher_ai.service.config import AppSettings


@pytest.fixture
def settings() -> AppSettings:
    return AppSettings(ollama_base_url="http://localhost:11434", ollama_model="llama3.2:3b")


@pytest.mark.asyncio
async def test_ollama_generate_success(settings: AppSettings) -> None:
    with respx.mock:
        route = respx.post("http://localhost:11434/api/generate").respond(
            200, json={"response": "Hello from LLM"}
        )
        llm = OllamaEngine(settings)
        resp = await llm.generate("Test prompt")
        assert resp == "Hello from LLM"
        assert route.called
    await llm.close()


@pytest.mark.asyncio
async def test_ollama_generate_timeout(settings: AppSettings) -> None:
    with respx.mock:
        respx.post("http://localhost:11434/api/generate").side_effect = TimeoutError
        llm = OllamaEngine(settings)
        try:
            await llm.generate("Test")
            assert False
        except Exception:
            pass
    await llm.close()


@pytest.mark.asyncio
async def test_text_resume_parser_empty() -> None:
    parser = TextResumeParser()
    try:
        await parser.parse("")
        assert False
    except Exception:
        pass


@pytest.mark.asyncio
async def test_text_resume_parser_basic() -> None:
    parser = TextResumeParser()
    resume = await parser.parse("Python Developer\n5 years of experience\nSkills: Python, Docker, Kubernetes")
    assert resume.title == "Python Developer"
    assert any(s.name == "Python" for s in resume.skills)
    assert resume.yoe == 5.0


@pytest.mark.asyncio
async def test_text_resume_parser_extract_skills() -> None:
    parser = TextResumeParser()
    text = "I know Python, JavaScript, and Docker. Also experienced with AWS."
    resume = await parser.parse(text)
    skills = await parser.extract_skills(resume)
    assert "Python" in skills
    assert "Docker" in skills
    assert "AWS" in skills


@pytest.mark.asyncio
async def test_llm_matcher_success(settings: AppSettings) -> None:
    with respx.mock:
        respx.post("http://localhost:11434/api/generate").respond(
            200,
            json={
                "response": '{"overall": 8, "skills_match": 7, "experience_match": 6, "matched_skills": ["Python"], "missing_skills": ["Go"], "reasoning": "Good fit"}'
            },
        )
        llm = OllamaEngine(settings)
        matcher = LLMMatcher(llm, settings)
        job = Job(id="j1", provider="test", title="Dev", company="C", description="Python needed",
                  location=Location(display_name="Remote"))
        resume = Resume(raw_text="I know Python")
        result = await matcher.match(job, resume)
        assert result.score.overall == 8.0
        assert result.matched_skills == ["Python"]
        assert result.missing_skills == ["Go"]
    await llm.close()


@pytest.mark.asyncio
async def test_llm_matcher_invalid_json(settings: AppSettings) -> None:
    with respx.mock:
        respx.post("http://localhost:11434/api/generate").respond(
            200, json={"response": "Not JSON"}
        )
        llm = OllamaEngine(settings)
        matcher = LLMMatcher(llm, settings)
        job = Job(id="j1", provider="test", title="Dev", company="C", description="desc",
                  location=Location(display_name="Remote"))
        resume = Resume(raw_text="test")
        result = await matcher.match(job, resume)
        assert result.score.overall == 5.0
    await llm.close()
