import asyncio
import sys
from typing import Optional

import typer
from rich.console import Console
from rich.table import Table

from job_matcher_ai.domain.models import JobSearchQuery
from job_matcher_ai.service.config import AppSettings, EnvConfigProvider

app = typer.Typer(
    name="job-matcher",
    help="Legal-compliant AI job matching assistant — draft-only, local LLM, official job APIs.",
)
console = Console()


@app.callback()
def callback() -> None:
    pass


def _build_container() -> tuple:
    from job_matcher_ai.providers.adzuna_client import AdzunaProvider
    from job_matcher_ai.providers.indeed_client import IndeedPartnerProvider
    from job_matcher_ai.ai.ollama_engine import OllamaEngine, TextResumeParser, LLMMatcher
    from job_matcher_ai.output.generator import MarkdownDraftGenerator
    from job_matcher_ai.storage.sqlite_repo import SqliteStorage
    from job_matcher_ai.service.compliance import DefaultComplianceService
    from job_matcher_ai.service.orchestrator import SearchOrchestrator, MatchOrchestrator, DraftOrchestrator, SearchAndMatchPipeline

    config_provider = EnvConfigProvider()
    settings = AppSettings.from_env(config_provider)
    storage = SqliteStorage(settings)
    compliance = DefaultComplianceService(storage)

    providers: list = []
    if settings.adzuna_app_id and settings.adzuna_api_key:
        providers.append(AdzunaProvider(settings.adzuna_app_id, settings.adzuna_api_key))
    else:
        console.print("[yellow]Adzuna credentials not configured. Set ADZUNA_APP_ID and ADZUNA_API_KEY.[/yellow]")

    ollama = OllamaEngine(settings)
    parser = TextResumeParser()
    matcher = LLMMatcher(ollama, settings)
    generator = MarkdownDraftGenerator()

    search_orch = SearchOrchestrator(providers, storage, compliance)
    match_orch = MatchOrchestrator(matcher, parser, storage, compliance)
    draft_orch = DraftOrchestrator(generator, storage, compliance)
    pipeline = SearchAndMatchPipeline(search_orch, match_orch, draft_orch)

    return settings, storage, compliance, pipeline, search_orch, draft_orch, ollama


@app.command()
def search(
    keywords: str = typer.Argument(..., help="Job keywords"),
    location: str = typer.Option("", "--location", "-l", help="Location"),
    country: str = typer.Option("gb", "--country", "-c", help="Country code"),
    results: int = typer.Option(10, "--results", "-n", help="Number of results"),
    remote: bool = typer.Option(False, "--remote", "-r", help="Remote only"),
) -> None:
    """Search for jobs using configured providers."""
    settings, storage, compliance, pipeline, search_orch, draft_orch, ollama = _build_container()

    async def run() -> None:
        query = JobSearchQuery(keywords=keywords, location=location, country=country, results_per_page=results, remote_only=remote)
        try:
            result = await search_orch.search(query)
        except PermissionError as e:
            console.print(f"[red]{e}[/red]")
            console.print("Run: [bold]job-matcher consent grant[/bold]")
            return

        table = Table(title=f"Jobs: {keywords} ({len(result.jobs)} found)")
        table.add_column("ID", style="dim")
        table.add_column("Title")
        table.add_column("Company")
        table.add_column("Location")
        for job in result.jobs[:results]:
            table.add_row(job.id, job.title, job.company, job.location.display_name)
        console.print(table)
        await storage.close()
        await ollama.close()

    asyncio.run(run())


@app.command()
def match(
    job_id: str = typer.Argument(..., help="Job ID to match against"),
    resume: str = typer.Option("", "--resume", "-r", help="Path to resume file or raw text"),
) -> None:
    """Match a resume against a specific job."""
    settings, storage, compliance, pipeline, search_orch, draft_orch, ollama = _build_container()

    async def run() -> None:
        job = await storage.get_job(job_id)
        if not job:
            console.print(f"[red]Job '{job_id}' not found. Run search first.[/red]")
            return

        resume_text = resume
        if not resume_text:
            console.print("[yellow]No resume provided. Using placeholder.[/yellow]")
            resume_text = "Experienced professional with relevant skills."

        try:
            result = await pipeline._matcher.match_job(job, resume_text)
        except PermissionError as e:
            console.print(f"[red]{e}[/red]")
            return

        console.print(f"[bold]Match Score:[/bold] {result.score.overall}/10")
        console.print(f"  Skills: {result.score.skills_match}/10  |  Experience: {result.score.experience_match}/10")
        if result.matched_skills:
            console.print(f"[green]✓ Matched:[/green] {', '.join(result.matched_skills)}")
        if result.missing_skills:
            console.print(f"[red]✗ Missing:[/red] {', '.join(result.missing_skills)}")
        console.print(f"\n[bold]Reasoning:[/bold] {result.reasoning[:500]}")
        await storage.close()
        await ollama.close()

    asyncio.run(run())


