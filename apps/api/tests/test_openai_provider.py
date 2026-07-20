"""OpenAI provider tests with no network calls."""

from types import SimpleNamespace
from unittest.mock import MagicMock, patch

import httpx
import pytest
from openai import APITimeoutError

from devtool_api.llm.errors import (
    LLMConfigurationError,
    LLMProviderError,
    LLMProviderTimeoutError,
)
from devtool_api.llm.models import LLMMessage, LLMRequest
from devtool_api.llm.openai_config import OpenAISettings
from devtool_api.llm.openai_provider import OpenAIProvider


def test_settings_reads_environment_values() -> None:
    settings = OpenAISettings.from_environment(
        {
            "OPENAI_API_KEY": "test-key",
            "OPENAI_MODEL": "test-model",
            "LLM_TIMEOUT_SECONDS": "12.5",
        }
    )

    assert settings.api_key == "test-key"
    assert settings.model == "test-model"
    assert settings.timeout_seconds == 12.5
    assert "test-key" not in repr(settings)


def test_settings_reject_missing_api_key() -> None:
    with pytest.raises(LLMConfigurationError, match="OPENAI_API_KEY"):
        OpenAISettings.from_environment({"OPENAI_MODEL": "test-model"})


def test_provider_initializes_sdk_with_timeout_and_retries() -> None:
    settings = OpenAISettings(
        api_key="test-key",
        model="test-model",
        timeout_seconds=12.5,
    )

    with patch("devtool_api.llm.openai_provider.OpenAI") as client_class:
        OpenAIProvider(settings)

    client_class.assert_called_once_with(
        api_key="test-key",
        timeout=12.5,
        max_retries=2,
    )


def test_provider_maps_response_content_and_usage() -> None:
    client = MagicMock()
    client.responses.create.return_value = SimpleNamespace(
        output_text="Generated response.",
        usage=SimpleNamespace(input_tokens=3, output_tokens=5),
    )
    provider = OpenAIProvider(
        OpenAISettings("test-key", "test-model", 30),
        client=client,
    )
    request = LLMRequest(
        messages=(LLMMessage(role="user", content="Return a response."),)
    )

    response = provider.generate(request)

    assert response.content == "Generated response."
    assert response.model == "test-model"
    assert response.usage.input_tokens == 3
    assert response.usage.output_tokens == 5
    client.responses.create.assert_called_once_with(
        model="test-model",
        input=[{"role": "user", "content": "Return a response."}],
        store=False,
    )


def test_provider_maps_timeout_errors() -> None:
    client = MagicMock()
    client.responses.create.side_effect = APITimeoutError(
        request=httpx.Request("POST", "https://api.openai.com/v1/responses")
    )
    provider = OpenAIProvider(
        OpenAISettings("test-key", "test-model", 30),
        client=client,
    )

    with pytest.raises(LLMProviderTimeoutError, match="timed out"):
        provider.generate(LLMRequest(messages=()))


def test_provider_maps_unexpected_errors() -> None:
    client = MagicMock()
    client.responses.create.side_effect = RuntimeError("provider unavailable")
    provider = OpenAIProvider(
        OpenAISettings("test-key", "test-model", 30),
        client=client,
    )

    with pytest.raises(LLMProviderError, match="provider request failed"):
        provider.generate(LLMRequest(messages=()))
