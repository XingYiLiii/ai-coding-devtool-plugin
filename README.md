# DevPilot — VS Code AI Developer Tool

DevPilot is a local-first AI Developer Tool that brings focused AI workflows into VS Code. It pairs a TypeScript VS Code Extension with a Python/FastAPI backend so developers can explain selected code, plan a change, draft a Conventional Commit message, and review staged changes before acting on them.

It is a portfolio project for demonstrating AI Coding Workflow design, Context Engineering, Prompt Engineering, structured LLM integration, and developer-tool engineering.

## Project Overview

The product keeps the developer in control: it collects only workflow-specific input, returns suggestions through the Output Channel, and never edits code or creates commits automatically.

| Layer | Responsibility |
| --- | --- |
| VS Code Extension | Command Palette workflows, selected-code input, staged Git context, status bar, and result display |
| Local FastAPI Backend | Request validation, workflow orchestration, error mapping, and structured response boundary |
| LLM Provider | OpenAI SDK integration behind a provider interface; Fake Provider support for deterministic tests |

## Core Features

- **Explain Code** — Explain the current editor selection with a summary, detailed explanation, key points, and risks.
- **Generate Development Plan** — Turn a requirement description and optional summaries into structured implementation and validation steps.
- **Generate Commit Message** — Generate a Conventional Commits-compatible suggestion from caller-supplied staged-change context.
- **Review Changes** — Review safe staged text diffs for evidence-backed findings and testing recommendations. An empty finding list is a valid outcome.

## Architecture

```text
VS Code Extension
  ├─ selected editor text / language metadata
  └─ safe staged Git diff
          ↓ HTTP
Local FastAPI Backend
  ├─ request validation
  ├─ Prompt Registry
  ├─ workflow use case
  └─ Structured Output validation
          ↓ provider interface
OpenAI Provider / Fake Provider (tests)
```

Read the implementation-oriented view in [docs/architecture.md](docs/architecture.md).

## AI Engineering Highlights

- **Context Engineering foundation** — typed context models, deterministic budgeting, priority ordering, and security filters for sensitive paths, binary content, ignored directories, and oversized files.
- **Prompt Registry** — versioned YAML prompts are loaded by `prompt_id` and version, with required-variable validation rather than Python string literals.
- **Structured Output** — Pydantic schemas validate each workflow result; malformed JSON or schema mismatches become safe API errors.
- **Evaluation Fixtures** — synthetic, fixed fixtures and workflow-specific quality rubrics live in [evals/](evals/README.md). CI uses Fake/Mock-based tests and never calls a paid model.
- **Human in the loop** — results are suggestions only. DevPilot does not modify code, execute model-generated commands, commit, push, or create pull requests.

## Privacy & Security

- **Local-first:** the Extension targets a configurable local FastAPI backend (`devpilot.backendUrl`).
- **Scoped collection:** Explain Code uses only the active selection; Git workflows use staged changes only, not a workspace-wide scan.
- **Sensitive-content filtering:** `.env*`, `*.key`, `*.pem`, `credentials`, `secrets`, binary diffs, and unsafe staged paths are excluded. Context filtering also excludes `node_modules`, `dist`, `build`, and oversized files.
- **No source persistence:** workflow request content is not stored by the backend.
- **API keys:** `OPENAI_API_KEY` is read only from the environment, is excluded from object representations, and must never be committed. `OPENAI_MODEL` is also required for live AI workflows.

See [docs/security.md](docs/security.md) for boundaries and operational guidance.

## Quick Start

### Prerequisites

- Python 3.12+ and [uv](https://docs.astral.sh/uv/)
- Node.js 24+ and npm
- VS Code 1.95+
- An OpenAI API key and model name for live AI workflows

### 1. Start the local backend

```powershell
cd apps/api
uv sync --all-groups
$env:OPENAI_API_KEY = "your-api-key"
$env:OPENAI_MODEL = "your-model-name"
uv run uvicorn devtool_api.main:app --reload
```

The backend health endpoint is available at `http://127.0.0.1:8000/health`. The Extension status bar reports `DevPilot: Ready` when it can reach the backend.

### 2. Build and install the Extension

```powershell
cd apps/extension
npm ci
npm run package
code --install-extension dist/devpilot.vsix
```

Alternatively, use VS Code's **Extensions: Install from VSIX...** command and select `apps/extension/dist/devpilot.vsix`. If your backend runs elsewhere, configure `devpilot.backendUrl` in VS Code settings.

## Testing

All automated checks run without a real OpenAI call or API key.

```powershell
# Backend
cd apps/api
uv run pytest
uv run ruff check .
uv run ruff format --check .

# Extension
cd apps/extension
npm ci
npm run compile
npm test
npm run lint
npm run format:check
```

Current local verification covers 64 backend tests and 25 Extension tests. GitHub Actions runs these quality checks on pushes and pull requests; a `v*` tag additionally packages a `.vsix` and uploads it as a workflow artifact.

## Demo Scenario

A concise three-minute interview demo is available in [docs/demo-guide.md](docs/demo-guide.md). The flow demonstrates backend connectivity, Explain Code, Development Plan, Commit Message, and staged Change Review while making the human approval boundary explicit.

## Documentation

- [Architecture](docs/architecture.md)
- [Demo Guide](docs/demo-guide.md)
- [Security and Privacy](docs/security.md)
- [Offline Evaluation Fixtures and Rubrics](evals/README.md)
- [v0.1.0 Release Notes](CHANGELOG.md)

## Roadmap

The following are future work, not current features:

- Richer result presentation through a dedicated VS Code Webview.
- Explicit, user-approved workspace context selection for additional planning scenarios.
- Configurable prompt/version selection and model settings in the Extension UI.
- Marketplace publishing and signed release distribution.

## License

[MIT](LICENSE)
