import assert from "node:assert/strict";
import { beforeEach, describe, it } from "node:test";
import {
  APIConnectionError,
  AuthenticationError,
  InsufficientCreditsError,
  PermissionDeniedError,
  PromtExpress,
  PromtExpressError,
  RateLimitError,
  ServerError,
} from "../src/index.ts";

interface MockResponse {
  status: number;
  body: unknown;
  headers?: Record<string, string>;
}

function mockFetch(responses: MockResponse[]) {
  const calls: { url: URL; init: RequestInit }[] = [];
  const fetch = async (input: string | URL | Request, init: RequestInit = {}) => {
    calls.push({ url: new URL(String(input)), init });
    const next = responses.shift();
    if (!next) throw new Error("unexpected request");
    return new Response(JSON.stringify(next.body), {
      status: next.status,
      headers: { "content-type": "application/json", ...next.headers },
    });
  };
  return { fetch: fetch as typeof globalThis.fetch, calls };
}

const RESULT = {
  promptId: "p_1",
  output: "You are a senior copywriter...",
  creditsUsed: 2,
  creditsRemaining: 98,
  latencyMs: 1200,
  validationScore: 0.92,
  validationIssues: [],
  assumptions: [],
  traceId: "t_1",
  scenario: "A",
  recentEntry: { id: "p_1", mod: "text", title: "Launch email", userInput: "launch email", date: "now" },
};

