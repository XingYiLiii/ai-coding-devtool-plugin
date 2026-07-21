# Changelog

All notable changes to this project are documented here. This release is a local-first portfolio release; it does not publish to the VS Code Marketplace.

## [0.1.0] - 2026-07-21

### Features

- VS Code commands for Explain Code, Generate Development Plan, Generate Commit Message, and Review Staged Changes.
- Local FastAPI endpoints for the four workflows, with typed request and response models.
- Backend health status in the VS Code status bar and Markdown-friendly Output Channel results.
- Staged Git context collection for commit suggestions and change review; DevPilot never creates commits or changes code automatically.

### Architecture highlights

- TypeScript VS Code Extension → local FastAPI backend → provider-neutral LLM boundary.
- Versioned YAML Prompt Registry with required-variable validation.
- Pydantic Structured Output validation and safe error mapping for malformed model results and provider failures.
- Context models, deterministic budgeting, and filters for sensitive files, binary content, ignored directories, and oversized candidates.
- Fake Provider, mocks, and synthetic evaluation fixtures for deterministic, no-cost quality checks.

### Security design

- Local-first backend URL configuration and workflow-scoped context collection.
- API keys are read only from `OPENAI_API_KEY` in the environment; `OPENAI_MODEL` is required for live workflows.
- Sensitive filenames, secret directories, and binary Git diffs are excluded before Git context is sent to the backend.
- No source persistence, automatic code modification, command execution, Git commit, push, GitHub API, or Marketplace publishing.

### Installation

```powershell
cd apps/api
uv sync --all-groups
$env:OPENAI_API_KEY = "your-api-key"
$env:OPENAI_MODEL = "your-model-name"
uv run uvicorn devtool_api.main:app --reload

cd ../extension
npm ci
npm run package
code --install-extension dist/devpilot.vsix
```

The `v0.1.0` Git tag should be created from the release commit after it is pushed. The tag-triggered GitHub Actions workflow packages the Extension and uploads the `.vsix` as an artifact.
