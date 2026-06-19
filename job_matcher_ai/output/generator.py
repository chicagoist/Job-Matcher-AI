from datetime import datetime

from job_matcher_ai.domain.interfaces import DraftGenerator
from job_matcher_ai.domain.models import Draft, MatchResult


class MarkdownDraftGenerator(DraftGenerator):
    async def generate(self, match: MatchResult, style: str = "professional") -> Draft:
        job = match.job
        score = match.score
        body_md = self._build_body(match, style)
        subject = f"Bewerbung als {job.title} bei {job.company}"

        return Draft(
            match=match,
            subject=subject,
            body_md=body_md,
            recipient_name="",
            recipient_email="",
            recipient_title=job.title,
            generated_at=datetime.now(),
        )

    def _build_body(self, match: MatchResult, style: str) -> str:
        job = match.job
        score = match.score
        lines = [
            f"# Bewerbung als {job.title}",
            "",
            f"**Unternehmen:** {job.company}",
            f"**Standort:** {job.location.display_name}",
            f"**Match Score:** {score.overall}/10  (Skills: {score.skills_match}/10, Erfahrung: {score.experience_match}/10)",
            "",
            "---",
            "",
            "## Anschreiben",
            "",
            f"Sehr geehrte Damen und Herren,",
            "",
            f"mit großem Interesse habe ich Ihre Stellenausschreibung für die Position als **{job.title}** bei {job.company} gelesen.",
            "",
        ]
        if match.matched_skills:
            lines.append(f"Meine Qualifikationen umfassen unter anderem: {', '.join(match.matched_skills)}.")
            lines.append("")
        if match.missing_skills:
            lines.append(f"")  # placeholder - user should fill in
            lines.append("")
        lines.extend([
            "Ich freue mich auf die Möglichkeit, mich persönlich vorstellen zu können.",
            "",
            "Mit freundlichen Grüßen,",
            "",
            "[Ihr Name]",
            "",
            "---",
            "",
            "> ⚠️ **DIES IST EIN ENTWURF** – Dieser Text wurde automatisch generiert und erfordert",
            "> eine manuelle Überprüfung vor dem Versand. Der Ersteller übernimmt keine Haftung",
            "> für die Richtigkeit oder Vollständigkeit des Inhalts.",
        ])
        return "\n".join(lines)
