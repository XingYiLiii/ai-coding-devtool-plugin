"""Safety rules for deciding whether a file may become AI context."""

from dataclasses import dataclass
from fnmatch import fnmatch
from pathlib import PurePosixPath

DEFAULT_IGNORED_DIRECTORIES = frozenset(
    {"node_modules", "dist", "build", "credentials", "secrets"}
)
DEFAULT_SENSITIVE_PATTERNS = (".env*", "*.key", "*.pem")


@dataclass(frozen=True)
class ContextSecurityConfig:
    """Configurable limits and exclusion rules for context candidates."""

    max_file_size: int = 200_000
    ignored_directories: frozenset[str] = DEFAULT_IGNORED_DIRECTORIES
    sensitive_patterns: tuple[str, ...] = DEFAULT_SENSITIVE_PATTERNS

    def __post_init__(self) -> None:
        if self.max_file_size < 0:
            raise ValueError("max_file_size must not be negative")


@dataclass(frozen=True)
class ContextSecurityDecision:
    """The deterministic result of applying context safety rules."""

    allowed: bool
    reason: str | None = None


class ContextSecurityFilter:
    """Filters context candidates without reading from the file system."""

    def __init__(self, config: ContextSecurityConfig | None = None) -> None:
        self._config = config or ContextSecurityConfig()

    def evaluate(
        self,
        *,
        path: str,
        size: int,
        content: bytes | None = None,
    ) -> ContextSecurityDecision:
        """Return whether a caller-provided candidate is safe to include."""
        if size < 0:
            raise ValueError("size must not be negative")

        normalized_path = path.replace("\\", "/")
        path_parts = PurePosixPath(normalized_path).parts
        filename = path_parts[-1] if path_parts else ""

        if any(
            part.lower() in self._config.ignored_directories for part in path_parts[:-1]
        ):
            return ContextSecurityDecision(False, "ignored_directory")
        if any(
            fnmatch(filename.lower(), pattern.lower())
            for pattern in self._config.sensitive_patterns
        ):
            return ContextSecurityDecision(False, "sensitive_file")
        if size > self._config.max_file_size:
            return ContextSecurityDecision(False, "file_too_large")
        if content is not None and self._is_binary(content):
            return ContextSecurityDecision(False, "binary_file")

        return ContextSecurityDecision(True)

    @staticmethod
    def _is_binary(content: bytes) -> bool:
        return b"\x00" in content
