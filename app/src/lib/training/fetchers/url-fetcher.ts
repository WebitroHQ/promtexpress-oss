import * as cheerio from "cheerio";
import { fetchWithLimits } from "../http";
import type { FetchedItem, FetcherInput, FetchResult } from "./types";

function htmlToText($: ReturnType<typeof cheerio.load>): string {
  $("script, style, noscript, nav, footer, header, aside").remove();
  const raw = $("body").text();
  return raw.replace(/\s+/g, " ").trim();
}

export async function fetchUrl(input: FetcherInput): Promise<FetchResult> {
  const { resource, caps } = input;
  if (!resource.url) throw new Error("URL fetcher requires resource.url");

  const { body: rawHtml } = await fetchWithLimits(resource.url, {
    timeoutMs: caps?.timeoutMs,
    maxBytes: caps?.maxBytes,
  });

  const $ = cheerio.load(rawHtml);
  const title = $("title").first().text().trim() || undefined;
  const description = $('meta[name="description"]').attr("content")?.trim();
  const h1 = $("h1").first().text().trim() || undefined;
  const rawText = htmlToText($);

  const item: FetchedItem = {
    sourceUrl: resource.url,
    rawHtml,
    rawText,
    title,
    metadata: { description, h1 },
  };

  return {
    items: [item],
    fetcherVersion: "url-fetcher@1",
    fetchedAt: new Date().toISOString(),
  };
}
