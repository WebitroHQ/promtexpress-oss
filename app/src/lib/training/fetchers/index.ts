export type { FetchedItem, FetchResult, FetcherInput } from "./types";
export { fetchUrl } from "./url-fetcher";
export { fetchRss } from "./rss-fetcher";
export { fetchSitemap } from "./sitemap-fetcher";
export { fetchManualText } from "./manual-text-fetcher";
export { fetchUpload } from "./upload-fetcher";

import { fetchUrl } from "./url-fetcher";
import { fetchRss } from "./rss-fetcher";
import { fetchSitemap } from "./sitemap-fetcher";
import { fetchManualText } from "./manual-text-fetcher";
import { fetchUpload } from "./upload-fetcher";
import type { FetcherInput, FetchResult } from "./types";

export async function fetchResource(input: FetcherInput): Promise<FetchResult> {
  switch (input.resource.type) {
    case "URL":
      return fetchUrl(input);
    case "RSS":
      return fetchRss(input);
    case "SITEMAP":
      return fetchSitemap(input);
    case "MANUAL_TEXT":
      return fetchManualText(input);
    case "UPLOAD":
      return fetchUpload(input);
    default: {
      const _exhaustive: never = input.resource.type;
      throw new Error(`Unsupported resource type: ${_exhaustive}`);
    }
  }
}
