import httpx
import pytest
import respx

from job_matcher_ai.domain.errors import ProviderAuthError
from job_matcher_ai.domain.models import JobSearchQuery
from job_matcher_ai.providers.adzuna_client import AdzunaProvider


@pytest.mark.asyncio
async def test_adzuna_init_no_credentials() -> None:
    with pytest.raises(ProviderAuthError):
        AdzunaProvider("", "")


@pytest.mark.asyncio
async def test_adzuna_search_success() -> None:
    with respx.mock:
        route = respx.get("https://api.adzuna.com/v1/api/jobs/gb/search/1").respond(
            200,
            json={
                "count": 2,
                "results": [
                    {
                        "id": "123",
                        "title": "Python Developer",
                        "company": {"display_name": "Tech GmbH"},
                        "description": "Great Python job",
                        "location": {"display_name": "Berlin", "area": ["Berlin"]},
                        "salary_min": 50000,
                        "salary_max": 70000,
                        "salary_currency": "EUR",
                        "redirect_url": "https://example.com/job",
                        "category": {"label": "IT Jobs"},
                        "contract_type": "permanent",
                    }
                ],
            },
        )
        provider = AdzunaProvider("test_id", "test_key")
        result = await provider.search(JobSearchQuery(keywords="python"))
        assert len(result.jobs) == 1
        assert result.jobs[0].title == "Python Developer"
        assert result.jobs[0].salary is not None
        assert result.jobs[0].salary.min == 50000
        assert route.called


@pytest.mark.asyncio
async def test_adzuna_search_http_error() -> None:
    with respx.mock:
        respx.get("https://api.adzuna.com/v1/api/jobs/gb/search/1").respond(500)
        provider = AdzunaProvider("test_id", "test_key")
        result = await provider.search(JobSearchQuery(keywords="python"))
        assert result.error is not None


@pytest.mark.asyncio
async def test_adzuna_search_auth_error() -> None:
    with respx.mock:
        respx.get("https://api.adzuna.com/v1/api/jobs/gb/search/1").respond(401)
        provider = AdzunaProvider("test_id", "test_key")
        with pytest.raises(ProviderAuthError):
            await provider.search(JobSearchQuery(keywords="python"))
