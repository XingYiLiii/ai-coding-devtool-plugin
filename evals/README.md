# Offline Evaluation Fixtures

This directory contains deterministic, synthetic fixtures for reviewing the four MVP AI workflows. They are not runtime prompts, golden LLM outputs, or production user data.

Each workflow fixture provides:

- a minimal, non-sensitive input shape;
- observable quality criteria used for manual review or future offline evaluation; and
- a link to the shared scoring rubric in [QUALITY_RUBRICS.md](QUALITY_RUBRICS.md).

The repository's CI runs only Fake/Mock-based tests. It does not set `OPENAI_API_KEY`, call OpenAI, or evaluate these fixtures against a paid model.

| Workflow | Fixture |
| --- | --- |
| Explain Code | [explanations/basic-python.json](explanations/basic-python.json) |
| Development Plan | [plans/health-endpoint.json](plans/health-endpoint.json) |
| Commit Message | [commits/add-health-endpoint.json](commits/add-health-endpoint.json) |
| Change Review | [reviews/missing-input-validation.json](reviews/missing-input-validation.json) |
