import httpx

from job_matcher_ai.domain.errors import ProviderAuthError, ProviderError, ProviderRateLimitError
from job_matcher_ai.domain.interfaces import JobProvider
from job_matcher_ai.domain.models import Job, JobSearchQuery, Location, SearchResult


class IndeedPartnerProvider(JobProvider):
    BASE_URL = "https://apis.indeed.com/v2"

    def __init__(self, api_key: str, http_client: httpx.AsyncClient | None = None) -> None:
        if not api_key:
            raise ProviderAuthError("indeed", "API_KEY is required")
        self._api_key = api_key
        self._http = http_client or httpx.AsyncClient(timeout=30.0)

    @property
    def provider_name(self) -> str:
        return "indeed"

    async def search(self, query: JobSearchQuery) -> SearchResult:
        url = f"{self.BASE_URL}/search"
        headers = {
            "Authorization": f"Bearer {self._api_key}",
            "Content-Type": "application/json",
        }
        payload = {
            "query": query.keywords or "",
            "location": query.location or "",
            "page": query.page,
            "resultsPerPage": min(query.results_per_page, 50),
            "sort": query.sort_by or "relevance",
        }
        if query.remote_only:
            payload["remoteOnly"] = True

        try:
            resp = await self._http.post(url, headers=headers, json=payload)
        except httpx.TimeoutException:
            return SearchResult(provider=self.provider_name, error="Request timed out")

        if resp.status_code == 401:
            raise ProviderAuthError("indeed")
        if resp.status_code == 429:
            raise ProviderRateLimitError("indeed")
        if resp.status_code >= 400:
            raise ProviderError("indeed", resp.status_code, resp.text[:200])

        data = resp.json()
        jobs = [self._parse_indeed_job(item) for item in data.get("results", [])]
        return SearchResult(
            jobs=jobs,
            total=data.get("totalResults", len(jobs)),
            page=query.page,
            provider=self.provider_name,
            query=query,
        )

    async def get_job(self, job_id: str) -> Job | None:
        return None

    def _parse_indeed_job(self, item: dict) -> Job:
        loc = Location(
            display_name=item.get("location", {}).get("displayName", ""),
            country=item.get("location", {}).get("countryCode", ""),
            is_remote=item.get("isRemote", False),
        )
        return Job(
            id=f"indeed_{item.get('id', '')}",
            provider=self.provider_name,
            title=item.get("title", ""),
            company=item.get("company", ""),
            description=item.get("snippet", ""),
            location=loc,
            url=item.get("url", ""),
        )
