# DevPilot API

The DevPilot API is the local FastAPI backend used by the VS Code Extension. It validates workflow input, loads versioned prompts, calls the configured LLM Provider, and validates structured output before returning a response.

## Current endpoints

| Endpoint | Workflow |
| --- | --- |
| `GET /health` | Backend connectivity check |
| `POST /api/v1/explanations` | Explain selected code |
| `POST /api/v1/development-plans` | Generate a development plan |
| `POST /api/v1/commit-messages` | Generate a Conventional Commit suggestion |
| `POST /api/v1/change-reviews` | Review a caller-supplied diff |

## Run locally

```powershell
uv sync --all-groups
$env:OPENAI_API_KEY = "your-api-key"
$env:OPENAI_MODEL = "your-model-name"
uv run uvicorn devtool_api.main:app --reload
```

`LLM_TIMEOUT_SECONDS` is optional and defaults to `30`. Tests use the Fake Provider or mocks and do not require an API key.

## Verify

```powershell
uv run pytest
uv run ruff check .
uv run ruff format --check .
```

For project-level architecture, security boundaries, and the Extension installation flow, return to the [repository README](../../README.md).
