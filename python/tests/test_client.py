import json
import os
import threading
import unittest
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from urllib.parse import parse_qs, urlparse

from promtexpress import (
    APIConnectionError,
    AuthenticationError,
    InsufficientCreditsError,
    PromtExpress,
    PromtExpressError,
    RateLimitError,
    ServerError,
)

RESULT = {
    "promptId": "p_1",
    "output": "You are a senior copywriter...",
    "creditsUsed": 2,
    "creditsRemaining": 98,
    "latencyMs": 1200,
    "validationScore": 0.92,
    "validationIssues": [],
    "assumptions": [],
    "traceId": "t_1",
    "scenario": "A",
    "recentEntry": {"id": "p_1", "mod": "text", "title": "t", "userInput": "u", "date": "d"},
}


class MockApi:
    """A real HTTP server that replays scripted responses and records requests."""

    def __init__(self):
        self.responses = []
        self.requests = []
        api = self

        class Handler(BaseHTTPRequestHandler):
            def _reply(self):
                length = int(self.headers.get("Content-Length") or 0)
                raw = self.rfile.read(length) if length else b""
                api.requests.append(
                    {
                        "method": self.command,
                        "url": urlparse(self.path),
                        "headers": dict(self.headers),
                        "body": json.loads(raw) if raw else None,
                    }
                )
                status, body, headers = api.responses.pop(0)
                payload = json.dumps(body).encode()
                self.send_response(status)
                self.send_header("Content-Type", "application/json")
                self.send_header("Content-Length", str(len(payload)))
                for key, value in headers.items():
                    self.send_header(key, value)
                self.end_headers()
                self.wfile.write(payload)

            do_GET = _reply
            do_POST = _reply

            def log_message(self, *args):
                pass

        self.server = ThreadingHTTPServer(("127.0.0.1", 0), Handler)
        self.base_url = f"http://127.0.0.1:{self.server.server_address[1]}/api/v1"
        threading.Thread(target=self.server.serve_forever, daemon=True).start()

    def reply(self, status, body, headers=None):
        self.responses.append((status, body, headers or {}))

    def close(self):
        self.server.shutdown()
        self.server.server_close()


class ClientTest(unittest.TestCase):
    def setUp(self):
        os.environ.pop("PROMTEXPRESS_API_KEY", None)
        os.environ.pop("PROMTEXPRESS_BASE_URL", None)
        self.api = MockApi()
        self.client = PromtExpress("pe_test_py", base_url=self.api.base_url + "/")

    def tearDown(self):
        self.api.close()

    def test_generate_sends_authenticated_json(self):
        self.api.reply(200, RESULT)

        result = self.client.generate("launch email for a CRM", "text", target_engine_id="eng_1")

        self.assertEqual(result["output"], RESULT["output"])
        request = self.api.requests[0]
        self.assertEqual(request["method"], "POST")
        self.assertEqual(request["url"].path, "/api/v1/generate")
        self.assertEqual(request["headers"]["Authorization"], "Bearer pe_test_py")
        self.assertEqual(
            request["body"],
            {"intent": "launch email for a CRM", "modality": "text", "targetEngineId": "eng_1"},
        )

    def test_reads_api_key_from_environment(self):
        os.environ["PROMTEXPRESS_API_KEY"] = "pe_test_env"
        self.api.reply(200, {"templates": []})

        PromtExpress(base_url=self.api.base_url).list_templates()

        self.assertEqual(self.api.requests[0]["headers"]["Authorization"], "Bearer pe_test_env")

    def test_missing_api_key(self):
        with self.assertRaises(PromtExpressError):
            PromtExpress()

    def test_validates_before_calling_api(self):
        with self.assertRaisesRegex(PromtExpressError, "3 to 4000"):
            self.client.generate("hi", "text")
        with self.assertRaisesRegex(PromtExpressError, "modality"):
            self.client.generate("hello there", "poem")
        self.assertEqual(self.api.requests, [])

    def test_authentication_error(self):
        self.api.reply(401, {"error": "Invalid or inactive API key"})

        with self.assertRaises(AuthenticationError) as ctx:
            self.client.list_templates()
        self.assertEqual(ctx.exception.status, 401)
        self.assertEqual(str(ctx.exception), "Invalid or inactive API key")

    def test_insufficient_credits(self):
        self.api.reply(402, {"error": "Insufficient credits", "remaining": 1, "required": 4})

        with self.assertRaises(InsufficientCreditsError) as ctx:
            self.client.generate("a product video", "video")
        self.assertEqual((ctx.exception.remaining, ctx.exception.required), (1, 4))

    def test_retries_time_based_rate_limit(self):
        self.api.reply(429, {"error": "Rate limit exceeded", "retryAfterSec": 0}, {"Retry-After": "0"})
        self.api.reply(200, RESULT)

        self.assertEqual(self.client.generate("launch email", "text")["promptId"], "p_1")
        self.assertEqual(len(self.api.requests), 2)

    def test_does_not_retry_iteration_limit(self):
        self.api.reply(429, {"error": "Iteration limit reached"})

        with self.assertRaises(RateLimitError) as ctx:
            self.client.generate("launch email", "text")
        self.assertIsNone(ctx.exception.retry_after)
        self.assertEqual(len(self.api.requests), 1)

    def test_server_error_includes_pipeline_message(self):
        self.api.reply(503, {"error": "Pipeline error at layer 4", "message": "synth timeout"})

        with self.assertRaises(ServerError) as ctx:
            self.client.generate("launch email", "text")
        self.assertEqual(str(ctx.exception), "Pipeline error at layer 4: synth timeout")

    def test_connection_error(self):
        client = PromtExpress("k", base_url="http://127.0.0.1:9/api/v1", timeout=2)
        with self.assertRaises(APIConnectionError):
            client.list_history()

    def test_iter_history_walks_all_pages(self):
        def row(i):
            return {"id": i, "title": i, "modality": "Text", "engine": "e", "credits": 1, "date": "d", "status": "Done", "userInput": i, "result": "r"}

        self.api.reply(200, {"rows": [row("a"), row("b")], "total": 3, "page": 0, "pageSize": 2})
        self.api.reply(200, {"rows": [row("c")], "total": 3, "page": 1, "pageSize": 2})

        ids = [entry["id"] for entry in self.client.iter_history(limit=2, modality="text")]

        self.assertEqual(ids, ["a", "b", "c"])
        queries = [parse_qs(r["url"].query) for r in self.api.requests]
        self.assertEqual([q["page"] for q in queries], [["0"], ["1"]])
        self.assertEqual(queries[0]["modality"], ["text"])


if __name__ == "__main__":
    unittest.main()
