import json
from pathlib import Path

import pytest
from fastapi.testclient import TestClient

from devtool_api.change_review import ChangeReviewRequest, ReviewChangesUseCase
from devtool_api.llm import FakeLLMProvider, LLMResponse
from devtool_api.llm.structured_output_errors import StructuredOutputValidationError
from devtool_api.main import create_app
from devtool_api.prompts import PromptRegistry

PROMPTS_ROOT = Path(__file__).resolve().parents[1] / "prompts"


def create_use_case(
    response_content: str,
) -> tuple[ReviewChangesUseCase, FakeLLMProvider]:
    provider = FakeLLMProvider(
        LLMResponse(content=response_content, model="fake-model")
    )
    return ReviewChangesUseCase(provider, PromptRegistry(PROMPTS_ROOT)), provider


def finding_result() -> str:
    return json.dumps(
        {
            "summary": "One input-validation issue was found.",
            "findings": [
                {
                    "severity": "high",
                    "file": "src/api/users.py",
                    "line": 24,
                    "problem": "The handler accepts an unvalidated identifier.",
                    "evidence": "The diff passes user_id directly to the query.",
                    "suggestion": "Validate user_id before issuing the query.",
                }
            ],
            "testing_recommendations": ["Add an invalid identifier test."],
        }
    )


def test_change_review_use_case_renders_prompt_and_returns_findings() -> None:
    use_case, provider = create_use_case(finding_result())

    result = use_case.review(
        ChangeReviewRequest(
            diff="+ repository.get(user_id)",
            context="The endpoint receives user-controlled input.",
        )
    )

    assert result.findings[0].severity == "high"
    assert result.findings[0].line == 24
    prompt = provider.requests[0].messages[0].content
    assert "Report only issues supported by the supplied diff or context." in prompt
    assert "+ repository.get(user_id)" in prompt


def test_change_review_allows_empty_findings() -> None:
    use_case, _ = create_use_case(
        json.dumps(
            {
                "summary": "No clear defects were found.",
                "findings": [],
                "testing_recommendations": ["Run the existing test suite."],
            }
        )
    )

    result = use_case.review(ChangeReviewRequest(diff="+ return value"))

    assert result.findings == []


def test_change_review_use_case_rejects_invalid_finding_schema() -> None:
    use_case, _ = create_use_case(
        json.dumps(
            {
                "summary": "Incomplete finding.",
                "findings": [{"severity": "high"}],
                "testing_recommendations": [],
            }
        )
    )

    with pytest.raises(StructuredOutputValidationError):
        use_case.review(ChangeReviewRequest(diff="+ return value"))


def test_change_review_api_returns_structured_result() -> None:
    use_case, _ = create_use_case(finding_result())
    client = TestClient(create_app(change_review_use_case=use_case))

    response = client.post(
        "/api/v1/change-reviews",
        json={"diff": "+ repository.get(user_id)"},
    )

    assert response.status_code == 200
    assert response.json()["findings"][0]["file"] == "src/api/users.py"


def test_change_review_api_validates_request() -> None:
    use_case, _ = create_use_case(finding_result())
    client = TestClient(create_app(change_review_use_case=use_case))

    response = client.post("/api/v1/change-reviews", json={})

    assert response.status_code == 422
