from __future__ import annotations

import json
import os
import socket
import time
import urllib.error
import urllib.parse
import urllib.request
from typing import Any, Dict, Iterator, List, Mapping, Optional, Sequence

from ._errors import APIConnectionError, PromtExpressError, RateLimitError, error_from_response
from ._types import Answer, GenerateResult, HistoryPage, HistoryRow, Iteration, Template

DEFAULT_BASE_URL = "https://promtexpress.com/api/v1"
MODALITIES = ("text", "code", "image", "video", "audio", "music")

_USER_AGENT = "promtexpress-python/0.2.1"


class PromtExpress:
    """Client for the PromtExpress API.

    >>> client = PromtExpress()  # reads PROMTEXPRESS_API_KEY
    >>> result = client.generate("launch email for my CRM", "text")
    >>> print(result["output"])
    """

    def __init__(
        self,
        api_key: Optional[str] = None,
        *,
        base_url: Optional[str] = None,
        timeout: float = 120.0,
        max_retries: int = 2,
    ) -> None:
        api_key = api_key or os.environ.get("PROMTEXPRESS_API_KEY")
        if not api_key:
            raise PromtExpressError(
                "Missing API key: pass api_key or set PROMTEXPRESS_API_KEY. "
                "Keys are created in the PromtExpress dashboard under API Keys."
            )
        self.base_url = (base_url or os.environ.get("PROMTEXPRESS_BASE_URL") or DEFAULT_BASE_URL).rstrip("/")
        self._api_key = api_key
        self._timeout = timeout
        self._max_retries = max_retries

    def generate(
        self,
        intent: str,
        modality: str,
        *,
        target_engine_id: Optional[str] = None,
        answers: Optional[Sequence[Answer]] = None,
        iteration: Optional[Iteration] = None,
    ) -> GenerateResult:
        """Compile a plain-language intent into a production-ready prompt. Consumes credits."""
        if not isinstance(intent, str) or not 3 <= len(intent) <= 4000:
            raise PromtExpressError("intent must be a string of 3 to 4000 characters")
        if modality not in MODALITIES:
            raise PromtExpressError(f"modality must be one of: {', '.join(MODALITIES)}")
        if answers is not None and len(answers) > 10:
            raise PromtExpressError("answers accepts at most 10 items")

        body: Dict[str, Any] = {"intent": intent, "modality": modality}
        if target_engine_id is not None:
            body["targetEngineId"] = target_engine_id
        if answers:
            body["answers"] = list(answers)
        if iteration:
            body["iteration"] = dict(iteration)
        return self._request("POST", "/generate", body=body)

    def list_templates(self, modality: Optional[str] = None) -> List[Template]:
        """List published prompt templates."""
        return self._request("GET", "/templates", query={"modality": modality})["templates"]

    def list_history(self, *, page: int = 0, limit: int = 20, modality: Optional[str] = None) -> HistoryPage:
        """Fetch one page of your generation history, newest first."""
        return self._request("GET", "/history", query={"page": page, "limit": limit, "modality": modality})

    def iter_history(self, *, limit: int = 100, modality: Optional[str] = None) -> Iterator[HistoryRow]:
        """Walk your whole generation history, requesting pages as needed."""
        page = 0
        while True:
            result = self.list_history(page=page, limit=limit, modality=modality)
            yield from result["rows"]
            if not result["rows"] or (page + 1) * result["pageSize"] >= result["total"]:
                return
            page += 1

    def _request(
        self,
        method: str,
        path: str,
        *,
        query: Optional[Mapping[str, Any]] = None,
        body: Optional[Mapping[str, Any]] = None,
    ) -> Any:
        url = self.base_url + path
        params = {key: value for key, value in (query or {}).items() if value is not None}
        if params:
            url += "?" + urllib.parse.urlencode(params)

        headers = {
            "Authorization": f"Bearer {self._api_key}",
            "Accept": "application/json",
            "User-Agent": _USER_AGENT,
        }
        data = None
        if body is not None:
            headers["Content-Type"] = "application/json"
            data = json.dumps(body).encode("utf-8")

        attempt = 0
        while True:
            request = urllib.request.Request(url, data=data, headers=headers, method=method)
            try:
                with urllib.request.urlopen(request, timeout=self._timeout) as response:
                    return _parse(response.read())
            except urllib.error.HTTPError as exc:
                error = error_from_response(exc.code, _parse(exc.read()), exc.headers)
                # The API rejects rate-limited calls before charging credits, so retrying is safe even for generate.
                if isinstance(error, RateLimitError) and error.retry_after is not None and attempt < self._max_retries:
                    attempt += 1
                    time.sleep(error.retry_after)
                    continue
                raise error from None
            except (urllib.error.URLError, socket.timeout, TimeoutError, ConnectionError) as exc:
                reason = getattr(exc, "reason", exc)
                raise APIConnectionError(f"Could not reach {self.base_url}: {reason}") from exc


def _parse(raw: bytes) -> Any:
    if not raw:
        return None
    text = raw.decode("utf-8", errors="replace")
    try:
        return json.loads(text)
    except ValueError:
        return text
