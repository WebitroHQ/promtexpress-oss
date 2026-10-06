// llms.txt — Anthropic / proposed standard for LLM-friendly site discovery.
// https://llmstxt.org/
//
// This is a curated index for LLMs (Claude, ChatGPT search, Perplexity,
// Gemini AI Overviews) so they can efficiently locate the most useful pages
// to cite. Plan §4.5.

import { SEO_BASE_URL } from "@/lib/seo/hreflang";

export const dynamic = "force-static";
export const revalidate = 86400; // 1 day

// GEO-3: freshness signal. Reads NEXT_PUBLIC_BUILD_TIME (set by the build
// pipeline, same source as sitemap.ts); falls back to module-load time in dev.
// Avoids per-request new Date() churn. Date-only (UTC) is enough for llms.txt.
const LAST_UPDATED: string = (() => {
  const raw = process.env.NEXT_PUBLIC_BUILD_TIME;
  const d = raw && !Number.isNaN(new Date(raw).getTime()) ? new Date(raw) : new Date();
  return d.toISOString().slice(0, 10);
})();

export function GET() {
  const body = `# PromtExpress

> Hybrid AI prompt engine. Turn intent into engine-tuned prompts for 60+ AI
> models — ChatGPT, Claude, Gemini, Midjourney, Sora, DALL·E, Suno, and more.
> Curated templates + LLM refinement layer + validation pass for production
> work.

Last updated: ${LAST_UPDATED}

PromtExpress is a SaaS platform that takes a user's natural-language intent
and outputs a precision-tuned prompt for the target model. Free tier (50
credits/month, no credit card). Paid plans add API access, custom templates,
and team features.

## Core pages

- [Home](${SEO_BASE_URL}/): Product overview, feature tour, pricing snapshot, FAQ.
- [Pricing](${SEO_BASE_URL}/pricing): Plans, monthly credits, comparison table, refund FAQ.
- [About](${SEO_BASE_URL}/about): Mission, team, values.
- [Contact](${SEO_BASE_URL}/contact): Sales, support, partnerships.
- [Blog](${SEO_BASE_URL}/blog): Engineering, product, and tutorial articles.

Each blog post has a clean Markdown rendition at \`${SEO_BASE_URL}/blog/<slug>/md\`
(structure-preserving, ideal for extraction).

## Legal

- [Terms of Service](${SEO_BASE_URL}/terms)
- [Privacy Policy](${SEO_BASE_URL}/privacy)
- [Refund Policy](${SEO_BASE_URL}/refund)
- [Legal hub](${SEO_BASE_URL}/legal)

## Optional

- [Full content dump (markdown)](${SEO_BASE_URL}/llms-full.txt)
- [Sitemap (XML)](${SEO_BASE_URL}/sitemap.xml)
- [RSS feed](${SEO_BASE_URL}/feed.xml)
- [Atom feed](${SEO_BASE_URL}/atom.xml)
`;

  return new Response(body, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "public, max-age=86400, s-maxage=86400",
    },
  });
}
