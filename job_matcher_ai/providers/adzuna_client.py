from collections.abc import Mapping

import httpx

from job_matcher_ai.domain.errors import ProviderAuthError, ProviderError, ProviderRateLimitError
from job_matcher_ai.domain.interfaces import JobProvider
from job_matcher_ai.domain.models import (
    Job,
    JobSearchQuery,
    JobType,
    Location,
    Salary,
    SalaryPeriod,
    SearchResult,
)


class AdzunaProvider(JobProvider):
    BASE_URL = "https://api.adzuna.com/v1/api/jobs"

    def __init__(self, app_id: str, api_key: str, http_client: httpx.AsyncClient | None = None) -> None:
        if not app_id or not api_key:
            raise ProviderAuthError("adzuna", "APP_ID and API_KEY are required")
        self._app_id = app_id
        self._api_key = api_key
        self._http = http_client or httpx.AsyncClient(timeout=30.0)

    @property
    def provider_name(self) -> str:
        return "adzuna"

    async def search(self, query: JobSearchQuery) -> SearchResult:
        country = query.country or "gb"
        url = f"{self.BASE_URL}/{country}/search/{query.page}"
        params: dict[str, str | int] = {
            "app_id": self._app_id,
            "app_key": self._api_key,
            "results_per_page": query.results_per_page,
            "content-type": "application/json",
        }
        if query.keywords:
            params["what"] = query.keywords
        if query.location:
            params["where"] = query.location
        if query.salary_min is not None:
            params["salary_min"] = int(query.salary_min)
        if query.max_days_old:
            params["max_days_old"] = query.max_days_old
        if query.remote_only:
            params["remote"] = 1
        if query.sort_by:
            params["sort_by"] = query.sort_by

        try:
            resp = await self._http.get(url, params=params)
        except httpx.TimeoutException:
            return SearchResult(provider=self.provider_name, error="Request timed out")

        if resp.status_code == 401:
            raise ProviderAuthError("adzuna")
        if resp.status_code == 429:
            raise ProviderRateLimitError("adzuna")
        if resp.status_code >= 400:
            return SearchResult(
                provider=self.provider_name,
                error=f"HTTP {resp.status_code}: {resp.text[:200]}",
            )

        data = resp.json()
        jobs = [self._parse_adzuna_job(item) for item in data.get("results", [])]
        return SearchResult(
            jobs=jobs,
            total=data.get("count", len(jobs)),
            page=query.page,
            provider=self.provider_name,
            query=query,
        )

    async def get_job(self, job_id: str) -> Job | None:
        return None

    def _parse_adzuna_job(self, item: Mapping) -> Job:
        loc_data = item.get("location", {}) or {}
        area = loc_data.get("area", []) if isinstance(loc_data, dict) else []
        loc = Location(
            display_name=loc_data.get("display_name", "") if isinstance(loc_data, dict) else str(loc_data),
            area=list(area) if isinstance(area, list | tuple) else [],
            latitude=loc_data.get("latitude"),
            longitude=loc_data.get("longitude"),
        )

        sal = None
        salary_min = item.get("salary_min")
        salary_max = item.get("salary_max")
        if salary_min is not None or salary_max is not None:
            sal = Salary(
                min=float(salary_min) if salary_min is not None else None,
                max=float(salary_max) if salary_max is not None else None,
                currency=item.get("salary_currency", "EUR") or "EUR",
                is_estimated=item.get("salary_is_predicted", "0") == "1",
            )

        contract_type = item.get("contract_type", "")
        job_type_map = {
            "permanent": JobType.PERMANENT,
            "contract": JobType.CONTRACT,
            "part_time": JobType.PART_TIME,
            "full_time": JobType.FULL_TIME,
            "internship": JobType.INTERNSHIP,
        }

        return Job(
            id=f"adzuna_{item.get('id', '')}",
            provider=self.provider_name,
            title=item.get("title", ""),
            company=item.get("company", {}).get("display_name", "") if isinstance(item.get("company"), dict) else "",
            description=item.get("description", ""),
            location=loc,
            salary=sal,
            url=item.get("redirect_url", ""),
            category=item.get("category", {}).get("label", "") if isinstance(item.get("category"), dict) else "",
            job_type=job_type_map.get(contract_type),
        )
