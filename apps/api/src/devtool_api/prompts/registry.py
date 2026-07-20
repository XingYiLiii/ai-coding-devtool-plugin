"""Filesystem-backed versioned prompt registry."""

import re
from pathlib import Path
from typing import Any

import yaml

from devtool_api.prompts.errors import PromptNotFoundError, PromptValidationError
from devtool_api.prompts.models import PromptDefinition

_IDENTIFIER_PATTERN = re.compile(r"^[A-Za-z0-9_-]+$")


class PromptRegistry:
    """Load versioned YAML prompt definitions from one fixed directory."""

    def __init__(self, root: Path) -> None:
        self._root = root

    def get(self, prompt_id: str, version: str) -> PromptDefinition:
        """Load a prompt definition by its id and version."""
        self._validate_identifier("prompt id", prompt_id)
        self._validate_identifier("prompt version", version)
        prompt_path = self._root / prompt_id / f"{version}.yaml"

        if not prompt_path.is_file():
            raise PromptNotFoundError(
                f"Prompt '{prompt_id}' version '{version}' was not found."
            )

        try:
            contents = yaml.safe_load(prompt_path.read_text(encoding="utf-8"))
        except yaml.YAMLError as error:
            raise PromptValidationError("Prompt YAML format is invalid.") from error

        if not isinstance(contents, dict):
            raise PromptValidationError("Prompt YAML must contain a mapping.")

        definition = self._definition_from_mapping(contents)
        if definition.id != prompt_id or definition.version != version:
            raise PromptValidationError(
                "Prompt metadata must match the requested id and version."
            )

        return definition

    @staticmethod
    def _definition_from_mapping(contents: dict[str, Any]) -> PromptDefinition:
        required_keys = {"id", "version", "template", "required_variables"}
        missing_keys = required_keys.difference(contents)
        if missing_keys:
            missing = ", ".join(sorted(missing_keys))
            raise PromptValidationError(
                f"Prompt YAML is missing required keys: {missing}."
            )

        required_variables = contents["required_variables"]
        if not isinstance(required_variables, list) or not all(
            isinstance(variable, str) for variable in required_variables
        ):
            raise PromptValidationError(
                "Prompt required_variables must be a list of strings."
            )

        return PromptDefinition(
            id=contents["id"],
            version=contents["version"],
            template=contents["template"],
            required_variables=tuple(required_variables),
        )

    @staticmethod
    def _validate_identifier(label: str, value: str) -> None:
        if not _IDENTIFIER_PATTERN.fullmatch(value):
            raise PromptValidationError(f"Invalid {label}: {value!r}.")
