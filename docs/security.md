# Security and Privacy

DevPilot is designed for local developer assistance with explicit boundaries. These controls reduce accidental exposure and automation risk; they do not replace an organization's security review or data-handling policy.

## Data handling

- The Extension communicates with a configurable local backend URL, defaulting to `http://127.0.0.1:8000`.
- The backend does not persist workflow request content or source code.
- Explain Code sends the current selection and language metadata only.
- Development Plan accepts caller-provided requirement text and optional summaries; it does not scan the workspace.
- Git workflows use staged changes only, not unstaged changes or full repository history.

## Filtering and bounds

Context candidates are rejected when they match the following categories:

- sensitive files: `.env*`, `*.key`, `*.pem`;
- sensitive directories: `credentials`, `secrets`;
- ignored directories: `node_modules`, `dist`, `build`;
- binary content or binary diffs; and
- files over the configured context size limit.

Staged Git collection applies its own sensitive-path and binary-diff filtering before the diff reaches the backend.

## API credentials

Live workflows require `OPENAI_API_KEY` and `OPENAI_MODEL` from the process environment. The key is not committed to the repository, stored in a database, or included in the settings object's representation. Keep credentials in your terminal/session environment or an approved local secret-management mechanism.

CI does not set an OpenAI API key and does not call a real model. Provider tests rely on Fake Providers and mocks.

## Human approval boundary

DevPilot does not:

- modify source files;
- run model-generated commands;
- create Git commits, push branches, create pull requests, or call the GitHub API; or
- automatically treat an AI suggestion as a verified defect.

Review generated plans, commit messages, and findings before taking action. For change review, an empty findings list is a valid outcome when the supplied evidence does not support a defect.

## Reporting concerns

Do not include secrets, proprietary source, or production credentials in a bug report. If you find a security issue in this repository, contact the maintainer privately rather than publishing exploit details in a public issue.
