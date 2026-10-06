import * as cheerio from "cheerio";
import { XMLParser } from "fast-xml-parser";
import { fetchWithLimits } from "../http";
import { fetchUrl } from "./url-fetcher";
import type { FetchedItem, FetcherInput, FetchResult } from "./types";

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: "@_",
  isArray: (name) => ["item", "entry"].includes(name),
});

function htmlSnippetToText(html: string): string {
  const $ = cheerio.load(html);
  return $("body").text().replace(/\s+/g, " ").trim();
}

function coerceArray<T>(val: T | T[] | undefined): T[] {
  if (!val) return [];
  return Array.isArray(val) ? val : [val];
}

export async function fetchRss(input: FetcherInput): Promise<FetchResult> {
  const { resource, caps } = input;
  if (!resource.url) throw new Error("RSS fetcher requires resource.url");

  const cfg = (resource.scrapeConfig ?? {}) as Record<string, unknown>;
  const maxEntries = (cfg.maxEntries as number | undefined) ?? 20;
  const fetchFull = (cfg.fetchFullArticle as boolean | undefined) ?? false;

  const { body: xml } = await fetchWithLimits(resource.url, {
    timeoutMs: caps?.timeoutMs,
    maxBytes: caps?.maxBytes,
  });

  const parsed = parser.parse(xml);

  // RSS 2.0
  const rssItems = coerceArray(parsed?.rss?.channel?.item);
  // Atom
  const atomEntries = coerceArray(parsed?.feed?.entry);
  const rawEntries = rssItems.length ? rssItems : atomEntries;

  const limited = rawEntries.slice(0, caps?.maxItems ?? maxEntries);

  const items: FetchedItem[] = [];
  const fetchedAt = new Date().toISOString();

  for (const entry of limited) {
    const link: string =
      entry.link?.["@_href"] ?? entry.link ?? entry.guid ?? "";
    const title: string = entry.title?.["#text"] ?? entry.title ?? "";
    const pubDate: string = entry.pubDate ?? entry.published ?? entry.updated ?? "";
    const rawContent: string =
      entry["content:encoded"] ?? entry.content?.["#text"] ?? entry.content ?? entry.description ?? entry.summary ?? "";

    let rawText = htmlSnippetToText(rawContent);

    if (fetchFull && link.startsWith("http")) {
      try {
        const full = await fetchUrl({
          resource: { id: resource.id, type: "URL", url: link, scrapeConfig: {} },
          caps,
        });
        if (full.items[0]?.rawText) rawText = full.items[0].rawText;
      } catch {
        // keep summary text on error
      }
    }

    items.push({
      sourceUrl: link,
      rawText,
      title: title || undefined,
      publishedAt: pubDate || undefined,
    });
  }

  return { items, fetcherVersion: "rss-fetcher@1", fetchedAt };
}
