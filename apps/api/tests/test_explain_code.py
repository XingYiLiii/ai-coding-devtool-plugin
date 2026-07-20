import json
from pathlib import Path

import pytest
from fastapi.testclient import TestClient

from devtool_api.explain import ExplainCodeRequest, ExplainCodeUseCase
from devtool_api.llm import FakeLLMProvider, LLMResponse
from devtool_api.llm.structured_output_errors import StructuredOutputValidationError
from devtool_api.main import create_app
from devtool_api.prompts import PromptRegistry

PROMPTS_ROOT = Path(__file__).resolve().parents[1] / "prompts"


def create_use_case(
    response_content: str,
) -> tuple[ExplainCodeUseCase, FakeLLMProvider]:
    provider = FakeLLMProvider(
        LLMResponse(content=response_content, model="fake-model")
    )
    return ExplainCodeUseCase(provider, PromptRegistry(PROMPTS_ROOT)), provider


def test_explain_code_use_case_renders_prompt_and_returns_structured_result() -> None:
    response_content = json.dumps(
        {
            "summary": "Defines a greeting function.",
            "explanation": "The function accepts a name and returns a greeting.",
            "key_points": ["Uses an f-string."],
            "risks": [],
        }
    )
    use_case, provider = create_use_case(response_content)

    result = use_case.explain(
        ExplainCodeRequest(
            code="def greet(name): return f'Hello {name}'",
            language="python",
            metadata={"path": "src/greeting.py"},
        )
    )

    assert result.summary == "Defines a greeting function."
    assert result.key_points == ["Uses an f-string."]
    assert len(provider.requests) == 1
    prompt = provider.requests[0].messages[0].content
    assert "Explain the selected python code" in prompt
    assert 'File metadata: {"path": "src/greeting.py"}' in prompt


def test_explain_code_use_case_rejects_invalid_result_schema() -> None:
    use_case, _ = create_use_case(json.dumps({"summary": "Incomplete."}))

    with pytest.raises(StructuredOutputValidationError):
        use_case.explain(ExplainCodeRequest(code="print('ok')", language="python"))


def test_explain_code_api_returns_structured_result() -> None:
    response_content = json.dumps(
        {
            "summary": "Prints a value.",
            "explanation": "Calls the built-in print function.",
            "key_points": ["Produces console output."],
            "risks": [],
        }
    )
    use_case, _ = create_use_case(response_content)
    client = TestClient(create_app(explain_code_use_case=use_case))

    response = client.post(
        "/api/v1/explanations",
        json={"code": "print('ok')", "language": "python"},
    )

    assert response.status_code == 200
    assert response.json()["summary"] == "Prints a value."


def test_explain_code_api_hides_structured_output_errors() -> None:
    use_case, _ = create_use_case(json.dumps({"summary": "Incomplete."}))
    client = TestClient(create_app(explain_code_use_case=use_case))

    response = client.post(
        "/api/v1/explanations",
        json={"code": "print('ok')", "language": "python"},
    )

    assert response.status_code == 502
    assert response.json() == {"detail": "The AI response could not be validated."}
