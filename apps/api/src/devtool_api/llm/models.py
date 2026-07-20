"""Provider-neutral LLM request and response models."""

from dataclasses import dataclass, field
from typing import Literal


@dataclass(frozen=True)
class LLMMessage:
    """One message supplied to an LLM provider."""

    role: Literal["system", "user", "assistant"]
    content: str


@dataclass(frozen=True)
class LLMRequest:
    """A provider-neutral LLM generation request."""

    messages: tuple[LLMMessage, ...]


@dataclass(frozen=True)
class LLMUsage:
    """Token usage reported by an LLM provider."""

    input_tokens: int = 0
    output_tokens: int = 0


@dataclass(frozen=True)
class LLMResponse:
    """A provider-neutral LLM generation response."""

    content: str
    model: str
    usage: LLMUsage = field(default_factory=LLMUsage)
