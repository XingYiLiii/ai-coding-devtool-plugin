"""Application service for generating developer implementation plans."""

import json

from devtool_api.context import ContextMetadata, FileContext, WorkspaceContext
from devtool_api.development_plan.models import (
    DevelopmentPlanRequest,
    DevelopmentPlanResult,
)
from devtool_api.llm import LLMMessage, LLMProvider, LLMRequest
from devtool_api.llm.structured_output import parse_llm_response
from devtool_api.prompts import PromptRegistry


class GenerateDevelopmentPlanUseCase:
    """Render the plan prompt, invoke an LLM, and validate its response."""

    def __init__(self, provider: LLMProvider, prompt_registry: PromptRegistry) -> None:
        self._provider = provider
        self._prompt_registry = prompt_registry

    def generate(self, request: DevelopmentPlanRequest) -> DevelopmentPlanResult:
        """Generate a plan from caller-supplied summaries without file-system access."""
        context = self._context_from_request(request)
        prompt = self._prompt_registry.get("development_plan", "v1")
        rendered_prompt = prompt.render(
            {
                "request_description": request.request_description,
                "project_context": context.metadata.attributes.get(
                    "project_summary",
                    "Not provided.",
                ),
                "file_summaries": json.dumps(
                    [file_context.content_summary for file_context in context.files],
                    ensure_ascii=False,
                ),
            }
        )
        response = self._provider.generate(
            LLMRequest(messages=(LLMMessage(role="user", content=rendered_prompt),))
        )
        return parse_llm_response(response, DevelopmentPlanResult)

    @staticmethod
    def _context_from_request(request: DevelopmentPlanRequest) -> WorkspaceContext:
        """Map supplied summaries to ephemeral context models."""
        plan_context = request.context
        file_summaries = plan_context.file_summaries if plan_context else []
        project_summary = plan_context.project_summary if plan_context else None
        files = tuple(
            FileContext(
                path=f"provided-summary-{index}",
                content_summary=summary,
            )
            for index, summary in enumerate(file_summaries, start=1)
        )
        attributes = {"project_summary": project_summary} if project_summary else {}
        return WorkspaceContext(
            workspace_root="development-plan",
            files=files,
            metadata=ContextMetadata(
                source="api",
                total_files=len(files),
                total_size=sum(len(summary) for summary in file_summaries),
                attributes=attributes,
            ),
        )
