"""Cross-workflow API quality and error-boundary coverage."""

from pathlib import Path
from typing import Callable

import pytest
from fastapi.testclient import TestClient

from devtool_api.change_review import ReviewChangesUseCase
from devtool_api.commit_message import GenerateCommitMessageUseCase
from devtool_api.development_plan import GenerateDevelopmentPlanUseCase
from devtool_api.explain import ExplainCodeUseCase
from devtool_api.llm.errors import LLMProviderError, LLMProviderTimeoutError
from devtool_api.llm.models import LLMRequest, LLMResponse
from devtool_api.main import create_app
from devtool_api.prompts import PromptRegistry

PROMPTS_ROOT = Path(__file__).resolve().parents[1] / "prompts"


class RaisingProvider:
    """Deterministic provider double that raises one configured project error."""

    def __init__(self, error: Exception) -> None:
        self._error = error

    def generate(self, request: LLMRequest) -> LLMResponse:
        """Raise without making an external request."""
        del request
        raise self._error


WorkflowFactory = Callable[[RaisingProvider], dict[str, object]]


def _explain_workflow(provider: RaisingProvider) -> dict[str, object]:
    return {
        "explain_code_use_case": ExplainCodeUseCase(
            provider, PromptRegistry(PROMPTS_ROOT)
        )
    }


def _plan_workflow(provider: RaisingProvider) -> dict[str, object]:
    return {
        "development_plan_use_case": GenerateDevelopmentPlanUseCase(
            provider, PromptRegistry(PROMPTS_ROOT)
        )
    }


def _commit_workflow(provider: RaisingProvider) -> dict[str, object]:
    return {
        "commit_message_use_case": GenerateCommitMessageUseCase(
            provider, PromptRegistry(PROMPTS_ROOT)
        )
    }


def _review_workflow(provider: RaisingProvider) -> dict[str, object]:
    return {
        "change_review_use_case": ReviewChangesUseCase(
            provider, PromptRegistry(PROMPTS_ROOT)
        )
    }


@pytest.mark.parametrize(
    ("path", "payload"),
    [
        ("/api/v1/explanations", {"code": "", "language": "python"}),
        ("/api/v1/development-plans", {"request_description": ""}),
        ("/api/v1/commit-messages", {"diff_summary": "", "changed_files": []}),
        ("/api/v1/change-reviews", {"diff": ""}),
    ],
)
def test_workflow_apis_reject_empty_required_input(
    path: str, payload: dict[str, object]
) -> None:
    response = TestClient(create_app()).post(path, json=payload)

    assert response.status_code == 422


@pytest.mark.parametrize(
    ("path", "payload", "workflow_factory"),
    [
        (
            "/api/v1/explanations",
            {"code": "print('ok')", "language": "python"},
            _explain_workflow,
        ),
        (
            "/api/v1/development-plans",
            {"request_description": "Add a health endpoint."},
            _plan_workflow,
        ),
        (
            "/api/v1/commit-messages",
            {"diff_summary": "Add a health endpoint.", "changed_files": []},
            _commit_workflow,
        ),
        (
            "/api/v1/change-reviews",
            {"diff": '+ return {"status": "ok"}'},
            _review_workflow,
        ),
    ],
)
@pytest.mark.parametrize(
    ("provider_error", "expected_status", "expected_detail", "hidden_detail"),
    [
        (
            LLMProviderError("provider detail"),
            502,
            "The AI provider is unavailable.",
            "provider detail",
        ),
        (
            LLMProviderTimeoutError("timeout detail"),
            504,
            "The AI provider timed out.",
            "timeout detail",
        ),
    ],
)
def test_workflow_apis_map_provider_errors_without_leaking_details(
    path: str,
    payload: dict[str, object],
    workflow_factory: WorkflowFactory,
    provider_error: Exception,
    expected_status: int,
    expected_detail: str,
    hidden_detail: str,
) -> None:
    app = create_app(**workflow_factory(RaisingProvider(provider_error)))

    response = TestClient(app).post(path, json=payload)

    assert response.status_code == expected_status
    assert response.json() == {"detail": expected_detail}
    assert hidden_detail not in response.text
