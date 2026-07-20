"""Domain models for the Development Plan workflow."""

from pydantic import Field

from devtool_api.llm.structured_output import StructuredOutput


class DevelopmentPlanContext(StructuredOutput):
    """Optional caller-supplied summaries for planning context."""

    project_summary: str | None = Field(default=None, min_length=1)
    file_summaries: list[str] = Field(default_factory=list)


class DevelopmentPlanRequest(StructuredOutput):
    """A requirement description with optional non-persistent context summaries."""

    request_description: str = Field(min_length=1)
    context: DevelopmentPlanContext | None = None


class DevelopmentPlanResult(StructuredOutput):
    """Structured implementation plan returned to the caller."""

    requirement_understanding: str
    assumptions: list[str]
    affected_files: list[str]
    implementation_steps: list[str]
    validation_steps: list[str]
    risks: list[str]
    out_of_scope: list[str]
