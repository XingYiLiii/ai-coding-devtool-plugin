"""LLM provider contract."""

from typing import Protocol

from devtool_api.llm.models import LLMRequest, LLMResponse


class LLMProvider(Protocol):
    """Generate one response from a provider-neutral request."""

    def generate(self, request: LLMRequest) -> LLMResponse:
        """Generate a response without persisting request content."""
