import type { Metadata } from "next";
import { SEO_BASE_URL, buildCanonical, buildHreflangMap } from "./hreflang";

// Single source of truth for per-page metadata. Every public page calls
// buildMetadata({...}) so that canonical, hreflang, OG, Twitter cards, robots
// stay in sync. Faz 2.1 of the SEO plan.

export type BuildMetaInput = {
  pathname: string;
  title: string;
  description: string;
  ogImage?: string;
  ogType?: "website" | "article";
  publishedTime?: string;
  modifiedTime?: string;
  authors?: string[];
  noindex?: boolean;
};

// DSK-1: the generated 1200x630 branded card from src/app/opengraph-image.tsx.
// Served at /opengraph-image; Next resolves it to an absolute URL via
// metadataBase. Replaces the old /icon.png (a 32x32 favicon) which was the
// wrong size for an OG / Twitter summary_large_image card.
const DEFAULT_OG_IMAGE = "/opengraph-image";

export function buildMetadata(input: BuildMetaInput): Metadata {
  const canonical = buildCanonical(input.pathname);
  const languages = buildHreflangMap(input.pathname);
  const ogImage = input.ogImage ?? DEFAULT_OG_IMAGE;
  const isArticle = input.ogType === "article";

  type OG = NonNullable<Metadata["openGraph"]>;
  type ArticleOG = Extract<OG, { type: "article" }>;
  const og = {
    type: input.ogType ?? "website",
    locale: "en_US",
    url: canonical,
    siteName: "PromtExpress",
    title: input.title,
    description: input.description,
    // DSK-1: ogImage defaults to the 1200x630 /opengraph-image card. Declaring
    // explicit width/height/type makes every public page emit og:image:width/
    // height/type so scrapers render the card without a deferred fetch.
    images: [{ url: ogImage, width: 1200, height: 630, type: "image/png", alt: input.title }],
  } as OG;

  if (isArticle) {
    const article = og as ArticleOG;
    if (input.publishedTime) article.publishedTime = input.publishedTime;
    if (input.modifiedTime) article.modifiedTime = input.modifiedTime;
    if (input.authors?.length) article.authors = input.authors;
  }

  const meta: Metadata = {
    title: input.title,
    description: input.description,
    alternates: { canonical, languages },
    openGraph: og,
    twitter: {
      card: "summary_large_image",
      title: input.title,
      description: input.description,
      images: [ogImage],
    },
  };

  if (input.noindex) {
    meta.robots = {
      index: false,
      follow: false,
      googleBot: { index: false, follow: false },
    };
  }

  return meta;
}

export { SEO_BASE_URL };
