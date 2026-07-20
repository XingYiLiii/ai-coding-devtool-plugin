"""Application service for explaining caller-supplied code selections."""

import json

from devtool_api.context import ContextMetadata, FileContext, WorkspaceContext
from devtool_api.explain.models import ExplainCodeRequest, ExplainCodeResult
from devtool_api.llm import LLMMessage, LLMProvider, LLMRequest
from devtool_api.llm.structured_output import parse_llm_response
from devtool_api.prompts import PromptRegistry


class ExplainCodeUseCase:
    """Render the explain prompt, invoke an LLM, and validate its output."""

    def __init__(self, provider: LLMProvider, prompt_registry: PromptRegistry) -> None:
        self._provider = provider
        self._prompt_registry = prompt_registry

    def explain(self, request: ExplainCodeRequest) -> ExplainCodeResult:
        """Explain a supplied selection without accessing the caller's workspace."""
        context = self._context_from_request(request)
        prompt = self._prompt_registry.get("explain_code", "v1")
        rendered_prompt = prompt.render(
            {
                "code": request.code,
                "language": context.files[0].language or request.language,
                "metadata": json.dumps(
                    context.metadata.attributes,
                    sort_keys=True,
                ),
            }
        )
        response = self._provider.generate(
            LLMRequest(messages=(LLMMessage(role="user", content=rendered_prompt),))
        )
        return parse_llm_response(response, ExplainCodeResult)

    @staticmethod
    def _context_from_request(request: ExplainCodeRequest) -> WorkspaceContext:
        """Create ephemeral context from API input without reading any files."""
        metadata = dict(request.metadata)
        return WorkspaceContext(
            workspace_root="selected-code",
            files=(
                FileContext(
                    path=metadata.get("path", "selected_code"),
                    language=request.language,
                    size=len(request.code),
                ),
            ),
            metadata=ContextMetadata(
                source="api",
                total_files=1,
                total_size=len(request.code),
                attributes=metadata,
            ),
        )
