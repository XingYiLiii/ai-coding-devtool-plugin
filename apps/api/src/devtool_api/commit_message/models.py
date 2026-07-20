"""Domain models for the Commit Message workflow."""

import re
from typing import Literal

from pydantic import Field, model_validator

from devtool_api.llm.structured_output import StructuredOutput

CommitType = Literal[
    "build",
    "chore",
    "ci",
    "docs",
    "feat",
    "fix",
    "perf",
    "refactor",
    "revert",
    "style",
    "test",
]
_SUBJECT_PATTERN = re.compile(
    r"^(?P<commit_type>[a-z]+)(?:\([^)]+\))?(?P<breaking>!)?: .+$"
)


class CommitMessageRequest(StructuredOutput):
    """Caller-supplied change summaries for generating one commit message."""

    diff_summary: str = Field(min_length=1)
    changed_files: list[str] = Field(default_factory=list)
    style: str | None = Field(default=None, min_length=1)


class CommitMessageResult(StructuredOutput):
    """A Conventional Commits-compatible message and its rationale."""

    subject: str = Field(min_length=1)
    body: str
    commit_type: CommitType
    breaking_change: bool
    reasoning: str

    @model_validator(mode="after")
    def validate_conventional_subject(self) -> "CommitMessageResult":
        """Ensure the subject has a matching Conventional Commits type."""
        match = _SUBJECT_PATTERN.fullmatch(self.subject)
        if match is None:
            raise ValueError("subject must use Conventional Commits format")
        if match.group("commit_type") != self.commit_type:
            raise ValueError("subject type must match commit_type")
        if bool(match.group("breaking")) != self.breaking_change:
            raise ValueError("breaking_change must match the subject marker")
        return self
