import type { ResourceType } from "@prisma/client";

export type FetchedItem = {
  sourceUrl: string;
  rawHtml?: string;
  rawText: string;
  title?: string;
  publishedAt?: string;
  metadata?: Record<string, unknown>;
};

export type FetchResult = {
  items: FetchedItem[];
  fetcherVersion: string;
  fetchedAt: string;
};

export type FetcherInput = {
  resource: {
    id: string;
    type: ResourceType;
    url: string | null;
    scrapeConfig: unknown;
  };
  caps?: { maxBytes?: number; maxItems?: number; timeoutMs?: number };
};
