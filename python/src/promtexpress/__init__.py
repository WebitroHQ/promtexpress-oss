"""Official Python client for the PromtExpress API."""

from ._client import DEFAULT_BASE_URL, MODALITIES, PromtExpress
from ._errors import (
    APIConnectionError,
    APIError,
    AuthenticationError,
    InsufficientCreditsError,
    InvalidRequestError,
    PromtExpressError,
    RateLimitError,
    ServerError,
)

__version__ = "0.1.0"

__all__ = [
    "DEFAULT_BASE_URL",
    "MODALITIES",
    "PromtExpress",
    "PromtExpressError",
    "APIError",
    "APIConnectionError",
    "InvalidRequestError",
    "AuthenticationError",
    "InsufficientCreditsError",
    "RateLimitError",
    "ServerError",
]
