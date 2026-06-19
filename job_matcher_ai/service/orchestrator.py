import time

from job_matcher_ai.domain.interfaces import ComplianceService, DraftGenerator, JobProvider, Matcher, ResumeParser, Storage
from job_matcher_ai.domain.models import Draft, Job, JobSearchQuery, MatchResult, Resume, SearchResult


class SearchOrchestrator:
    def __init__(self, providers: list[JobProvider], storage: Storage, compliance: ComplianceService) -> None:
        self._providers = providers
        self._storage = storage
        self._compliance = compliance

    async def search(self, query: JobSearchQuery) -> SearchResult:
        if not await self._compliance.check_consent("job_search"):
            raise PermissionError("No consent granted for job search. Run `job-matcher consent grant` first.")

        combined = SearchResult(provider="combined")
        for provider in self._providers:
            try:
                result = await provider.search(query)
                combined.jobs.extend(result.jobs)
                combined.total += result.total
            except Exception as e:
                combined.error = str(e)
        for job in combined.jobs:
            try:
                await self._storage.save_job(job)
            except Exception:
                pass
        await self._compliance.log_audit(
            action="search", category="job_search",
            details=f"Searched '{query.keywords}' in {query.location}",
            duration_ms=0,
        )
        return combined


class MatchOrchestrator:
    def __init__(
        self, matcher: Matcher, parser: ResumeParser, storage: Storage, compliance: ComplianceService
    ) -> None:
        self._matcher = matcher
        self._parser = parser
        self._storage = storage
        self._compliance = compliance

    async def match_job(self, job: Job, resume_text: str) -> MatchResult:
        if not await self._compliance.check_consent("resume_analysis"):
            raise PermissionError("No consent for resume analysis.")

        resume = await self._parser.parse(resume_text)
        rid = await self._storage.save_resume(resume)
        resume.id = rid
        result = await self._matcher.match(job, resume)
        await self._storage.save_match(result)
        await self._compliance.log_audit(
            action="match", category="matching",
            details=f"Matched {job.title} @ {job.company} ({result.score.overall}/10)",
        )
        return result

    async def match_search_results(self, results: SearchResult, resume_text: str) -> list[MatchResult]:
        matches: list[MatchResult] = []
        for job in results.jobs:
            try:
                result = await self.match_job(job, resume_text)
                matches.append(result)
            except Exception:
                continue
        return matches


class DraftOrchestrator:
    def __init__(
        self, generator: DraftGenerator, storage: Storage, compliance: ComplianceService
    ) -> None:
        self._generator = generator
        self._storage = storage
        self._compliance = compliance

    async def create_draft(self, match: MatchResult, style: str = "professional") -> Draft:
        draft = await self._generator.generate(match, style=style)
        match_id = await self._storage.save_match(match)
        await self._storage.save_draft(draft, match_id=match_id)
        await self._compliance.log_audit(
            action="draft.create", category="draft",
            details=f"Created draft for {match.job.title} @ {match.job.company} ({style})",
        )
        return draft

    async def list_drafts(self) -> list[Draft]:
        return list(await self._storage.get_drafts())


class SearchAndMatchPipeline:
    def __init__(
        self,
        search: SearchOrchestrator,
        matcher: MatchOrchestrator,
        drafts: DraftOrchestrator,
    ) -> None:
        self._search = search
        self._matcher = matcher
        self._drafts = drafts

    async def run(
        self, query: JobSearchQuery, resume_text: str, draft_style: str = "professional"
    ) -> list[Draft]:
        results = await self._search.search(query)
        matches = await self._matcher.match_search_results(results, resume_text)
        drafts: list[Draft] = []
        for match in matches:
            if match.score.overall >= 5.0:
                draft = await self._drafts.create_draft(match, style=draft_style)
                drafts.append(draft)
        return drafts
