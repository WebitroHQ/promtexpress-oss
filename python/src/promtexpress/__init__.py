"""Official Python client for the PromtExpress API."""

from ._client import DEFAULT_BASE_URL, MODALITIES, PromtExpress
from ._errors import (
    APIConnectionError,
    APIError,
    AuthenticationError,
    InsufficientCreditsError,
    InvalidRequestError,
    PermissionDeniedError,
    PromtExpressError,
    RateLimitError,
    ServerError,
)

__version__ = "0.2.1"

__all__ = [
    "DEFAULT_BASE_URL",
    "MODALITIES",
    "PromtExpress",
    "PromtExpressError",
    "APIError",
    "APIConnectionError",
    "InvalidRequestError",
    "AuthenticationError",
    "PermissionDeniedError",
    "InsufficientCreditsError",
    "RateLimitError",
    "ServerError",
]
