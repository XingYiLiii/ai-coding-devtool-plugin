"""Fake LLM provider tests."""

from devtool_api.llm import (
    FakeLLMProvider,
    LLMMessage,
    LLMRequest,
    LLMResponse,
    LLMUsage,
)


def test_fake_provider_returns_a_structured_response() -> None:
    request = LLMRequest(
        messages=(LLMMessage(role="user", content="Return a short greeting."),)
    )
    expected_response = LLMResponse(
        content="Hello.",
        model="fake-model",
        usage=LLMUsage(input_tokens=5, output_tokens=2),
    )
    provider = FakeLLMProvider(response=expected_response)

    response = provider.generate(request)

    assert response == expected_response
    assert provider.requests == [request]
