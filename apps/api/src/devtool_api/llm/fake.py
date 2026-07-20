"""In-memory LLM provider for deterministic tests."""

from devtool_api.llm.models import LLMRequest, LLMResponse


class FakeLLMProvider:
    """Return a fixed response and retain requests only for the instance lifetime."""

    def __init__(self, response: LLMResponse) -> None:
        self._response = response
        self.requests: list[LLMRequest] = []

    def generate(self, request: LLMRequest) -> LLMResponse:
        """Record a request in memory and return the configured response."""
        self.requests.append(request)
        return self._response
