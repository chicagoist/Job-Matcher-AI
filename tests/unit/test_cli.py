import pytest
from typer.testing import CliRunner

from job_matcher_ai.cli.app import app

runner = CliRunner()


def test_cli_help() -> None:
    result = runner.invoke(app, ["--help"])
    assert result.exit_code == 0
    assert "legal-compliant" in result.stdout.lower() or "Usage" in result.stdout


def test_cli_consent_grant() -> None:
    result = runner.invoke(app, ["consent", "grant"])
    assert result.exit_code == 0 or "consent" in result.stdout


def test_cli_search_no_providers() -> None:
    result = runner.invoke(app, ["search", "python"])
    assert result.exit_code == 0 or "credentials" in result.stdout.lower()
