"""Prompt registry exceptions."""


class PromptRegistryError(Exception):
    """Base exception for prompt registry failures."""


class PromptNotFoundError(PromptRegistryError):
    """Raised when a requested prompt definition does not exist."""


class PromptValidationError(PromptRegistryError):
    """Raised when prompt metadata or variables are invalid."""
