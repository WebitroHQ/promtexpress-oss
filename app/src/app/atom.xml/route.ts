// Atom 1.0 feed — sister format to /feed.xml. Plan §4.2.

import { db } from "@/db/client";
import { SEO_BASE_URL } from "@/lib/seo/hreflang";

export const dynamic = "force-dynamic";
export const revalidate = 3600;

const FEED_TITLE = "PromtExpress — Field notes";
const FEED_SUBTITLE =
  "Engineering, product, and tutorial articles from the PromtExpress team.";

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
  const updated = (rows[0]?.updatedAt ?? new Date()).toISOString();
  const entries = rows
    .map((r) => {
      const url = `${SEO_BASE_URL}/blog/${r.slug}`;
      return `  <entry>
    <id>${url}</id>
    <title>${escapeXml(r.title)}</title>
    <link href="${url}" />
    <updated>${r.updatedAt.toISOString()}</updated>
    <published>${r.publishedAt.toISOString()}</published>
    <author><name>${escapeXml(r.authorName)}</name></author>
    ${r.excerpt ? `<summary>${escapeXml(r.excerpt)}</summary>` : ""}
  </entry>`;
    })
    .join("\n");

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<feed xmlns="http://www.w3.org/2005/Atom" xml:lang="en-US">
  <id>${SEO_BASE_URL}/atom.xml</id>
  <title>${escapeXml(FEED_TITLE)}</title>
  <subtitle>${escapeXml(FEED_SUBTITLE)}</subtitle>
  <link href="${SEO_BASE_URL}/atom.xml" rel="self" type="application/atom+xml" />
  <link href="${SEO_BASE_URL}/blog" />
  <updated>${updated}</updated>
${entries}
</feed>`;

  return new Response(xml, {
    headers: {
      "Content-Type": "application/atom+xml; charset=utf-8",
      "Cache-Control": "public, max-age=3600, s-maxage=3600",
    },
  });
}
