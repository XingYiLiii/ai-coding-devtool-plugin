"""In-memory models for developer-tool context."""

from dataclasses import dataclass, field
from typing import Mapping


@dataclass(frozen=True)
class ContextMetadata:
    """Describes a workspace context without persisting its source data."""

    source: str = "extension"
    total_files: int = 0
    total_size: int = 0
    attributes: Mapping[str, str] = field(default_factory=dict)

    def __post_init__(self) -> None:
        if not self.source:
            raise ValueError("source must not be empty")
        if self.total_files < 0:
            raise ValueError("total_files must not be negative")
        if self.total_size < 0:
            raise ValueError("total_size must not be negative")


@dataclass(frozen=True)
class FileContext:
    """A single in-memory file representation available to later workflows."""

    path: str
    language: str | None = None
    size: int = 0
    content_summary: str | None = None
    priority: int = 0

    def __post_init__(self) -> None:
        if not self.path:
            raise ValueError("path must not be empty")
        if self.size < 0:
            raise ValueError("size must not be negative")


@dataclass(frozen=True)
class WorkspaceContext:
    """An in-memory collection of files scoped to one workspace."""

    workspace_root: str
    files: tuple[FileContext, ...] = ()
    metadata: ContextMetadata = field(default_factory=ContextMetadata)

    def __post_init__(self) -> None:
        if not self.workspace_root:
            raise ValueError("workspace_root must not be empty")
        object.__setattr__(self, "files", tuple(self.files))
