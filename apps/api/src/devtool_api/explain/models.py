"""Domain models for the Explain Code workflow."""

from pydantic import Field

from devtool_api.llm.structured_output import StructuredOutput


class ExplainCodeRequest(StructuredOutput):
    """A selected code snippet and optional caller-supplied file metadata."""

    code: str = Field(min_length=1)
    language: str = Field(min_length=1)
    metadata: dict[str, str] = Field(default_factory=dict)


class ExplainCodeResult(StructuredOutput):
    """Structured explanation returned to the caller."""

    summary: str
    explanation: str
    key_points: list[str]
    risks: list[str]
