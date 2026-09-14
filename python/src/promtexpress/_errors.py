from __future__ import annotations

from typing import Any, Mapping, Optional


class PromtExpressError(Exception):
    """Base class for every error raised by this SDK."""


class APIError(PromtExpressError):
    """The API responded with a non-2xx status."""

    def __init__(self, status: int, message: str, body: Any) -> None:
        super().__init__(message)
        self.status = status
        self.message = message
        self.body = body


class InvalidRequestError(APIError):
    """400: the request body failed server-side validation."""


class AuthenticationError(APIError):
    """401: the API key is missing, invalid, expired or revoked."""


class PermissionDeniedError(APIError):
    """403: the API key is valid but lacks the scope this endpoint needs (read, generate or admin)."""

    def __init__(self, status: int, message: str, body: Any) -> None:
        super().__init__(status, message, body)
        error = _string_field(body, "error") or ""
        prefix = "missing scope:"
        scope = error[len(prefix):].strip() if error.lower().startswith(prefix) else ""
        #: The scope the key is missing, e.g. "generate"; None if the API did not say.
        self.missing_scope = scope or None


class InsufficientCreditsError(APIError):
    """402: not enough credits left for this generation."""

    def __init__(self, status: int, message: str, body: Any) -> None:
        super().__init__(status, message, body)
        self.remaining = _number_field(body, "remaining")
        self.required = _number_field(body, "required")


class RateLimitError(APIError):
    """429: rate limited, or the iteration limit for a prompt was reached."""

    def __init__(self, status: int, message: str, body: Any, retry_after: Optional[float]) -> None:
        super().__init__(status, message, body)
        #: Seconds to wait before retrying; None when the limit is not time-based.
        self.retry_after = retry_after


class ServerError(APIError):
    """5xx: the generation pipeline or an upstream engine failed."""


class APIConnectionError(PromtExpressError):
    """The request never got a response: network failure or timeout."""


def error_from_response(status: int, body: Any, headers: Mapping[str, str]) -> APIError:
    message = _describe(status, body)
    if status == 400:
        return InvalidRequestError(status, message, body)
    if status == 401:
        return AuthenticationError(status, message, body)
    if status == 402:
        return InsufficientCreditsError(status, message, body)
    if status == 403:
        return PermissionDeniedError(status, message, body)
    if status == 429:
        retry_after = _number_field(body, "retryAfterSec")
        if retry_after is None:
            retry_after = _parse_retry_after(headers.get("Retry-After"))
        return RateLimitError(status, message, body, retry_after)
    if status >= 500:
        return ServerError(status, message, body)
    return APIError(status, message, body)


def _describe(status: int, body: Any) -> str:
    error = _string_field(body, "error")
    detail = _string_field(body, "message")
    if error and detail:
        return f"{error}: {detail}"
    return error or detail or f"HTTP {status}"


def _parse_retry_after(value: Optional[str]) -> Optional[float]:
    if value is None:
        return None
    try:
        seconds = float(value)
    except ValueError:
        return None
    return seconds if seconds >= 0 else None


def _number_field(body: Any, key: str) -> Optional[float]:
    value = body.get(key) if isinstance(body, dict) else None
    return value if isinstance(value, (int, float)) and not isinstance(value, bool) else None


def _string_field(body: Any, key: str) -> Optional[str]:
    value = body.get(key) if isinstance(body, dict) else None
    return value if isinstance(value, str) and value else None
