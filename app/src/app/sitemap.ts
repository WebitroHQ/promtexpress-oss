import type { MetadataRoute } from "next";
import { db } from "@/db/client";
import { SEO_BASE_URL, buildHreflangMap } from "@/lib/seo/hreflang";

// Dynamic sitemap — public pages + published blog posts.
// Multi-locale (D1, 2026-05-11): EN URLs are the canonical entries; TR alternates
// are advertised via the hreflang `languages` map produced by buildHreflangMap.
// We do NOT emit standalone /tr/* URL entries because the canonical URL is the
// EN one — Google should consolidate ranking on EN and treat TR as alternate.
//
// lastModified for static pages reads from NEXT_PUBLIC_BUILD_TIME (set by the
// build pipeline). When unset (dev), falls back to module load time, but we
// avoid `new Date()` per request — that produced bogus "changed" signals on
// every crawl. Blog posts use BlogPost.updatedAt from the DB.

const BUILD_TIME: Date = (() => {
  const raw = process.env.NEXT_PUBLIC_BUILD_TIME;
  if (raw) {
    const d = new Date(raw);
    if (!Number.isNaN(d.getTime())) return d;
  }
  return new Date();
})();

// DSK-2: image-sitemap entries reference the 1200x630 /opengraph-image card
// (meaningful image-search content), not the 32x32 /icon.png favicon.
const DEFAULT_OG = `${SEO_BASE_URL}/opengraph-image`;

// Each entry advertises EN canonical + TR alternate + x-default.
// Implementation lives in lib/seo/hreflang.ts so canonical/sitemap stay
// consistent.
function localizedHreflang(path: string): Record<string, string> {
  return buildHreflangMap(path);
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const staticEntries: { path: string; changeFrequency: "weekly" | "monthly" | "yearly"; priority: number }[] = [
    { path: "/", changeFrequency: "weekly", priority: 1.0 },
    { path: "/blog", changeFrequency: "weekly", priority: 0.8 },
    { path: "/about", changeFrequency: "monthly", priority: 0.7 },
    { path: "/contact", changeFrequency: "yearly", priority: 0.5 },
    // SEM-1: /legal removed — it is a near-verbatim duplicate of /terms and is now
    // canonicalized to /terms, so it must not be submitted as a separate indexable URL.
    { path: "/privacy", changeFrequency: "yearly", priority: 0.3 },
    { path: "/terms", changeFrequency: "yearly", priority: 0.3 },
    // NOTE: /auth/login and /auth/signup are intentionally NOT listed here.
    // robots.ts disallows /auth/ for all bots and (auth)/layout.tsx sets
    // noindex,nofollow — listing them produced "Submitted URL blocked by
    // robots.txt" errors in Search Console (DSK-2). Sitemaps must contain
    // only canonical, indexable, crawlable URLs.
  ];

  const staticPages: MetadataRoute.Sitemap = staticEntries.map((e) => ({
    url: `${SEO_BASE_URL}${e.path === "/" ? "" : e.path}`,
    lastModified: BUILD_TIME,
    changeFrequency: e.changeFrequency,
    priority: e.priority,
    alternates: { languages: localizedHreflang(e.path) },
    images: [DEFAULT_OG],
  }));

  // Published blog posts — read from DB. If the table is missing or query
  // fails, return only static entries (sitemap should never crash the build).
  let blogPosts: MetadataRoute.Sitemap = [];
  try {
    type BlogRow = { slug: string; updatedAt: Date };
    const rows = await db.$queryRaw<BlogRow[]>`
      SELECT slug, "updatedAt" FROM "BlogPost"
      WHERE status = 'PUBLISHED' AND "publishedAt" IS NOT NULL
      ORDER BY "publishedAt" DESC
      LIMIT 1000
    `.catch(() => []);
    blogPosts = rows.map((p) => {
      const path = `/blog/${p.slug}`;
      return {
        url: `${SEO_BASE_URL}${path}`,
        lastModified: p.updatedAt,
        changeFrequency: "monthly" as const,
        priority: 0.7,
        alternates: { languages: localizedHreflang(path) },
        images: [DEFAULT_OG],
      };
    });
  } catch {
    // BlogPost table missing — silently skip.
  }

  return [...staticPages, ...blogPosts];
}
