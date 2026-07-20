"""Prompt metadata and rendering models."""

from dataclasses import dataclass
from string import Formatter
from typing import Mapping

from devtool_api.prompts.errors import PromptValidationError


@dataclass(frozen=True)
class PromptDefinition:
    """A versioned prompt template with explicit required variables."""

    id: str
    version: str
    template: str
    required_variables: tuple[str, ...]

    def __post_init__(self) -> None:
        """Validate metadata and ensure variables match template placeholders."""
        if not self.id:
            raise PromptValidationError("Prompt id must not be empty.")
        if not self.version:
            raise PromptValidationError("Prompt version must not be empty.")
        if not self.template.strip():
            raise PromptValidationError("Prompt template must not be empty.")
        if len(self.required_variables) != len(set(self.required_variables)):
            raise PromptValidationError("Prompt variables must not contain duplicates.")

        template_variables = self._template_variables()
        declared_variables = set(self.required_variables)
        if template_variables != declared_variables:
            raise PromptValidationError(
                "Prompt required_variables must match template placeholders."
            )

    def render(self, variables: Mapping[str, object]) -> str:
        """Render the template after validating all required variables are present."""
        missing_variables = set(self.required_variables).difference(variables)
        if missing_variables:
            missing = ", ".join(sorted(missing_variables))
            raise PromptValidationError(
                f"Missing required prompt variables: {missing}."
            )

        return self.template.format(**variables)

    def _template_variables(self) -> set[str]:
        try:
            field_names = {
                field_name
                for _, field_name, _, _ in Formatter().parse(self.template)
                if field_name
            }
        except ValueError as error:
            raise PromptValidationError("Prompt template format is invalid.") from error

        if any(not name.isidentifier() for name in field_names):
            raise PromptValidationError(
                "Prompt template placeholders must be simple variable names."
            )

        return field_names
