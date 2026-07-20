import pytest

from devtool_api.context import (
    ContextCollectionRequest,
    ContextCollectionResult,
    FakeContextCollector,
    WorkspaceContext,
)


def test_fake_collector_returns_configured_context_and_records_request() -> None:
    result = ContextCollectionResult(
        context=WorkspaceContext(workspace_root="/workspace")
    )
    collector = FakeContextCollector(result=result)
    request = ContextCollectionRequest(
        workspace_root="/workspace",
        include_paths=["src/main.py"],
        max_files=1,
    )

    returned = collector.collect(request)

    assert returned is result
    assert collector.requests == [request]
    assert request.include_paths == ("src/main.py",)


@pytest.mark.parametrize(
    ("kwargs", "message"),
    [
        ({"workspace_root": ""}, "workspace_root must not be empty"),
        (
            {"workspace_root": "/workspace", "max_files": -1},
            "max_files must not be negative",
        ),
    ],
)
def test_collection_request_rejects_invalid_values(
    kwargs: dict[str, object], message: str
) -> None:
    with pytest.raises(ValueError, match=message):
        ContextCollectionRequest(**kwargs)  # type: ignore[arg-type]
