"""Structured output parsing and validation exceptions."""


class StructuredOutputError(Exception):
    """Base exception for structured output failures."""


class StructuredOutputParseError(StructuredOutputError):
    """Raised when an LLM response does not contain valid JSON."""


class StructuredOutputValidationError(StructuredOutputError):
    """Raised when valid JSON does not satisfy the required schema."""
