import json
import re

import httpx

from job_matcher_ai.domain.errors import LLMError, LLMTimeoutError, ResumeParseError
from job_matcher_ai.domain.interfaces import LLMEngine, Matcher, ResumeParser
from job_matcher_ai.domain.models import (
    Education,
    Experience,
    Job,
    MatchResult,
    MatchScore,
    Resume,
    Skill,
)
from job_matcher_ai.service.config import AppSettings


class OllamaEngine(LLMEngine):
    def __init__(self, settings: AppSettings) -> None:
        self._base_url = settings.ollama_base_url.rstrip("/")
        self._model = settings.ollama_model
        self._timeout = settings.ollama_timeout
        self._http = httpx.AsyncClient(timeout=self._timeout)

    async def generate(
        self, prompt: str, system: str | None = None, **kwargs: str
    ) -> str:
        payload: dict = {
            "model": self._model,
            "prompt": prompt,
            "stream": False,
            **kwargs,
        }
        if system:
            payload["system"] = system

        try:
            resp = await self._http.post(f"{self._base_url}/api/generate", json=payload)
        except httpx.TimeoutException:
            raise LLMTimeoutError(self._model, self._timeout)

        if resp.status_code != 200:
            raise LLMError(self._model, f"HTTP {resp.status_code}: {resp.text[:200]}")

        data = resp.json()
        return data.get("response", "")

    async def generate_stream(self, prompt: str, system: str | None = None) -> "AsyncIterator[str]":
        self._raise_not_implemented()

    def _raise_not_implemented(self) -> None:
        raise NotImplementedError("Streaming not available in sync mode")

    async def close(self) -> None:
        await self._http.aclose()


class TextResumeParser(ResumeParser):
    async def parse(self, raw_text: str) -> Resume:
        if not raw_text.strip():
            raise ResumeParseError("Empty text provided")
        lines = [l.strip() for l in raw_text.split("\n") if l.strip()]
        title = lines[0] if lines else ""
        skills = self._extract_skills_from_text(raw_text)
        return Resume(
            raw_text=raw_text,
            title=title,
            skills=skills,
            yoe=self._estimate_yoe(raw_text),
        )

    async def extract_skills(self, resume: Resume) -> list[str]:
        return [s.name for s in resume.skills]

    def _extract_skills_from_text(self, text: str) -> list[Skill]:
        known_skills = [
            ("python", "Python"), ("javascript", "JavaScript"), ("typescript", "TypeScript"),
            ("java", "Java"), ("c++", "C++"), ("go", "Go"), ("rust", "Rust"),
            ("react", "React"), ("angular", "Angular"), ("vue", "Vue"), ("node", "Node.js"),
            ("django", "Django"), ("flask", "Flask"), ("spring", "Spring"),
            ("sql", "SQL"), ("postgresql", "PostgreSQL"), ("mysql", "MySQL"),
            ("mongodb", "MongoDB"), ("redis", "Redis"), ("docker", "Docker"),
            ("kubernetes", "Kubernetes"), ("aws", "AWS"), ("azure", "Azure"),
            ("gcp", "GCP"), ("git", "Git"), ("ci/cd", "CI/CD"), ("linux", "Linux"),
            ("machine learning", "Machine Learning"), ("deep learning", "Deep Learning"),
            ("nlp", "NLP"), ("data science", "Data Science"),
            ("api", "API"), ("rest", "REST"), ("graphql", "GraphQL"),
            ("html", "HTML"), ("css", "CSS"), ("sass", "Sass"),
            ("pytest", "pytest"), ("jest", "Jest"), ("selenium", "Selenium"),
            ("jenkins", "Jenkins"), ("terraform", "Terraform"),
            ("pandas", "pandas"), ("numpy", "NumPy"), ("tensorflow", "TensorFlow"),
            ("pytorch", "PyTorch"), ("scikit-learn", "scikit-learn"),
        ]
        text_lower = text.lower()
        found: list[Skill] = []
        seen: set[str] = set()
        for search_key, display_name in known_skills:
            pattern = re.compile(r"\b" + re.escape(search_key) + r"\b", re.IGNORECASE)
            if pattern.search(text_lower) and display_name not in seen:
                found.append(Skill(name=display_name, category="tech"))
                seen.add(display_name)
        return found

    def _estimate_yoe(self, text: str) -> float | None:
        patterns = [
            r"(\d+)\+?\s*years?\s*(?:of\s+)?experience",
            r"experience\s*(?:of\s+)?(\d+)\+?\s*years?",
            r"(\d+)\+?\s*yrs?\s*(?:of\s+)?exp",
        ]
        for pat in patterns:
            m = re.search(pat, text, re.IGNORECASE)
            if m:
                return float(m.group(1))
        return None


class LLMMatcher(Matcher):
    def __init__(self, llm: LLMEngine, settings: AppSettings) -> None:
        self._llm = llm

    async def match(self, job: Job, resume: Resume) -> MatchResult:
        prompt = self._build_match_prompt(job, resume)
        system = "You are an expert job matcher. Analyze the job description vs resume and return a JSON score."
        response = await self._llm.generate(prompt, system=system)
        result = self._parse_match_response(response, job, resume)
        return result

    async def explain(self, result: MatchResult) -> str:
        prompt = f"Explain why this match scored {result.score.overall}/10:\n{result.reasoning}"
        return await self._llm.generate(prompt)

    def _build_match_prompt(self, job: Job, resume: Resume) -> str:
        return f"""Job Title: {job.title}
Company: {job.company}
Description: {job.description[:2000]}

Resume: {resume.raw_text[:2000]}

Return JSON with fields:
- overall (0-10)
- skills_match (0-10)
- experience_match (0-10)
- matched_skills: list of strings
- missing_skills: list of strings
- reasoning: string
No other text."""

    def _parse_match_response(
        self, response: str, job: Job, resume: Resume
    ) -> MatchResult:
        try:
            json_str = response.strip()
            if "```" in json_str:
                json_str = json_str.split("```")[1]
                if json_str.startswith("json"):
                    json_str = json_str[4:]
            data = json.loads(json_str)
        except (json.JSONDecodeError, IndexError):
            return MatchResult(
                job=job,
                resume=resume,
                score=MatchScore(overall=5.0, skills_match=5.0, experience_match=5.0),
                reasoning="Failed to parse LLM response as JSON",
                explanation=response[:500],
            )
        score = MatchScore(
            overall=float(data.get("overall", 5)),
            skills_match=float(data.get("skills_match", 5)),
            experience_match=float(data.get("experience_match", 5)),
        )
        return MatchResult(
            job=job,
            resume=resume,
            score=score,
            matched_skills=data.get("matched_skills", []),
            missing_skills=data.get("missing_skills", []),
            reasoning=data.get("reasoning", ""),
        )
