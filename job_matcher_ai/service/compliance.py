from datetime import datetime, timedelta

from job_matcher_ai.domain.errors import ComplianceError
from job_matcher_ai.domain.interfaces import ComplianceService, Storage
from job_matcher_ai.domain.models import AuditEntry, ConsentRecord


class DefaultComplianceService(ComplianceService):
    def __init__(self, storage: Storage) -> None:
        self._storage = storage

    async def check_consent(self, purpose: str, user_id: str = "default") -> bool:
        record = await self._storage.get_consent(user_id)
        if record is None:
            return False
        return record.is_valid

    async def grant_consent(
        self, purpose: str, user_id: str = "default", expires_days: int | None = None
    ) -> ConsentRecord:
        expires_at = None
        if expires_days:
            expires_at = datetime.now() + timedelta(days=expires_days)
        record = ConsentRecord(
            user_id=user_id,
            consent_type=purpose,
            expires_at=expires_at,
        )
        await self._storage.store_consent(record)
        await self._log_audit("consent.grant", "compliance", f"Consent granted for '{purpose}'")
        return record

    async def revoke_consent(self, purpose: str, user_id: str = "default") -> None:
        record = await self._storage.get_consent(user_id)
        if record and record.is_valid:
            record.revoked_at = datetime.now()
            await self._storage.store_consent(record)
            await self._log_audit("consent.revoke", "compliance", f"Consent revoked for '{purpose}'")

    async def log_audit(
        self,
        action: str,
        category: str,
        details: str = "",
        success: bool = True,
        duration_ms: int | None = None,
    ) -> None:
        await self._log_audit(action, category, details, success, duration_ms)

    async def _log_audit(
        self,
        action: str,
        category: str,
        details: str = "",
        success: bool = True,
        duration_ms: int | None = None,
    ) -> None:
        entry = AuditEntry(
            action=action,
            category=category,
            details=details,
            success=success,
            duration_ms=duration_ms,
        )
        await self._storage.append_audit(entry)

    async def require_draft_review(self) -> bool:
        return True
