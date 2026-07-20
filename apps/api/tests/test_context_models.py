import pytest

from devtool_api.context import ContextMetadata, FileContext, WorkspaceContext


def test_workspace_context_can_be_created_in_memory() -> None:
    file_context = FileContext(
        path="src/main.py",
        language="python",
        size=120,
        content_summary="Application entry point.",
    )
    metadata = ContextMetadata(source="extension", total_files=1, total_size=120)

    context = WorkspaceContext(
        workspace_root="/workspace",
        files=[file_context],
        metadata=metadata,
    )

    assert context.files == (file_context,)
    assert context.metadata.total_files == 1


@pytest.mark.parametrize(
    ("factory", "message"),
    [
        (lambda: FileContext(path="", size=0), "path must not be empty"),
        (lambda: FileContext(path="src/main.py", size=-1), "size must not be negative"),
        (lambda: ContextMetadata(total_files=-1), "total_files must not be negative"),
        (
            lambda: WorkspaceContext(workspace_root=""),
            "workspace_root must not be empty",
        ),
    ],
)
def test_context_models_reject_invalid_values(factory: object, message: str) -> None:
    with pytest.raises(ValueError, match=message):
        factory()  # type: ignore[operator]
