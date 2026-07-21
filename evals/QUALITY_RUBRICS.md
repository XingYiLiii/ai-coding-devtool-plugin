# AI Workflow Quality Rubrics

Score each criterion as **0** (not met), **1** (partially met), or **2** (met). A result should be reviewed against the supplied input only; unsupported claims must not receive full credit.

## Explain Code

| Criterion | Full-credit expectation |
| --- | --- |
| Accuracy | Explains the actual control flow and behavior in the selected code. |
| Grounding | Does not infer dependencies, side effects, or risks absent from the input. |
| Structure | Includes a summary, explanation, key points, and risks; empty risks are allowed. |

## Development Plan

| Criterion | Full-credit expectation |
| --- | --- |
| Requirement understanding | Restates the requested outcome without inventing requirements. |
| Actionability | Includes ordered implementation and validation steps. |
| File grounding | Lists only files justified by supplied context; uncertainty belongs in assumptions. |
| Scope control | Separates risks and out-of-scope work from the required plan. |

## Commit Message

| Criterion | Full-credit expectation |
| --- | --- |
| Conventional Commit | Subject uses a valid Conventional Commits type and optional scope. |
| Change alignment | Subject and body describe the supplied diff summary and changed files. |
| Consistency | `commit_type` and `breaking_change` match the subject. |

## Change Review

| Criterion | Full-credit expectation |
| --- | --- |
| Evidence | Each finding cites a file, line, and evidence traceable to the supplied diff or context. |
| Precision | Reports defects rather than style preferences or speculative issues. |
| Actionability | Findings have a clear problem statement and practical suggestion. |
| Calibration | Returns an empty `findings` list when no concrete issue is supported. |
