// RSS 2.0 feed of the latest published blog posts. Plan §4.2.

import { db } from "@/db/client";
import { SEO_BASE_URL } from "@/lib/seo/hreflang";

export const dynamic = "force-dynamic";
export const revalidate = 3600;

const FEED_TITLE = "PromtExpress — Field notes";
const FEED_DESCRIPTION =
  "Engineering, product, and tutorial articles from the PromtExpress team.";
const FEED_LANGUAGE = "en-US";

interface FeedRow {
  slug: string;
  title: string;
  excerpt: string | null;
  publishedAt: Date;
  updatedAt: Date;
  authorName: string;
}

function escapeXml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

async function loadRows(): Promise<FeedRow[]> {
  try {
    const rows = await db.blogPost.findMany({
      where: { status: "PUBLISHED", publishedAt: { not: null } },
      orderBy: { publishedAt: "desc" },
      take: 50,
      select: {
        slug: true,
        title: true,
        excerpt: true,
        publishedAt: true,
        updatedAt: true,
        author: { select: { name: true, email: true } },
      },
    });
    return rows
      .filter((r): r is typeof r & { publishedAt: Date } => r.publishedAt !== null)
      .map((r) => ({
        slug: r.slug,
        title: r.title,
        excerpt: r.excerpt,
        publishedAt: r.publishedAt,
        updatedAt: r.updatedAt,
        authorName: r.author.name ?? r.author.email.split("@")[0]!,
      }));
  } catch {
    return [];
  }
}

export async function GET() {
  const rows = await loadRows();
  const lastBuild = (rows[0]?.updatedAt ?? new Date()).toUTCString();
  const items = rows
    .map((r) => {
      const url = `${SEO_BASE_URL}/blog/${r.slug}`;
      return `    <item>
      <title>${escapeXml(r.title)}</title>
      <link>${url}</link>
      <guid isPermaLink="true">${url}</guid>
      <pubDate>${r.publishedAt.toUTCString()}</pubDate>
      <author>${escapeXml(r.authorName)}</author>
      ${r.excerpt ? `<description>${escapeXml(r.excerpt)}</description>` : ""}
    </item>`;
    })
    .join("\n");

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>${escapeXml(FEED_TITLE)}</title>
    <link>${SEO_BASE_URL}/blog</link>
    <description>${escapeXml(FEED_DESCRIPTION)}</description>
    <language>${FEED_LANGUAGE}</language>
    <lastBuildDate>${lastBuild}</lastBuildDate>
    <atom:link href="${SEO_BASE_URL}/feed.xml" rel="self" type="application/rss+xml" />
${items}
  </channel>
</rss>`;

  return new Response(xml, {
    headers: {
      "Content-Type": "application/rss+xml; charset=utf-8",
      "Cache-Control": "public, max-age=3600, s-maxage=3600",
    },
  });
}
