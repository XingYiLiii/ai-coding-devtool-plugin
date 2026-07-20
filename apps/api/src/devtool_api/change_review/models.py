"""Domain models for the Change Review workflow."""

from typing import Literal

from pydantic import Field

from devtool_api.llm.structured_output import StructuredOutput


class ChangeReviewRequest(StructuredOutput):
    """A caller-provided diff and optional contextual summary."""

    diff: str = Field(min_length=1)
    context: str | None = Field(default=None, min_length=1)


class ChangeReviewFinding(StructuredOutput):
    """One evidence-backed issue identified in a caller-provided diff."""

    severity: Literal["low", "medium", "high", "critical"]
    file: str = Field(min_length=1)
    line: int = Field(ge=1)
    problem: str = Field(min_length=1)
    evidence: str = Field(min_length=1)
    suggestion: str = Field(min_length=1)


class ChangeReviewResult(StructuredOutput):
    """A structured review that may legitimately contain no findings."""

    summary: str
    findings: list[ChangeReviewFinding] = Field(default_factory=list)
    testing_recommendations: list[str]
