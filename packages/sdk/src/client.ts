import { APIConnectionError, PromtExpressError, RateLimitError, errorFromResponse } from "./errors.ts";
import type {
  GenerateParams,
  GenerateResult,
  HistoryPage,
  HistoryParams,
  HistoryRow,
  Modality,
  Template,
  TemplateListParams,
} from "./types.ts";

export const DEFAULT_BASE_URL = "https://promtexpress.com/api/v1";

export const MODALITIES: readonly Modality[] = ["text", "code", "image", "video", "audio", "music"];

export interface ClientOptions {
  /** Defaults to the PROMTEXPRESS_API_KEY environment variable. */
  apiKey?: string;
  /** Defaults to PROMTEXPRESS_BASE_URL, then https://promtexpress.com/api/v1. */
  baseUrl?: string;
  /** Per-request timeout in milliseconds. Generation runs a multi-stage pipeline, so the default is 120s. */
  timeoutMs?: number;
  /** How many times a time-based 429 is retried before the error is thrown. Defaults to 2. */
  maxRetries?: number;
  /** Custom fetch implementation, e.g. for tests or proxies. */
  fetch?: typeof fetch;
}

interface RequestOptions {
  query?: Record<string, string | number | undefined>;
  body?: unknown;
}

export class PromtExpress {
  readonly baseUrl: string;
  readonly #apiKey: string;
  readonly #timeoutMs: number;
  readonly #maxRetries: number;
  readonly #fetch: typeof fetch;

  constructor(options: ClientOptions = {}) {
    const apiKey = options.apiKey ?? readEnv("PROMTEXPRESS_API_KEY");
    if (!apiKey) {
      throw new PromtExpressError(
        "Missing API key: pass { apiKey } or set PROMTEXPRESS_API_KEY. Keys are created in the PromtExpress dashboard under API Keys.",
      );
    }
    const fetchImpl = options.fetch ?? globalThis.fetch?.bind(globalThis);
    if (typeof fetchImpl !== "function") {
      throw new PromtExpressError("No fetch implementation found: use Node.js 18+ or pass { fetch }.");
    }

    this.baseUrl = (options.baseUrl ?? readEnv("PROMTEXPRESS_BASE_URL") ?? DEFAULT_BASE_URL).replace(/\/+$/, "");
    new URL(this.baseUrl); // fail fast on a malformed base URL
    this.#apiKey = apiKey;
    this.#timeoutMs = options.timeoutMs ?? 120_000;
    this.#maxRetries = options.maxRetries ?? 2;
    this.#fetch = fetchImpl;
  }

  /** Compile a plain-language intent into a production-ready prompt. Consumes credits. */
  async generate(params: GenerateParams): Promise<GenerateResult> {
    assertGenerateParams(params);
    const body: Record<string, unknown> = { intent: params.intent, modality: params.modality };
    if (params.targetEngineId != null) body.targetEngineId = params.targetEngineId;
    if (params.answers?.length) body.answers = params.answers;
    if (params.iteration) body.iteration = params.iteration;
    return this.#request<GenerateResult>("POST", "/generate", { body });
  }

  /** List published prompt templates. */
  async listTemplates(params: TemplateListParams = {}): Promise<Template[]> {
    const data = await this.#request<{ templates: Template[] }>("GET", "/templates", {
      query: { modality: params.modality },
    });
    return data.templates;
  }

  /** Fetch one page of your generation history, newest first. */
  listHistory(params: HistoryParams = {}): Promise<HistoryPage> {
    return this.#request<HistoryPage>("GET", "/history", {
      query: { page: params.page, limit: params.limit, modality: params.modality },
    });
  }

  /** Walk your whole generation history, requesting pages as needed. */
  async *paginateHistory(params: Omit<HistoryParams, "page"> = {}): AsyncGenerator<HistoryRow> {
    for (let page = 0; ; page++) {
      const result = await this.listHistory({ ...params, page });
      yield* result.rows;
      if (result.rows.length === 0 || (page + 1) * result.pageSize >= result.total) return;
    }
  }

  async #request<T>(method: "GET" | "POST", path: string, options: RequestOptions = {}): Promise<T> {
    const url = new URL(this.baseUrl + path);
    for (const [key, value] of Object.entries(options.query ?? {})) {
      if (value !== undefined) url.searchParams.set(key, String(value));
    }
    const headers: Record<string, string> = {
      Authorization: `Bearer ${this.#apiKey}`,
      Accept: "application/json",
    };
    let body: string | undefined;
    if (options.body !== undefined) {
      headers["Content-Type"] = "application/json";
      body = JSON.stringify(options.body);
    }

    for (let attempt = 0; ; attempt++) {
      let response: Response;
      try {
        response = await this.#fetch(url, {
          method,
          headers,
          body,
          signal: AbortSignal.timeout(this.#timeoutMs),
        });
      } catch (err) {
        const timedOut = err instanceof Error && err.name === "TimeoutError";
        throw new APIConnectionError(
          timedOut ? `Request timed out after ${this.#timeoutMs}ms` : `Could not reach ${url.origin}`,
          { cause: err },
        );
      }

      const payload = await readBody(response);
      if (response.ok) return payload as T;

      const error = errorFromResponse(response.status, payload, response.headers);
      // The API rejects rate-limited calls before charging credits, so retrying is safe even for generate.
      if (error instanceof RateLimitError && error.retryAfterSec !== null && attempt < this.#maxRetries) {
        await sleep(error.retryAfterSec * 1000);
        continue;
      }
      throw error;
    }
  }
}

function assertGenerateParams(params: GenerateParams): void {
  if (typeof params?.intent !== "string" || params.intent.length < 3 || params.intent.length > 4000) {
    throw new PromtExpressError("intent must be a string of 3 to 4000 characters");
  }
  if (!MODALITIES.includes(params.modality)) {
    throw new PromtExpressError(`modality must be one of: ${MODALITIES.join(", ")}`);
  }
  if (params.answers && params.answers.length > 10) {
    throw new PromtExpressError("answers accepts at most 10 items");
  }
}

async function readBody(response: Response): Promise<unknown> {
  const text = await response.text();
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

function readEnv(name: string): string | undefined {
  const env = (globalThis as { process?: { env?: Record<string, string | undefined> } }).process?.env;
  return env?.[name] || undefined;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
