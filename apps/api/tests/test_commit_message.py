import json
from pathlib import Path

import pytest
from fastapi.testclient import TestClient

from devtool_api.commit_message import (
    CommitMessageRequest,
    GenerateCommitMessageUseCase,
)
from devtool_api.llm import FakeLLMProvider, LLMResponse
from devtool_api.llm.structured_output_errors import StructuredOutputValidationError
from devtool_api.main import create_app
from devtool_api.prompts import PromptRegistry

PROMPTS_ROOT = Path(__file__).resolve().parents[1] / "prompts"


def create_use_case(
    response_content: str,
) -> tuple[GenerateCommitMessageUseCase, FakeLLMProvider]:
    provider = FakeLLMProvider(
        LLMResponse(content=response_content, model="fake-model")
    )
    return GenerateCommitMessageUseCase(
        provider, PromptRegistry(PROMPTS_ROOT)
    ), provider


def valid_result() -> str:
    return json.dumps(
        {
            "subject": "feat(api): add profile endpoint",
            "body": "Expose a profile endpoint for authenticated users.",
            "commit_type": "feat",
            "breaking_change": False,
            "reasoning": "The change adds a new user-facing capability.",
        }
    )


def test_commit_message_use_case_renders_prompt_and_returns_result() -> None:
    use_case, provider = create_use_case(valid_result())

    result = use_case.generate(
        CommitMessageRequest(
            diff_summary="Add an authenticated profile endpoint.",
            changed_files=["src/api/profile.py", "tests/test_profile.py"],
            style="Conventional Commits",
        )
    )

    assert result.subject == "feat(api): add profile endpoint"
    assert result.commit_type == "feat"
    prompt = provider.requests[0].messages[0].content
    assert "Diff summary: Add an authenticated profile endpoint." in prompt
    assert '"src/api/profile.py"' in prompt


def test_commit_message_use_case_rejects_invalid_conventional_subject() -> None:
    invalid_result = json.dumps(
        {
            "subject": "add profile endpoint",
            "body": "Add the endpoint.",
            "commit_type": "feat",
            "breaking_change": False,
            "reasoning": "Adds a feature.",
        }
    )
    use_case, _ = create_use_case(invalid_result)

    with pytest.raises(StructuredOutputValidationError):
        use_case.generate(
            CommitMessageRequest(diff_summary="Add an endpoint.", changed_files=[])
        )


def test_commit_message_api_returns_structured_result() -> None:
    use_case, _ = create_use_case(valid_result())
    client = TestClient(create_app(commit_message_use_case=use_case))

    response = client.post(
        "/api/v1/commit-messages",
        json={
            "diff_summary": "Add an authenticated profile endpoint.",
            "changed_files": ["src/api/profile.py"],
        },
    )

    assert response.status_code == 200
    assert response.json()["subject"] == "feat(api): add profile endpoint"


def test_commit_message_api_validates_request() -> None:
    use_case, _ = create_use_case(valid_result())
    client = TestClient(create_app(commit_message_use_case=use_case))

    response = client.post("/api/v1/commit-messages", json={})

    assert response.status_code == 422
