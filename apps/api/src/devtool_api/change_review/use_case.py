"""Application service for reviewing caller-supplied changes."""

from devtool_api.change_review.models import ChangeReviewRequest, ChangeReviewResult
from devtool_api.llm import LLMMessage, LLMProvider, LLMRequest
from devtool_api.llm.structured_output import parse_llm_response
from devtool_api.prompts import PromptRegistry


class ReviewChangesUseCase:
    """Render the review prompt, invoke an LLM, and validate its response."""

    def __init__(self, provider: LLMProvider, prompt_registry: PromptRegistry) -> None:
        self._provider = provider
        self._prompt_registry = prompt_registry

    def review(self, request: ChangeReviewRequest) -> ChangeReviewResult:
        """Review a supplied diff without accessing Git or the file system."""
        prompt = self._prompt_registry.get("change_review", "v1")
        rendered_prompt = prompt.render(
            {
                "diff": request.diff,
                "review_context": request.context or "Not provided.",
            }
        )
        response = self._provider.generate(
            LLMRequest(messages=(LLMMessage(role="user", content=rendered_prompt),))
        )
        return parse_llm_response(response, ChangeReviewResult)
