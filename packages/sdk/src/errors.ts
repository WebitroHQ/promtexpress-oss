/** Base class for every error thrown by this SDK. */
export class PromtExpressError extends Error {
  constructor(message: string, options?: { cause?: unknown }) {
    super(message, options);
    this.name = new.target.name;
  }
}

/** The API responded with a non-2xx status. */
export class APIError extends PromtExpressError {
  readonly status: number;
  /** Parsed response body, as returned by the API. */
  readonly body: unknown;

  constructor(status: number, message: string, body: unknown) {
    super(message);
    this.status = status;
    this.body = body;
  }
}

/** 400: the request body failed server-side validation. */
export class InvalidRequestError extends APIError {}

/** 401: the API key is missing, invalid, expired or revoked. */
export class AuthenticationError extends APIError {}

/** 402: not enough credits left for this generation. */
export class InsufficientCreditsError extends APIError {
  readonly remaining: number | null;
  readonly required: number | null;

  constructor(status: number, message: string, body: unknown) {
    super(status, message, body);
    this.remaining = numberField(body, "remaining");
    this.required = numberField(body, "required");
  }
}

/** 429: rate limited, or the iteration limit for a prompt was reached. */
export class RateLimitError extends APIError {
  /** Seconds to wait before retrying; null when the limit is not time-based. */
  readonly retryAfterSec: number | null;

  constructor(status: number, message: string, body: unknown, retryAfterSec: number | null) {
    super(status, message, body);
    this.retryAfterSec = retryAfterSec;
  }
}

/** 5xx: the generation pipeline or an upstream engine failed. */
export class ServerError extends APIError {}

/** The request never got a response: network failure or timeout. */
export class APIConnectionError extends PromtExpressError {}

export function errorFromResponse(status: number, body: unknown, headers: Headers): APIError {
  const message = describe(status, body);
  if (status === 400) return new InvalidRequestError(status, message, body);
  if (status === 401) return new AuthenticationError(status, message, body);
  if (status === 402) return new InsufficientCreditsError(status, message, body);
  if (status === 429) {
    const retryAfter = numberField(body, "retryAfterSec") ?? parseRetryAfter(headers.get("retry-after"));
    return new RateLimitError(status, message, body, retryAfter);
  }
  if (status >= 500) return new ServerError(status, message, body);
  return new APIError(status, message, body);
}

function describe(status: number, body: unknown): string {
  const error = stringField(body, "error");
  const detail = stringField(body, "message");
  if (error && detail) return `${error}: ${detail}`;
  return error ?? detail ?? `HTTP ${status}`;
}

function parseRetryAfter(value: string | null): number | null {
  if (value === null) return null;
  const seconds = Number(value);
  return Number.isFinite(seconds) && seconds >= 0 ? seconds : null;
}

function numberField(body: unknown, key: string): number | null {
  const value = isRecord(body) ? body[key] : undefined;
  return typeof value === "number" ? value : null;
}

function stringField(body: unknown, key: string): string | null {
  const value = isRecord(body) ? body[key] : undefined;
  return typeof value === "string" && value.length > 0 ? value : null;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}
