import json
from pathlib import Path

import pytest
from fastapi.testclient import TestClient

from devtool_api.development_plan import (
    DevelopmentPlanContext,
    DevelopmentPlanRequest,
    GenerateDevelopmentPlanUseCase,
)
from devtool_api.llm import FakeLLMProvider, LLMResponse
from devtool_api.llm.structured_output_errors import StructuredOutputValidationError
from devtool_api.main import create_app
from devtool_api.prompts import PromptRegistry

PROMPTS_ROOT = Path(__file__).resolve().parents[1] / "prompts"


def create_use_case(
    response_content: str,
) -> tuple[GenerateDevelopmentPlanUseCase, FakeLLMProvider]:
    provider = FakeLLMProvider(
        LLMResponse(content=response_content, model="fake-model")
    )
    return GenerateDevelopmentPlanUseCase(
        provider, PromptRegistry(PROMPTS_ROOT)
    ), provider


def valid_result() -> str:
    return json.dumps(
        {
            "requirement_understanding": "Add a profile endpoint.",
            "assumptions": ["Authentication already exists."],
            "affected_files": ["src/api/profile.py"],
            "implementation_steps": ["Add the route."],
            "validation_steps": ["Add an API test."],
            "risks": ["Authentication contract may change."],
            "out_of_scope": ["Frontend changes."],
        }
    )


def test_development_plan_use_case_renders_prompt_and_returns_result() -> None:
    use_case, provider = create_use_case(valid_result())
    request = DevelopmentPlanRequest(
        request_description="Add a profile endpoint.",
        context=DevelopmentPlanContext(
            project_summary="FastAPI backend.",
            file_summaries=["src/main.py defines application routes."],
        ),
    )

    result = use_case.generate(request)

    assert result.requirement_understanding == "Add a profile endpoint."
    assert result.affected_files == ["src/api/profile.py"]
    prompt = provider.requests[0].messages[0].content
    assert "Request: Add a profile endpoint." in prompt
    assert "Project context summary: FastAPI backend." in prompt
    assert '"src/main.py defines application routes."' in prompt


def test_development_plan_use_case_rejects_invalid_result_schema() -> None:
    use_case, _ = create_use_case(
        json.dumps({"requirement_understanding": "Incomplete."})
    )

    with pytest.raises(StructuredOutputValidationError):
        use_case.generate(
            DevelopmentPlanRequest(request_description="Add an endpoint.")
        )


def test_development_plan_api_returns_structured_result() -> None:
    use_case, _ = create_use_case(valid_result())
    client = TestClient(create_app(development_plan_use_case=use_case))

    response = client.post(
        "/api/v1/development-plans",
        json={"request_description": "Add a profile endpoint."},
    )

    assert response.status_code == 200
    assert response.json()["implementation_steps"] == ["Add the route."]


def test_development_plan_api_validates_request() -> None:
    use_case, _ = create_use_case(valid_result())
    client = TestClient(create_app(development_plan_use_case=use_case))

    response = client.post("/api/v1/development-plans", json={})

    assert response.status_code == 422
