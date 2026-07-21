# Three-Minute Demo Guide

This demo shows a complete developer-tool workflow while keeping the user in control. Use a small non-sensitive sample repository with one staged text change.

## Before the demo

1. Start the backend with `OPENAI_API_KEY` and `OPENAI_MODEL` set in the environment.
2. Install `apps/extension/dist/devpilot.vsix` in VS Code.
3. Open a sample project and confirm the status bar shows `DevPilot: Ready`.
4. Stage one small source-code change. Do not stage `.env`, certificate, or binary files.

## 0:00–0:20 — Establish the architecture

Open the repository README and summarize the boundary: VS Code Extension → local FastAPI → LLM Provider. State that the Extension sends scoped input and only displays suggestions.

## 0:20–0:55 — Explain selected code

1. Select a short function in the active editor.
2. Run **DevPilot: Explain Selected Code** from the Command Palette.
3. Show the Output Channel sections: summary, explanation, key points, and risks.
4. Emphasize that the command uses the selected text, not the entire workspace.

## 0:55–1:30 — Generate a development plan

1. Run **DevPilot: Generate Development Plan**.
2. Enter a small request, such as “Add validation for an optional query parameter.”
3. Show requirement understanding, assumptions, implementation steps, validation steps, risks, and out-of-scope work.
4. Explain that this is a plan for developer review, not an automatic code change.

## 1:30–2:10 — Commit message from staged context

1. Run **DevPilot: Generate Commit Message**.
2. Show the Conventional Commit subject, body, and type.
3. Point out that DevPilot reads staged changes only and never invokes `git commit`.

## 2:10–2:45 — Review staged changes

1. Run **DevPilot: Review Staged Changes**.
2. Show the summary, evidence-backed findings, and testing recommendations.
3. If there are no clear issues, call out that `findings: []` is a valid and preferable result to speculation.

## 2:45–3:00 — Close with safety and quality

Highlight sensitive-file filtering, API keys sourced only from environment variables, structured output validation, Fake Provider tests, and offline evaluation fixtures. End by stating that every proposed action remains subject to developer approval.
