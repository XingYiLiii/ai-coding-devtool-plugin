"""Structured output validation tests."""

import pytest

from devtool_api.llm.models import LLMResponse
from devtool_api.llm.structured_output import (
    StructuredOutput,
    parse_llm_response,
    parse_structured_output,
)
from devtool_api.llm.structured_output_errors import (
    StructuredOutputParseError,
    StructuredOutputValidationError,
)


class ExampleOutput(StructuredOutput):
    """Test-only schema for generic structured output validation."""

    label: str
    count: int


def test_parser_validates_a_legal_structured_output() -> None:
    result = parse_structured_output(
        '{"label": "ready", "count": 2}',
        ExampleOutput,
    )

    assert result == ExampleOutput(label="ready", count=2)


def test_response_parser_uses_existing_llm_response_content() -> None:
    response = LLMResponse(
        content='{"label": "ready", "count": 2}',
        model="fake-model",
    )

    result = parse_llm_response(response, ExampleOutput)

    assert result.label == "ready"
    assert result.count == 2


def test_parser_rejects_invalid_json() -> None:
    with pytest.raises(StructuredOutputParseError, match="valid JSON"):
        parse_structured_output("not-json", ExampleOutput)


def test_parser_rejects_schema_mismatch() -> None:
    with pytest.raises(StructuredOutputValidationError, match="required output schema"):
        parse_structured_output('{"label": "ready"}', ExampleOutput)


def test_parser_rejects_unexpected_fields() -> None:
    with pytest.raises(StructuredOutputValidationError, match="required output schema"):
        parse_structured_output(
            '{"label": "ready", "count": 2, "extra": true}',
            ExampleOutput,
        )
