"""Application service for generating Conventional Commit messages."""

import json

from devtool_api.commit_message.models import CommitMessageRequest, CommitMessageResult
from devtool_api.llm import LLMMessage, LLMProvider, LLMRequest
from devtool_api.llm.structured_output import parse_llm_response
from devtool_api.prompts import PromptRegistry


class GenerateCommitMessageUseCase:
    """Render the commit prompt, invoke an LLM, and validate its response."""

    def __init__(self, provider: LLMProvider, prompt_registry: PromptRegistry) -> None:
        self._provider = provider
        self._prompt_registry = prompt_registry

    def generate(self, request: CommitMessageRequest) -> CommitMessageResult:
        """Generate a commit message from caller-provided change information."""
        prompt = self._prompt_registry.get("commit_message", "v1")
        rendered_prompt = prompt.render(
            {
                "diff_summary": request.diff_summary,
                "changed_files": json.dumps(request.changed_files, ensure_ascii=False),
                "commit_style": request.style or "Conventional Commits",
            }
        )
        response = self._provider.generate(
            LLMRequest(messages=(LLMMessage(role="user", content=rendered_prompt),))
        )
        return parse_llm_response(response, CommitMessageResult)
