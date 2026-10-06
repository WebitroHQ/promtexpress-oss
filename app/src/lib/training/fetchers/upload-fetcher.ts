import type { FetcherInput, FetchResult } from "./types";

export async function fetchUpload(input: FetcherInput): Promise<FetchResult> {
  const { resource } = input;
  const cfg = (resource.scrapeConfig ?? {}) as Record<string, unknown>;
  const uploadedText = cfg.uploadedText as string | undefined;

  if (!uploadedText) throw new Error("UPLOAD fetcher requires scrapeConfig.uploadedText");

  return {
    items: [
      {
        sourceUrl: `upload:${resource.id}`,
        rawText: uploadedText,
        title: undefined,
      },
    ],
    fetcherVersion: "upload-fetcher@1",
    fetchedAt: new Date().toISOString(),
  };
}
