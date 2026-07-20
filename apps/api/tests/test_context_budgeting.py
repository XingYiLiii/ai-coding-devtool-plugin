from devtool_api.context import (
    ContextBudget,
    ContextBudgeter,
    FileContext,
    WorkspaceContext,
)


def test_budgeter_returns_small_context_unchanged() -> None:
    context = WorkspaceContext(
        workspace_root="/workspace",
        files=(FileContext(path="src/main.py", content_summary="print('ok')"),),
    )

    result = ContextBudgeter().apply(
        context, ContextBudget(max_files=2, max_characters=20)
    )

    assert result is context


def test_budgeter_prioritizes_files_and_hard_cuts_summary_at_character_limit() -> None:
    context = WorkspaceContext(
        workspace_root="/workspace",
        files=(
            FileContext(path="src/low.py", content_summary="low", priority=1),
            FileContext(path="src/high.py", content_summary="abcd", priority=3),
            FileContext(path="src/next.py", content_summary="ef", priority=2),
        ),
    )

    result = ContextBudgeter().apply(
        context, ContextBudget(max_files=3, max_characters=5)
    )

    assert [file_context.path for file_context in result.files] == [
        "src/high.py",
        "src/next.py",
    ]
    assert [file_context.content_summary for file_context in result.files] == [
        "abcd",
        "e",
    ]


def test_budgeter_applies_file_limit_with_stable_priority_ties() -> None:
    context = WorkspaceContext(
        workspace_root="/workspace",
        files=(
            FileContext(path="src/first.py", priority=2),
            FileContext(path="src/second.py", priority=2),
            FileContext(path="src/third.py", priority=1),
        ),
    )

    result = ContextBudgeter().apply(
        context, ContextBudget(max_files=2, max_characters=0)
    )

    assert [file_context.path for file_context in result.files] == [
        "src/first.py",
        "src/second.py",
    ]
