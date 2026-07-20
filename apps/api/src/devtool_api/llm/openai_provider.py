"""OpenAI implementation of the project LLM provider contract."""

from typing import Any

from openai import APITimeoutError, OpenAI, OpenAIError

from devtool_api.llm.errors import LLMProviderError, LLMProviderTimeoutError
from devtool_api.llm.models import LLMRequest, LLMResponse, LLMUsage
from devtool_api.llm.openai_config import OpenAISettings


class OpenAIProvider:
    """Generate responses through the official OpenAI Python SDK."""

    def __init__(self, settings: OpenAISettings, client: Any | None = None) -> None:
        self._settings = settings
        self._client = client or OpenAI(
            api_key=settings.api_key,
            timeout=settings.timeout_seconds,
            max_retries=2,
        )

    def generate(self, request: LLMRequest) -> LLMResponse:
        """Generate a response without persisting request content."""
        try:
            response = self._client.responses.create(
                model=self._settings.model,
                input=[
                    {"role": message.role, "content": message.content}
                    for message in request.messages
                ],
                store=False,
            )
        except APITimeoutError as error:
            raise LLMProviderTimeoutError("OpenAI request timed out.") from error
        except OpenAIError as error:
            raise LLMProviderError("OpenAI provider request failed.") from error
        except Exception as error:
            raise LLMProviderError("OpenAI provider request failed.") from error

        usage = getattr(response, "usage", None)
        return LLMResponse(
            content=response.output_text,
            model=self._settings.model,
            usage=LLMUsage(
                input_tokens=getattr(usage, "input_tokens", 0) if usage else 0,
                output_tokens=getattr(usage, "output_tokens", 0) if usage else 0,
            ),
        )