describe("PromtExpress", () => {
  beforeEach(() => {
    delete process.env.PROMTEXPRESS_API_KEY;
    delete process.env.PROMTEXPRESS_BASE_URL;
  });

  it("sends an authenticated generate request and returns the result", async () => {
    const { fetch, calls } = mockFetch([{ status: 200, body: RESULT }]);
    const client = new PromtExpress({ apiKey: "pe_test_abc", fetch });

    const result = await client.generate({ intent: "launch email for a CRM", modality: "text" });

    assert.equal(result.output, RESULT.output);
    assert.equal(calls.length, 1);
    assert.equal(calls[0].url.href, "https://promtexpress.com/api/v1/generate");
    assert.equal(calls[0].init.method, "POST");
    const headers = calls[0].init.headers as Record<string, string>;
    assert.equal(headers.Authorization, "Bearer pe_test_abc");
    assert.deepEqual(JSON.parse(String(calls[0].init.body)), { intent: "launch email for a CRM", modality: "text" });
  });

  it("reads the API key and base URL from the environment", async () => {
    process.env.PROMTEXPRESS_API_KEY = "pe_test_env";
    process.env.PROMTEXPRESS_BASE_URL = "http://localhost:3010/api/v1/";
    const { fetch, calls } = mockFetch([{ status: 200, body: { templates: [] } }]);

    await new PromtExpress({ fetch }).listTemplates();

    assert.equal(calls[0].url.href, "http://localhost:3010/api/v1/templates");
    assert.equal((calls[0].init.headers as Record<string, string>).Authorization, "Bearer pe_test_env");
  });

  it("refuses to start without an API key", () => {
    assert.throws(() => new PromtExpress({ fetch: mockFetch([]).fetch }), PromtExpressError);
  });

  it("validates generate params before calling the API", async () => {
    const { fetch, calls } = mockFetch([]);
    const client = new PromtExpress({ apiKey: "k", fetch });

    await assert.rejects(client.generate({ intent: "hi", modality: "text" }), /3 to 4000/);
    await assert.rejects(client.generate({ intent: "hello there", modality: "poem" as never }), /modality/);
    assert.equal(calls.length, 0);
  });

  it("maps 401 to AuthenticationError", async () => {
    const { fetch } = mockFetch([{ status: 401, body: { error: "Invalid or inactive API key" } }]);
    const client = new PromtExpress({ apiKey: "bad", fetch });

    await assert.rejects(client.listTemplates(), (err: unknown) => {
      assert.ok(err instanceof AuthenticationError);
      assert.equal(err.status, 401);
      assert.equal(err.message, "Invalid or inactive API key");
      return true;
    });
  });

  it("maps 403 to PermissionDeniedError and exposes the missing scope", async () => {
    const { fetch, calls } = mockFetch([{ status: 403, body: { error: "Missing scope: generate" } }]);
    const client = new PromtExpress({ apiKey: "k", fetch });

    await assert.rejects(client.generate({ intent: "launch email", modality: "text" }), (err: unknown) => {
      assert.ok(err instanceof PermissionDeniedError);
      assert.equal(err.status, 403);
      assert.equal(err.missingScope, "generate");
      return true;
    });
    assert.equal(calls.length, 1);
  });

  it("exposes remaining and required credits on 402", async () => {
    const { fetch } = mockFetch([{ status: 402, body: { error: "Insufficient credits", remaining: 1, required: 4 } }]);
    const client = new PromtExpress({ apiKey: "k", fetch });

    await assert.rejects(client.generate({ intent: "a product video", modality: "video" }), (err: unknown) => {
      assert.ok(err instanceof InsufficientCreditsError);
      assert.equal(err.remaining, 1);
      assert.equal(err.required, 4);
      return true;
    });
  });

  it("retries a time-based 429 and then succeeds", async () => {
    const { fetch, calls } = mockFetch([
      { status: 429, body: { error: "Rate limit exceeded", retryAfterSec: 0 }, headers: { "retry-after": "0" } },
      { status: 200, body: RESULT },
    ]);
    const client = new PromtExpress({ apiKey: "k", fetch });

    const result = await client.generate({ intent: "launch email", modality: "text" });

    assert.equal(result.promptId, "p_1");
    assert.equal(calls.length, 2);
  });

  it("does not retry a 429 without a retry delay", async () => {
    const { fetch, calls } = mockFetch([{ status: 429, body: { error: "Iteration limit reached" } }]);
    const client = new PromtExpress({ apiKey: "k", fetch });

    await assert.rejects(client.generate({ intent: "launch email", modality: "text" }), (err: unknown) => {
      assert.ok(err instanceof RateLimitError);
      assert.equal(err.retryAfterSec, null);
      return true;
    });
    assert.equal(calls.length, 1);
  });

  it("includes the pipeline message in 5xx errors", async () => {
    const { fetch } = mockFetch([{ status: 503, body: { error: "Pipeline error at layer 4", message: "synth timeout" } }]);
    const client = new PromtExpress({ apiKey: "k", fetch });

    await assert.rejects(client.generate({ intent: "launch email", modality: "text" }), (err: unknown) => {
      assert.ok(err instanceof ServerError);
      assert.equal(err.message, "Pipeline error at layer 4: synth timeout");
      return true;
    });
  });

  it("wraps network failures in APIConnectionError", async () => {
    const fetch = (async () => {
      throw new TypeError("fetch failed");
    }) as typeof globalThis.fetch;
    const client = new PromtExpress({ apiKey: "k", fetch });

    await assert.rejects(client.listHistory(), APIConnectionError);
  });

  it("sends template filters as query params and unwraps the list", async () => {
    const template = { id: "t1", title: "Hero shot", description: null, category: "product", modality: "image", engine: null, variables: [], version: "v1.0" };
    const { fetch, calls } = mockFetch([{ status: 200, body: { templates: [template] } }]);
    const client = new PromtExpress({ apiKey: "k", fetch });

    const templates = await client.listTemplates({ modality: "image" });

    assert.deepEqual(templates, [template]);
    assert.equal(calls[0].url.searchParams.get("modality"), "image");
  });

  it("paginates history until every row is read", async () => {
    const row = (id: string) => ({ id, title: id, modality: "Text", engine: "gpt", credits: 1, date: "d", status: "Done", userInput: id, result: "r" });
    const { fetch, calls } = mockFetch([
      { status: 200, body: { rows: [row("a"), row("b")], total: 3, page: 0, pageSize: 2 } },
      { status: 200, body: { rows: [row("c")], total: 3, page: 1, pageSize: 2 } },
    ]);
    const client = new PromtExpress({ apiKey: "k", fetch });

    const ids: string[] = [];
    for await (const entry of client.paginateHistory({ limit: 2 })) ids.push(entry.id);

    assert.deepEqual(ids, ["a", "b", "c"]);
    assert.deepEqual(calls.map((call) => call.url.searchParams.get("page")), ["0", "1"]);
  });
});
