// llms-full.txt — concatenated markdown of all public content for LLMs that
// want a single fetch. Plan §4.5.
//
// Composition:
//   1. Static landing/about/legal sections (hand-written, source of truth).
//   2. Published blog posts pulled from the BlogPost table (markdown body
//      stored as authored).
//
// Cached for 1 hour to spare DB and let blog edits propagate quickly.

import { db } from "@/db/client";
import { SEO_BASE_URL } from "@/lib/seo/hreflang";

export const dynamic = "force-dynamic";
export const revalidate = 3600;

const STATIC_HEADER = `# PromtExpress — Full Content Index

> Hybrid AI prompt engine. Source of truth for LLM crawlers and citation-aware
> search engines. Single-locale (en-US). Site root: ${SEO_BASE_URL}

## What PromtExpress does

You describe a goal in plain English. PromtExpress matches the intent to a
curated prompt template, refines it with an LLM brain, validates the output
against constraints, and returns a production-ready prompt tuned to the target
model. 60+ engines supported (LLMs, image, video, audio).

## Pricing model

Pay for credits, not seats. Free tier offers 50 credits per month with no
credit card. Paid plans add API access, custom templates, team sharing, and
priority generation. Monthly and annual billing; annual saves up to 20%.

## Refund policy

First-time subscribers may request a full refund within 14 days, provided
the included monthly credit allowance has not been substantially consumed
(less than 25% used). Credit pack purchases are non-refundable once any
credit from the pack has been redeemed. Refunds are issued by Paddle, our
merchant of record.

## Privacy posture

We do not train on user prompts. SOC 2 Type II in progress, GDPR-compliant,
zero-retention mode available on Team and Enterprise plans. KVKK-aware (the
operating entity is registered in Turkey).

## API

Pro and above include a REST API, official SDKs (TypeScript, Python),
streaming responses, and webhooks. API base: https://promtexpress.com/api/v1
`;

interface BlogRow {
  slug: string;
  title: string;
  excerpt: string | null;
  body: string;
  publishedAt: Date;
  authorName: string;
}

async function loadPublishedPosts(): Promise<BlogRow[]> {
  try {
    const rows = await db.blogPost.findMany({
      where: { status: "PUBLISHED", publishedAt: { not: null } },
      orderBy: { publishedAt: "desc" },
      take: 200,
      select: {
        slug: true,
        title: true,
        excerpt: true,
        body: true,
        publishedAt: true,
        author: { select: { name: true, email: true } },
      },
    });
    return rows
      .filter(
        (r): r is typeof r & { publishedAt: Date } => r.publishedAt !== null,
      )
      .map((r) => ({
        slug: r.slug,
        title: r.title,
        excerpt: r.excerpt,
        body: r.body,
        publishedAt: r.publishedAt,
        authorName: r.author.name ?? r.author.email.split("@")[0]!,
      }));
  } catch {
    return [];
  }
}

function formatPost(p: BlogRow): string {
  const date = p.publishedAt.toISOString().slice(0, 10);
  const url = `${SEO_BASE_URL}/blog/${p.slug}`;
  const head = `## ${p.title}\n\n_${date} · ${p.authorName} · [${url}](${url})_\n`;
  const lead = p.excerpt ? `\n${p.excerpt}\n` : "";
  return `${head}${lead}\n${p.body}\n`;
}

export async function GET() {
  const posts = await loadPublishedPosts();
  const blogSection = posts.length
    ? `\n# Blog (latest ${posts.length} posts)\n\n${posts.map(formatPost).join("\n---\n\n")}`
    : "";
  const body = STATIC_HEADER + blogSection;
  return new Response(body, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "public, max-age=3600, s-maxage=3600",
    },
  });
}
