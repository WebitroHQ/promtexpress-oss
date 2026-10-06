import type { FetcherInput, FetchResult } from "./types";

export async function fetchManualText(input: FetcherInput): Promise<FetchResult> {
  const { resource } = input;
  const cfg = (resource.scrapeConfig ?? {}) as Record<string, unknown>;
  const text = cfg.text as string | undefined;

  if (!text) throw new Error("MANUAL_TEXT fetcher requires scrapeConfig.text");

  return {
    items: [
      {
        sourceUrl: `manual:${resource.id}`,
        rawText: text,
        title: undefined,
      },
    ],
    fetcherVersion: "manual-text-fetcher@1",
    fetchedAt: new Date().toISOString(),
  };
}
