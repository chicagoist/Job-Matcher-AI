import pytest
import pytest_asyncio
from datetime import datetime, timedelta

from job_matcher_ai.domain.interfaces import ComplianceService, Storage
from job_matcher_ai.domain.models import AuditEntry, ConsentRecord
from job_matcher_ai.service.compliance import DefaultComplianceService
from job_matcher_ai.service.config import AppSettings
from job_matcher_ai.storage.sqlite_repo import SqliteStorage


@pytest_asyncio.fixture
async def storage(tmp_path):
    s = SqliteStorage(AppSettings(db_path=str(tmp_path / "compliance.db")))
    yield s
    await s.close()


@pytest_asyncio.fixture
async def compliance(storage: Storage):
    return DefaultComplianceService(storage)


@pytest.mark.asyncio
async def test_consent_grant(compliance: ComplianceService) -> None:
    record = await compliance.grant_consent("data_processing")
    assert record.is_valid is True


@pytest.mark.asyncio
async def test_consent_check_no_consent(compliance: ComplianceService) -> None:
    valid = await compliance.check_consent("data_processing")
    assert valid is False


@pytest.mark.asyncio
async def test_consent_full_lifecycle(compliance: ComplianceService) -> None:
    await compliance.grant_consent("data_processing")
    valid = await compliance.check_consent("data_processing")
    assert valid is True

    await compliance.revoke_consent("data_processing")
    valid = await compliance.check_consent("data_processing")
    assert valid is False


@pytest.mark.asyncio
async def test_consent_expiry(compliance: ComplianceService) -> None:
    await compliance.grant_consent("data_processing", expires_days=1)
    valid = await compliance.check_consent("data_processing")
    assert valid is True


@pytest.mark.asyncio
async def test_audit_logging(compliance: ComplianceService, storage: SqliteStorage) -> None:
    await compliance.log_audit("test.action", "test", "testing audit")
    entries = await storage.query_audit(category="test")
    assert len(entries) >= 1
    assert entries[0].action == "test.action"


@pytest.mark.asyncio
async def test_require_draft_review(compliance: ComplianceService) -> None:
    assert await compliance.require_draft_review() is True
