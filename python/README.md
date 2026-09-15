# promtexpress

Official Python client for the [PromtExpress](https://promtexpress.com) API. Standard library only, Python 3.9+.

```bash
pip install promtexpress
```

## Usage

```python
from promtexpress import PromtExpress

client = PromtExpress()  # reads PROMTEXPRESS_API_KEY

result = client.generate(
    "product launch email for a note-taking app, friendly tone",
    "text",  # text | code | image | video | audio | music
)
print(result["output"])
print(result["creditsRemaining"], "credits left")
```

### Clarifying questions and iteration

```python
if result.get("chipQuestions"):
    better = client.generate(
        "product launch email for a note-taking app",
        "text",
        answers=[{"question": result["chipQuestions"][0]["label"], "answer": "developers"}],
    )

refined = client.generate(
    "product launch email for a note-taking app",
    "text",
    iteration={"ofPromptId": result["promptId"], "feedback": "shorter, mention the free tier"},
)
```

### Templates and history

```python
templates = client.list_templates(modality="image")

page = client.list_history(page=0, limit=50)

for entry in client.iter_history(modality="video"):
    print(entry["date"], entry["title"])
```

## API key scopes

Create keys in the PromtExpress dashboard under **API Keys**. The `read` scope covers `list_templates`, `list_history` and `iter_history`; `generate` covers `generate` (consumes credits); `admin` allows everything. Each key has its own rate limit.

## Errors

All errors inherit from `PromtExpressError`: `InvalidRequestError` (400), `AuthenticationError` (401), `PermissionDeniedError` (403, with `missing_scope`), `InsufficientCreditsError` (402, with `remaining` and `required`), `RateLimitError` (429, with `retry_after`), `ServerError` (5xx) and `APIConnectionError` (network or timeout).

Time-based rate limits are retried automatically (`max_retries`, default 2).

## Contributors

Everyone who has shipped a commit or authored a template in [promtexpress-oss](https://github.com/WebitroHQ/promtexpress-oss). New templates, translations and fixes are welcome: see the [open issues](https://github.com/WebitroHQ/promtexpress-oss/issues).

<!-- contributors:start -->
<table>
  <tr>
    <td align="center" valign="top" width="14%"><a href="https://github.com/SpicesFire"><img src="https://github.com/SpicesFire.png?size=100" width="64" height="64" alt="SpicesFire"/><br/><sub><b>SpicesFire</b></sub></a><br/><sub>11 commits · 10 templates</sub></td>
    <td align="center" valign="top" width="14%"><a href="https://github.com/resularabaci"><img src="https://github.com/resularabaci.png?size=100" width="64" height="64" alt="resularabaci"/><br/><sub><b>resularabaci</b></sub></a><br/><sub>2 commits · 2 templates</sub></td>
  </tr>
</table>
<!-- contributors:end -->

## License

MIT
