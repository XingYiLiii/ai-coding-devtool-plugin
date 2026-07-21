# Architecture

DevPilot uses a local client/server boundary so VS Code UI concerns, workflow orchestration, and LLM-provider concerns remain independently testable.

```text
┌──────────────────────── VS Code Extension ────────────────────────┐
│ Commands · status bar · Output Channel · BackendClient             │
│ Selected editor text · language ID · safe staged Git text diffs    │
└──────────────────────────────────┬────────────────────────────────┘
                                   │ HTTP to devpilot.backendUrl
┌──────────────────────────────────▼────────────────────────────────┐
│ Local FastAPI Backend                                               │
│ API request validation · workflow use cases · safe error mapping   │
│ Prompt Registry · Structured Output parser                         │
└──────────────────────────────────┬────────────────────────────────┘
                                   │ provider-neutral request
┌──────────────────────────────────▼────────────────────────────────┐
│ LLM Layer                                                          │
│ OpenAI Provider for local use · Fake Provider / mocks for tests    │
└───────────────────────────────────────────────────────────────────┘
```

## Workflow boundary

Each workflow follows the same predictable path:

```text
caller input → Pydantic request model → Prompt Registry → LLM Provider
             → Structured Output parser → Pydantic response model
```

The backend exposes four workflows: Explain Code, Development Plan, Commit Message, and Change Review. The Extension owns VS Code interaction and display; the backend does not invoke VS Code APIs, scan the workspace, or execute Git commands.

## Context boundary

Context is modeled as an explicit component rather than an implicit prompt append:

- `ContextSecurityFilter` rejects sensitive filenames, ignored directories, binary content, and oversized candidates.
- `ContextBudgeter` applies deterministic file and character limits after collection.
- Explain Code receives the active selection only.
- Git workflows collect staged changes only and filter `.env*`, key/certificate files, `credentials`, `secrets`, and binary diffs before sending context.

The current MVP does not perform a workspace-wide scan, read arbitrary files, or use RAG.

## Reliability boundary

- Prompt files are versioned YAML and required variables are validated before a provider call.
- LLM responses are parsed as JSON and validated with workflow-specific Pydantic schemas.
- Configuration, provider timeout, provider failure, malformed output, and prompt errors are mapped to safe API responses.
- The Provider interface keeps tests deterministic: CI uses Fake Providers and mocks rather than the OpenAI API.

## Delivery boundary

GitHub Actions runs backend and Extension quality checks on pushes and pull requests. A `v*` tag builds `devpilot.vsix` and uploads it as a workflow artifact; it does not publish to the VS Code Marketplace.
