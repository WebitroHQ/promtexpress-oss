const USER_AGENT = "PromtExpressBot/1.0 (+https://promtexpress.com/bot)";

export class FetchError extends Error {
  constructor(
    public readonly status: number,
    public readonly statusText: string,
    public readonly url: string,
  ) {
    super(`HTTP ${status} ${statusText} — ${url}`);
    this.name = "FetchError";
  }
}

export async function fetchWithLimits(
  url: string,
  opts: {
    timeoutMs?: number;
    maxBytes?: number;
    ua?: string;
  } = {},
): Promise<{ body: string; contentType: string }> {
  const { timeoutMs = 20_000, maxBytes = 1_500_000, ua = USER_AGENT } = opts;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  let res: Response;
  try {
    res = await fetch(url, {
      signal: controller.signal,
      headers: { "User-Agent": ua },
    });
  } finally {
    clearTimeout(timer);
  }

  if (!res.ok) {
    throw new FetchError(res.status, res.statusText, url);
  }

  const contentType = res.headers.get("content-type") ?? "";
  const reader = res.body?.getReader();
  if (!reader) return { body: "", contentType };

  const chunks: Uint8Array[] = [];
  let totalBytes = 0;

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    if (value) {
      totalBytes += value.byteLength;
      if (totalBytes > maxBytes) {
        reader.cancel();
        break;
      }
      chunks.push(value);
    }
  }

  const merged = new Uint8Array(chunks.reduce((acc, c) => acc + c.byteLength, 0));
  let offset = 0;
  for (const c of chunks) {
    merged.set(c, offset);
    offset += c.byteLength;
  }

  const body = new TextDecoder("utf-8", { fatal: false }).decode(merged);
  return { body, contentType };
}
