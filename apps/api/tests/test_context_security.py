import pytest

from devtool_api.context import ContextSecurityConfig, ContextSecurityFilter


@pytest.mark.parametrize(
    ("path", "reason"),
    [
        (".env.local", "sensitive_file"),
        ("certificates/service.pem", "sensitive_file"),
        ("node_modules/package/index.js", "ignored_directory"),
        ("src/secrets/config.py", "ignored_directory"),
    ],
)
def test_filter_rejects_sensitive_paths(path: str, reason: str) -> None:
    decision = ContextSecurityFilter().evaluate(path=path, size=100)

    assert decision.allowed is False
    assert decision.reason == reason


def test_filter_allows_regular_source_file() -> None:
    decision = ContextSecurityFilter().evaluate(
        path="src/main.py",
        size=100,
        content=b"print('hello')\n",
    )

    assert decision.allowed is True
    assert decision.reason is None


def test_filter_rejects_large_file() -> None:
    security_filter = ContextSecurityFilter(ContextSecurityConfig(max_file_size=10))

    decision = security_filter.evaluate(path="src/main.py", size=11)

    assert decision.allowed is False
    assert decision.reason == "file_too_large"


def test_filter_rejects_binary_content() -> None:
    decision = ContextSecurityFilter().evaluate(
        path="assets/logo.png",
        size=4,
        content=b"\x89PNG\x00",
    )

    assert decision.allowed is False
    assert decision.reason == "binary_file"
