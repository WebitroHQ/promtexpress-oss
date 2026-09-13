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

## Errors

All errors inherit from `PromtExpressError`: `InvalidRequestError` (400), `AuthenticationError` (401), `InsufficientCreditsError` (402, with `remaining` and `required`), `RateLimitError` (429, with `retry_after`), `ServerError` (5xx) and `APIConnectionError` (network or timeout).

Time-based rate limits are retried automatically (`max_retries`, default 2).

## License

MIT
