"""Provider-neutral structured output validation."""

import json
from json import JSONDecodeError
from typing import TypeVar

from pydantic import BaseModel, ConfigDict, ValidationError

from devtool_api.llm.models import LLMResponse
from devtool_api.llm.structured_output_errors import (
    StructuredOutputParseError,
    StructuredOutputValidationError,
)


class StructuredOutput(BaseModel):
    """Base class for future task-specific structured output schemas."""

    model_config = ConfigDict(extra="forbid")


StructuredOutputType = TypeVar("StructuredOutputType", bound=StructuredOutput)


def parse_structured_output(
    content: str, schema: type[StructuredOutputType]
) -> StructuredOutputType:
    """Parse JSON content and validate it against a structured output schema."""
    try:
        payload = json.loads(content)
    except JSONDecodeError as error:
        raise StructuredOutputParseError(
            "LLM response does not contain valid JSON."
        ) from error

    try:
        return schema.model_validate(payload)
    except ValidationError as error:
        raise StructuredOutputValidationError(
            "LLM response does not match the required output schema."
        ) from error


def parse_llm_response(
    response: LLMResponse, schema: type[StructuredOutputType]
) -> StructuredOutputType:
    """Validate structured JSON content from an existing LLM response."""
    return parse_structured_output(response.content, schema)
