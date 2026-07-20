"""Deterministic budgeting for already-collected context."""

from dataclasses import dataclass, replace
from typing import Protocol

from devtool_api.context.models import FileContext, WorkspaceContext


@dataclass(frozen=True)
class ContextBudget:
    """Limits for files and summary characters included in a context."""

    max_files: int
    max_characters: int

    def __post_init__(self) -> None:
        if self.max_files < 0:
            raise ValueError("max_files must not be negative")
        if self.max_characters < 0:
            raise ValueError("max_characters must not be negative")


class ContextPrioritizer(Protocol):
    """Orders context files before a budget is applied."""

    def order(self, files: tuple[FileContext, ...]) -> tuple[FileContext, ...]:
        """Return files in deterministic inclusion order."""


class PriorityContextPrioritizer:
    """Orders higher-priority files first while preserving ties' input order."""

    def order(self, files: tuple[FileContext, ...]) -> tuple[FileContext, ...]:
        indexed_files = enumerate(files)
        return tuple(
            file_context
            for _, file_context in sorted(
                indexed_files,
                key=lambda item: (-item[1].priority, item[0]),
            )
        )


class ContextBudgeter:
    """Applies fixed file and character limits to in-memory context."""

    def __init__(self, prioritizer: ContextPrioritizer | None = None) -> None:
        self._prioritizer = prioritizer or PriorityContextPrioritizer()

    def apply(
        self, context: WorkspaceContext, budget: ContextBudget
    ) -> WorkspaceContext:
        """Return context that fits budget limits using hard-cut truncation."""
        total_characters = sum(
            len(file_context.content_summary or "") for file_context in context.files
        )
        if (
            len(context.files) <= budget.max_files
            and total_characters <= budget.max_characters
        ):
            return context

        selected_files: list[FileContext] = []
        remaining_characters = budget.max_characters
        for file_context in self._prioritizer.order(context.files):
            if len(selected_files) >= budget.max_files:
                break

            summary = file_context.content_summary or ""
            if len(summary) <= remaining_characters:
                selected_files.append(file_context)
                remaining_characters -= len(summary)
                continue

            if remaining_characters > 0:
                selected_files.append(
                    replace(
                        file_context, content_summary=summary[:remaining_characters]
                    )
                )
            break

        return replace(context, files=tuple(selected_files))
