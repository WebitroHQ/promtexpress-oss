# promtexpress

Official JavaScript / TypeScript client for the [PromtExpress](https://promtexpress.com) API. Zero dependencies, works in Node.js 18+, Deno, Bun and edge runtimes.

```bash
npm install promtexpress
```

## Usage

```ts
import { PromtExpress } from "promtexpress";

const client = new PromtExpress({ apiKey: process.env.PROMTEXPRESS_API_KEY });

const result = await client.generate({
  intent: "product launch email for a note-taking app, friendly tone",
  modality: "text", // text | code | image | video | audio | music
});

console.log(result.output);
console.log(`${result.creditsRemaining} credits left`);
```

### Clarifying questions and iteration

When an intent is underspecified, the result includes `chipQuestions`. Answer them to get a sharper prompt, or refine an existing prompt with feedback:

```ts
if (result.chipQuestions?.length) {
  const better = await client.generate({
    intent: "product launch email for a note-taking app",
    modality: "text",
    answers: [{ question: result.chipQuestions[0].label, answer: "developers" }],
  });
}

const refined = await client.generate({
  intent: "product launch email for a note-taking app",
  modality: "text",
  iteration: { ofPromptId: result.promptId, feedback: "shorter, and mention the free tier" },
});
```

### Templates and history

```ts
const templates = await client.listTemplates({ modality: "image" });

const page = await client.listHistory({ page: 0, limit: 50 });

for await (const entry of client.paginateHistory({ modality: "video" })) {
  console.log(entry.date, entry.title);
}
```

## API key scopes

Keys are created in the PromtExpress dashboard under **API Keys**, each with one or more scopes:

| Scope | Allows |
|---|---|
| `read` | `listTemplates`, `listHistory`, `paginateHistory` |
| `generate` | `generate` (consumes credits) |
| `admin` | everything above |

Each key also has its own rate limit; exceeding it returns a `RateLimitError` with `retryAfterSec`.

## Errors

Every error extends `PromtExpressError`:

| Class | When |
|---|---|
| `InvalidRequestError` | 400: request failed validation |
| `AuthenticationError` | 401: key missing, invalid, expired or revoked |
| `PermissionDeniedError` | 403: the key lacks a scope; has `missingScope` |
| `InsufficientCreditsError` | 402: has `remaining` and `required` |
| `RateLimitError` | 429: has `retryAfterSec` (null for the per-prompt iteration limit) |
| `ServerError` | 5xx: generation pipeline or upstream engine failure |
| `APIConnectionError` | network failure or timeout |

Time-based rate limits are retried automatically (`maxRetries`, default 2). Rate-limited calls are never charged.

## Options

| Option | Default |
|---|---|
| `apiKey` | `PROMTEXPRESS_API_KEY` env var |
| `baseUrl` | `PROMTEXPRESS_BASE_URL` env var, then `https://promtexpress.com/api/v1` |
| `timeoutMs` | `120000` |
| `maxRetries` | `2` |
| `fetch` | `globalThis.fetch` |

## License

MIT