@app.command()
def draft(
    job_id: str = typer.Argument(..., help="Job ID to create draft for"),
    style: str = typer.Option("professional", "--style", "-s", help="Writing style"),
    resume: str = typer.Option("", "--resume", "-r", help="Resume text"),
) -> None:
    """Generate a draft application for a job (manual review required)."""
    settings, storage, compliance, pipeline, search_orch, draft_orch, ollama = _build_container()

    async def run() -> None:
        job = await storage.get_job(job_id)
        if not job:
            console.print(f"[red]Job '{job_id}' not found.[/red]")
            return

        resume_text = resume or "Experienced professional."
        result = await pipeline._matcher.match_job(job, resume_text)
        d = await draft_orch.create_draft(result, style=style)
        console.print(f"[bold]Subject:[/bold] {d.subject}")
        console.print("")
        console.print(d.body_md)
        console.print("\n[red]⚠️  DRAFT MODE — Must be manually reviewed before use.[/red]")
        await storage.close()
        await ollama.close()

    asyncio.run(run())


@app.command()
def consent(
    action: str = typer.Argument(..., help="Action: grant, revoke, status"),
    purpose: str = typer.Option("data_processing", "--purpose", "-p", help="Consent purpose"),
    days: Optional[int] = typer.Option(None, "--days", "-d", help="Consent expiry in days"),
) -> None:
    """Manage GDPR consent."""
    settings, storage, compliance, pipeline, search_orch, draft_orch, ollama = _build_container()

    async def run() -> None:
        if action == "grant":
            await compliance.grant_consent(purpose, expires_days=days)
            console.print(f"[green]✓ Consent granted for '{purpose}'.[/green]")
        elif action == "revoke":
            await compliance.revoke_consent(purpose)
            console.print(f"[yellow]✗ Consent revoked for '{purpose}'.[/yellow]")
        elif action == "status":
            valid = await compliance.check_consent(purpose)
            console.print(f"Consent for '{purpose}': {'[green]Active[/green]' if valid else '[red]Not granted or revoked[/red]'}")
        else:
            console.print(f"[red]Unknown action: {action}. Use: grant, revoke, status[/red]")
        await storage.close()

    asyncio.run(run())


@app.command()
def audit(
    category: Optional[str] = typer.Option(None, "--category", "-c", help="Filter by category"),
    limit: int = typer.Option(20, "--limit", "-n", help="Number of entries"),
) -> None:
    """View audit log entries."""
    settings, storage, compliance, pipeline, search_orch, draft_orch, ollama = _build_container()

    async def run() -> None:
        entries = await storage.query_audit(category=category, limit=limit)
        table = Table(title="Audit Log")
        table.add_column("Timestamp", style="dim")
        table.add_column("Action")
        table.add_column("Category")
        table.add_column("Details")
        for e in entries:
            ts = e.timestamp.strftime("%Y-%m-%d %H:%M") if e.timestamp else ""
            table.add_row(ts, e.action, e.category, e.details[:60])
        console.print(table)
        await storage.close()

    asyncio.run(run())


@app.command()
def drafts(
    limit: int = typer.Option(10, "--limit", "-n", help="Number of drafts"),
) -> None:
    """List saved drafts."""
    settings, storage, compliance, pipeline, search_orch, draft_orch, ollama = _build_container()

    async def run() -> None:
        d_list = await draft_orch.list_drafts()
        table = Table(title="Saved Drafts")
        table.add_column("Subject")
        table.add_column("Generated")
        table.add_column("Reviewed")
        for d in d_list[:limit]:
            ts = d.generated_at.strftime("%Y-%m-%d %H:%M") if d.generated_at else ""
            table.add_row(d.subject, ts, "[green]Yes[/green]" if d.reviewed else "[red]No[/red]")
        console.print(table)
        await storage.close()

    asyncio.run(run())


if __name__ == "__main__":
    app()
