"""Provider-neutral interfaces for supplying pre-collected context."""

from dataclasses import dataclass, field
from typing import Protocol

from devtool_api.context.models import WorkspaceContext


@dataclass(frozen=True)
class ContextCollectionRequest:
    """Describes context supplied by a caller, without triggering file access."""

    workspace_root: str
    include_paths: tuple[str, ...] = ()
    max_files: int | None = None

    def __post_init__(self) -> None:
        if not self.workspace_root:
            raise ValueError("workspace_root must not be empty")
        if self.max_files is not None and self.max_files < 0:
            raise ValueError("max_files must not be negative")
        object.__setattr__(self, "include_paths", tuple(self.include_paths))


@dataclass(frozen=True)
class ContextCollectionResult:
    """Returns caller-provided context through a stable collector boundary."""

    context: WorkspaceContext


class ContextCollector(Protocol):
    """Collects context without dictating its source implementation."""

    def collect(self, request: ContextCollectionRequest) -> ContextCollectionResult:
        """Return context for a validated collection request."""


@dataclass
class FakeContextCollector:
    """Test double that returns a configured result and records requests."""

    result: ContextCollectionResult
    requests: list[ContextCollectionRequest] = field(default_factory=list)

    def collect(self, request: ContextCollectionRequest) -> ContextCollectionResult:
        self.requests.append(request)
        return self.result
