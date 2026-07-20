"""FastAPI application entry point."""

from pathlib import Path

from fastapi import FastAPI, HTTPException

from devtool_api.explain import (
    ExplainCodeRequest,
    ExplainCodeResult,
    ExplainCodeUseCase,
)
from devtool_api.llm.errors import (
    LLMConfigurationError,
    LLMProviderError,
    LLMProviderTimeoutError,
)
from devtool_api.llm.openai_config import OpenAISettings
from devtool_api.llm.openai_provider import OpenAIProvider
from devtool_api.llm.structured_output_errors import StructuredOutputError
from devtool_api.prompts import PromptRegistry, PromptRegistryError


def create_app(explain_code_use_case: ExplainCodeUseCase | None = None) -> FastAPI:
    """Create the local backend application."""
    app = FastAPI(
        title="AI Coding Devtool API",
        version="0.1.0",
        description="Local backend for ai-coding-devtool-plugin.",
    )

    @app.get("/health", tags=["system"])
    def health() -> dict[str, str]:
        """Return the backend liveness state."""
        return {"status": "ok"}

    @app.post(
        "/api/v1/explanations",
        response_model=ExplainCodeResult,
        tags=["explanations"],
    )
    def explain_code(request: ExplainCodeRequest) -> ExplainCodeResult:
        """Explain one caller-supplied code selection."""
        try:
            workflow = explain_code_use_case or _create_default_explain_code_use_case()
            return workflow.explain(request)
        except LLMConfigurationError:
            raise HTTPException(
                status_code=503,
                detail="Explain Code is not configured.",
            ) from None
        except LLMProviderTimeoutError:
            raise HTTPException(
                status_code=504,
                detail="The AI provider timed out.",
            ) from None
        except LLMProviderError:
            raise HTTPException(
                status_code=502,
                detail="The AI provider is unavailable.",
            ) from None
        except StructuredOutputError:
            raise HTTPException(
                status_code=502,
                detail="The AI response could not be validated.",
            ) from None
        except PromptRegistryError:
            raise HTTPException(
                status_code=500,
                detail="Explain Code is temporarily unavailable.",
            ) from None

    return app


def _create_default_explain_code_use_case() -> ExplainCodeUseCase:
    """Create the configured production workflow only when a request arrives."""
    prompt_root = Path(__file__).resolve().parents[2] / "prompts"
    settings = OpenAISettings.from_environment()
    return ExplainCodeUseCase(
        provider=OpenAIProvider(settings),
        prompt_registry=PromptRegistry(prompt_root),
    )


app = create_app()
