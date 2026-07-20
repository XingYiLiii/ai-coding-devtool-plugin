"""FastAPI application entry point."""

from fastapi import FastAPI


def create_app() -> FastAPI:
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

    return app


app = create_app()
