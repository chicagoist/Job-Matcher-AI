import json
import uuid
from collections.abc import Sequence
from datetime import datetime
from pathlib import Path

import aiosqlite

from job_matcher_ai.domain.errors import JobMatcherError
from job_matcher_ai.domain.interfaces import Storage
from job_matcher_ai.domain.models import (
    AuditEntry,
    ConsentRecord,
    Draft,
    Job,
    Location,
    MatchResult,
    MatchScore,
    Resume,
    Salary,
    SalaryPeriod,
)
from job_matcher_ai.service.config import AppSettings


class SqliteStorage(Storage):
    def __init__(self, settings: AppSettings) -> None:
        db_path = settings.db_path.replace("~", str(Path.home()))
        self._path = Path(db_path)
        self._conn: aiosqlite.Connection | None = None

    async def _connect(self) -> aiosqlite.Connection:
        if self._conn is None:
            self._path.parent.mkdir(parents=True, exist_ok=True)
            self._conn = await aiosqlite.connect(str(self._path))
            self._conn.row_factory = aiosqlite.Row
            await self._conn.execute("PRAGMA journal_mode=WAL")
            await self._conn.execute("PRAGMA foreign_keys=ON")
        return self._conn

    async def _ensure_schema(self) -> None:
        conn = await self._connect()
        await conn.executescript("""
            CREATE TABLE IF NOT EXISTS jobs (
                id TEXT PRIMARY KEY,
                provider TEXT NOT NULL,
                title TEXT NOT NULL,
                company TEXT NOT NULL,
                description TEXT NOT NULL,
                location_json TEXT NOT NULL DEFAULT '{}',
                salary_json TEXT,
                url TEXT NOT NULL DEFAULT '',
                posted_at TEXT,
                job_type TEXT,
                category TEXT NOT NULL DEFAULT '',
                tags_json TEXT NOT NULL DEFAULT '[]',
                created_at TEXT NOT NULL DEFAULT (datetime('now'))
            );
            CREATE TABLE IF NOT EXISTS resumes (
                id TEXT PRIMARY KEY,
                raw_text TEXT NOT NULL,
                parsed_json TEXT NOT NULL DEFAULT '{}',
                created_at TEXT NOT NULL DEFAULT (datetime('now'))
            );
            CREATE TABLE IF NOT EXISTS matches (
                id TEXT PRIMARY KEY,
                job_id TEXT NOT NULL,
                resume_id TEXT NOT NULL,
                score_json TEXT NOT NULL,
                matched_skills_json TEXT NOT NULL DEFAULT '[]',
                missing_skills_json TEXT NOT NULL DEFAULT '[]',
                reasoning TEXT NOT NULL DEFAULT '',
                explanation TEXT NOT NULL DEFAULT '',
                generated_at TEXT NOT NULL,
                requires_human_review INTEGER NOT NULL DEFAULT 1,
                created_at TEXT NOT NULL DEFAULT (datetime('now')),
                FOREIGN KEY (job_id) REFERENCES jobs(id),
                FOREIGN KEY (resume_id) REFERENCES resumes(id)
            );
            CREATE TABLE IF NOT EXISTS drafts (
                id TEXT PRIMARY KEY,
                match_id TEXT NOT NULL,
                subject TEXT NOT NULL DEFAULT '',
                body_md TEXT NOT NULL DEFAULT '',
                recipient_name TEXT NOT NULL DEFAULT '',
                recipient_email TEXT NOT NULL DEFAULT '',
                recipient_title TEXT NOT NULL DEFAULT '',
                generated_at TEXT NOT NULL,
                requires_manual_review INTEGER NOT NULL DEFAULT 1,
                reviewed INTEGER NOT NULL DEFAULT 0,
                created_at TEXT NOT NULL DEFAULT (datetime('now')),
                FOREIGN KEY (match_id) REFERENCES matches(id)
            );
            CREATE TABLE IF NOT EXISTS consents (
                id TEXT PRIMARY KEY,
                user_id TEXT NOT NULL,
                consent_type TEXT NOT NULL,
                granted_at TEXT NOT NULL,
                expires_at TEXT,
                revoked_at TEXT,
                version TEXT NOT NULL DEFAULT '1.0',
                ip_address TEXT NOT NULL DEFAULT '',
                user_agent TEXT NOT NULL DEFAULT ''
            );
            CREATE TABLE IF NOT EXISTS audit_log (
                id TEXT PRIMARY KEY,
                timestamp TEXT NOT NULL,
                action TEXT NOT NULL,
                category TEXT NOT NULL,
                details TEXT NOT NULL DEFAULT '',
                user_id TEXT NOT NULL DEFAULT 'default',
                ip_address TEXT NOT NULL DEFAULT '',
                duration_ms INTEGER,
                success INTEGER NOT NULL DEFAULT 1
            );
        """)
        await conn.commit()

    async def save_job(self, job: Job) -> None:
        await self._ensure_schema()
        conn = await self._connect()
        await conn.execute(
            """INSERT OR REPLACE INTO jobs
               (id, provider, title, company, description, location_json, salary_json,
                url, posted_at, job_type, category, tags_json)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
            (
                job.id,
                job.provider,
                job.title,
                job.company,
                job.description,
                job.location.model_dump_json(),
                job.salary.model_dump_json() if job.salary else None,
                job.url,
                job.posted_at.isoformat() if job.posted_at else None,
                job.job_type.value if job.job_type else None,
                job.category,
                json.dumps(job.tags),
            ),
        )
        await conn.commit()

    async def save_match(self, result: MatchResult) -> str:
        await self._ensure_schema()
        conn = await self._connect()
        match_id = str(uuid.uuid4())
        await conn.execute(
            """INSERT OR REPLACE INTO matches
               (id, job_id, resume_id, score_json, matched_skills_json,
                missing_skills_json, reasoning, explanation, generated_at,
                requires_human_review)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
            (
                match_id,
                result.job.id,
                result.resume.id,
                result.score.model_dump_json(),
                json.dumps(result.matched_skills),
                json.dumps(result.missing_skills),
                result.reasoning,
                result.explanation,
                result.generated_at.isoformat(),
                1,
            ),
        )
        await conn.commit()
        return match_id

    async def save_draft(self, draft: Draft, match_id: str | None = None) -> str:
        await self._ensure_schema()
        conn = await self._connect()
        draft_id = str(uuid.uuid4())
        mid = match_id or ""
        await conn.execute(
            """INSERT OR REPLACE INTO drafts
               (id, match_id, subject, body_md, recipient_name,
                recipient_email, recipient_title, generated_at,
                requires_manual_review, reviewed)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
            (
                draft_id,
                mid,
                draft.subject,
                draft.body_md,
                draft.recipient_name,
                draft.recipient_email,
                draft.recipient_title,
                draft.generated_at.isoformat(),
                1,
                0,
            ),
        )
        await conn.commit()
        return draft_id

    async def save_resume(self, resume: Resume) -> str:
        await self._ensure_schema()
        conn = await self._connect()
        rid = resume.id or str(uuid.uuid4())
        await conn.execute(
            """INSERT OR REPLACE INTO resumes
               (id, raw_text, parsed_json)
               VALUES (?, ?, ?)""",
            (
                rid,
                resume.raw_text,
                resume.model_dump_json(exclude={"raw_text"}),
            ),
        )
        await conn.commit()
        return rid

    async def get_job(self, job_id: str) -> Job | None:
        await self._ensure_schema()
        conn = await self._connect()
        async with conn.execute("SELECT * FROM jobs WHERE id = ?", (job_id,)) as cur:
            row = await cur.fetchone()
        if row is None:
            return None
        return self._row_to_job(row)

    async def get_recent_jobs(self, limit: int = 50) -> Sequence[Job]:
        await self._ensure_schema()
        conn = await self._connect()
        async with conn.execute(
            "SELECT * FROM jobs ORDER BY created_at DESC LIMIT ?", (limit,)
        ) as cur:
            rows = await cur.fetchall()
        return [self._row_to_job(r) for r in rows]

    async def get_drafts(self, limit: int = 20) -> Sequence[Draft]:
        await self._ensure_schema()
        conn = await self._connect()
        async with conn.execute(
            """SELECT d.*, j.id as jid, j.title as jtitle, j.company as jcompany,
                      j.description as jdesc, j.location_json,
                      j.salary_json, j.provider, j.url, j.job_type, j.category
               FROM drafts d
               LEFT JOIN matches m ON m.id = d.match_id
               LEFT JOIN jobs j ON j.id = m.job_id
               ORDER BY d.created_at DESC LIMIT ?""",
            (limit,),
        ) as cur:
            rows = await cur.fetchall()
        return [self._row_to_draft(r) for r in rows]

    async def store_consent(self, record: ConsentRecord) -> None:
        await self._ensure_schema()
        conn = await self._connect()
        cid = record.id or str(uuid.uuid4())
        await conn.execute(
            """INSERT OR REPLACE INTO consents
               (id, user_id, consent_type, granted_at, expires_at, revoked_at,
                version, ip_address, user_agent)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)""",
            (
                cid,
                record.user_id,
                record.consent_type,
                record.granted_at.isoformat(),
                record.expires_at.isoformat() if record.expires_at else None,
                record.revoked_at.isoformat() if record.revoked_at else None,
                record.version,
                record.ip_address,
                record.user_agent,
            ),
        )
        await conn.commit()

    async def get_consent(self, user_id: str) -> ConsentRecord | None:
        await self._ensure_schema()
        conn = await self._connect()
        async with conn.execute(
            "SELECT * FROM consents WHERE user_id = ? ORDER BY granted_at DESC LIMIT 1",
            (user_id,),
        ) as cur:
            row = await cur.fetchone()
        if row is None:
            return None
        return ConsentRecord(
            id=row["id"],
            user_id=row["user_id"],
            consent_type=row["consent_type"],
            granted_at=datetime.fromisoformat(row["granted_at"]),
            expires_at=datetime.fromisoformat(row["expires_at"]) if row["expires_at"] else None,
            revoked_at=datetime.fromisoformat(row["revoked_at"]) if row["revoked_at"] else None,
            version=row["version"],
            ip_address=row["ip_address"],
            user_agent=row["user_agent"],
        )

    async def append_audit(self, entry: AuditEntry) -> None:
        await self._ensure_schema()
        conn = await self._connect()
        eid = entry.id or str(uuid.uuid4())
        await conn.execute(
            """INSERT INTO audit_log
               (id, timestamp, action, category, details, user_id, ip_address, duration_ms, success)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)""",
            (
                eid,
                entry.timestamp.isoformat(),
                entry.action,
                entry.category,
                entry.details,
                entry.user_id,
                entry.ip_address,
                entry.duration_ms,
                1 if entry.success else 0,
            ),
        )
        await conn.commit()

    async def query_audit(
        self, category: str | None = None, action: str | None = None, limit: int = 100
    ) -> Sequence[AuditEntry]:
        await self._ensure_schema()
        conn = await self._connect()
        parts: list[str] = []
        params: list[str] = []
        if category:
            parts.append("category = ?")
            params.append(category)
        if action:
            parts.append("action = ?")
            params.append(action)
        where = "WHERE " + " AND ".join(parts) if parts else ""
        sql = f"SELECT * FROM audit_log {where} ORDER BY timestamp DESC LIMIT ?"
        params.append(str(limit))
        async with conn.execute(sql, params) as cur:
            rows = await cur.fetchall()
        return [
            AuditEntry(
                id=r["id"],
                timestamp=datetime.fromisoformat(r["timestamp"]),
                action=r["action"],
                category=r["category"],
                details=r["details"],
                user_id=r["user_id"],
                ip_address=r["ip_address"],
                duration_ms=r["duration_ms"],
                success=bool(r["success"]),
            )
            for r in rows
        ]

    async def close(self) -> None:
        if self._conn:
            await self._conn.close()
            self._conn = None

    @staticmethod
    def _row_to_job(row: aiosqlite.Row) -> Job:
        loc = json.loads(row["location_json"] or "{}")
        sal_raw = row["salary_json"]
        sal = json.loads(sal_raw) if sal_raw else None
        return Job(
            id=row["id"],
            provider=row["provider"],
            title=row["title"],
            company=row["company"],
            description=row["description"],
            location=Location(**loc),
            salary=Salary(**sal) if sal else None,
            url=row["url"] or "",
            posted_at=datetime.fromisoformat(row["posted_at"]) if row["posted_at"] else None,
            job_type=row["job_type"],
            category=row["category"] or "",
            tags=json.loads(row["tags_json"] or "[]"),
        )

    @staticmethod
    def _row_to_draft(row: aiosqlite.Row) -> Draft:
        loc = json.loads(row["location_json"] or "{}")
        sal_raw = row["salary_json"]
        sal = json.loads(sal_raw) if sal_raw else None
        job = Job(
            id=row["jid"],
            provider=row["provider"],
            title=row["jtitle"],
            company=row["jcompany"],
            description=row["jdesc"],
            location=Location(**loc),
            salary=Salary(**sal) if sal else None,
            url=row["url"] or "",
            job_type=row["job_type"],
            category=row["category"] or "",
        )
        match = MatchResult(
            job=job,
            resume=Resume(raw_text=""),
            score=MatchScore(overall=0, skills_match=0, experience_match=0),
        )
        return Draft(
            match=match,
            subject=row["subject"],
            body_md=row["body_md"],
            recipient_name=row["recipient_name"],
            recipient_email=row["recipient_email"],
            recipient_title=row["recipient_title"],
            generated_at=datetime.fromisoformat(row["generated_at"]),
            reviewed=bool(row["reviewed"]),
        )
