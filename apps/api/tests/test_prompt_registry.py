"""Versioned prompt registry tests."""

from pathlib import Path

import pytest

from devtool_api.prompts import (
    PromptNotFoundError,
    PromptRegistry,
    PromptValidationError,
)


def write_prompt(root: Path, contents: str) -> None:
    """Write a generic prompt fixture to an isolated temporary directory."""
    prompt_directory = root / "example"
    prompt_directory.mkdir()
    (prompt_directory / "v1.yaml").write_text(contents, encoding="utf-8")


def test_registry_loads_a_versioned_prompt_and_renders_variables(
    tmp_path: Path,
) -> None:
    write_prompt(
        tmp_path,
        """id: example
version: v1
template: 'Hello, {name}.'
required_variables:
  - name
""",
    )
    registry = PromptRegistry(tmp_path)

    prompt = registry.get("example", "v1")

    assert prompt.id == "example"
    assert prompt.version == "v1"
    assert prompt.render({"name": "Ada"}) == "Hello, Ada."


def test_prompt_rejects_missing_required_variables(tmp_path: Path) -> None:
    write_prompt(
        tmp_path,
        """id: example
version: v1
template: 'Hello, {name}.'
required_variables:
  - name
""",
    )
    prompt = PromptRegistry(tmp_path).get("example", "v1")

    with pytest.raises(PromptValidationError, match="Missing required"):
        prompt.render({})


def test_registry_rejects_missing_prompt(tmp_path: Path) -> None:
    with pytest.raises(PromptNotFoundError, match="was not found"):
        PromptRegistry(tmp_path).get("example", "v1")


def test_registry_rejects_invalid_prompt_metadata(tmp_path: Path) -> None:
    write_prompt(
        tmp_path,
        """id: example
version: v1
template: 'Hello, {name}.'
required_variables: []
""",
    )

    with pytest.raises(PromptValidationError, match="must match"):
        PromptRegistry(tmp_path).get("example", "v1")
