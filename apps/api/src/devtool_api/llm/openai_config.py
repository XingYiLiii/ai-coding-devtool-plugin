"""Environment-backed configuration for the OpenAI provider."""

import os
from dataclasses import dataclass, field
from typing import Mapping

from devtool_api.llm.errors import LLMConfigurationError


@dataclass(frozen=True)
class OpenAISettings:
    """OpenAI provider settings read only from environment variables."""

    api_key: str = field(repr=False)
    model: str
    timeout_seconds: float

    @classmethod
    def from_environment(
        cls, environment: Mapping[str, str] | None = None
    ) -> "OpenAISettings":
        """Load and validate OpenAI settings without exposing the API key."""
        values = os.environ if environment is None else environment
        api_key = values.get("OPENAI_API_KEY")
        model = values.get("OPENAI_MODEL")

        if not api_key:
            raise LLMConfigurationError("OPENAI_API_KEY must be configured.")
        if not model:
            raise LLMConfigurationError("OPENAI_MODEL must be configured.")

        try:
            timeout_seconds = float(values.get("LLM_TIMEOUT_SECONDS", "30"))
        except ValueError as error:
            raise LLMConfigurationError(
                "LLM_TIMEOUT_SECONDS must be a positive number."
            ) from error

        if timeout_seconds <= 0:
            raise LLMConfigurationError(
                "LLM_TIMEOUT_SECONDS must be a positive number."
            )

        return cls(
            api_key=api_key,
            model=model,
            timeout_seconds=timeout_seconds,
        )
