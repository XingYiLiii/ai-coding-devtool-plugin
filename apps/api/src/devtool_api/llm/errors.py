"""Project-level LLM exceptions."""


class LLMError(Exception):
    """Base exception for LLM integration failures."""


class LLMConfigurationError(LLMError):
    """Raised when required LLM configuration is unavailable or invalid."""


class LLMProviderError(LLMError):
    """Raised when an LLM provider request fails."""


class LLMProviderTimeoutError(LLMProviderError):
    """Raised when an LLM provider request exceeds its timeout."""
