import { XMLParser } from "fast-xml-parser";
import { fetchWithLimits } from "../http";
import { fetchUrl } from "./url-fetcher";
import type { FetchedItem, FetcherInput, FetchResult } from "./types";

const parser = new XMLParser({ ignoreAttributes: false });

function coerceArray<T>(val: T | T[] | undefined): T[] {
  if (!val) return [];
  return Array.isArray(val) ? val : [val];
}

async function extractUrls(
  xmlBody: string,
  maxUrls: number,
  urlPattern?: RegExp,
  depth = 0,
): Promise<string[]> {
  const parsed = parser.parse(xmlBody);
  const urls: string[] = [];

  // sitemap index
  const sitemapLocs = coerceArray(parsed?.sitemapindex?.sitemap)
    .map((s: Record<string, string>) => s.loc)
    .filter(Boolean);

  if (sitemapLocs.length && depth < 1) {
    for (const loc of sitemapLocs) {
      if (urls.length >= maxUrls) break;
      try {
        const { body } = await fetchWithLimits(loc);
        const sub = await extractUrls(body, maxUrls - urls.length, urlPattern, depth + 1);
        urls.push(...sub);
      } catch {
        // skip broken sub-sitemaps
      }
    }
    return urls;
  }

  // regular urlset
  const pageLocs = coerceArray(parsed?.urlset?.url)
    .map((u: Record<string, string>) => u.loc)
    .filter(Boolean);

  for (const loc of pageLocs) {
    if (urls.length >= maxUrls) break;
    if (urlPattern && !urlPattern.test(loc)) continue;
    urls.push(loc);
  }

  return urls;
}

export async function fetchSitemap(input: FetcherInput): Promise<FetchResult> {
  const { resource, caps } = input;
  if (!resource.url) throw new Error("Sitemap fetcher requires resource.url");

  const cfg = (resource.scrapeConfig ?? {}) as Record<string, unknown>;
  const maxUrls = (cfg.maxUrls as number | undefined) ?? 50;
  const urlPatternStr = cfg.urlPattern as string | undefined;
  const urlPattern = urlPatternStr ? new RegExp(urlPatternStr) : undefined;

  const { body: xml } = await fetchWithLimits(resource.url, {
    timeoutMs: caps?.timeoutMs,
    maxBytes: caps?.maxBytes,
  });

  const urls = await extractUrls(xml, caps?.maxItems ?? maxUrls, urlPattern);

  const items: FetchedItem[] = [];
  const fetchedAt = new Date().toISOString();

  for (const url of urls) {
    try {
      const r = await fetchUrl({
        resource: { id: resource.id, type: "URL", url, scrapeConfig: {} },
        caps,
      });
      items.push(...r.items);
    } catch {
      // skip unreachable pages
    }
  }

  return { items, fetcherVersion: "sitemap-fetcher@1", fetchedAt };
}
