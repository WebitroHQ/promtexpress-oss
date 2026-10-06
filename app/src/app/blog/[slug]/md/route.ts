// /blog/<slug>/md — clean markdown export of a blog post for LLM crawlers.
// Plan §4.6.
//
// We keep this OUT of the (public) route group because that group's blog
// pages render HTML; this is a separate, pure data endpoint. The same
// underlying data source (BlogPost table via @/server/queries/blog) is
// reused so content stays in sync.

import { NextResponse } from "next/server";
import { getBlogPostBySlug } from "@/server/queries/blog";
import { SEO_BASE_URL } from "@/lib/seo/hreflang";

export const dynamic = "force-dynamic";
export const revalidate = 3600;

interface Props {
  params: Promise<{ slug: string }>;
}

export async function GET(_req: Request, { params }: Props) {
  const { slug } = await params;
  const post = await getBlogPostBySlug(slug);
  if (!post) {
    return new NextResponse("Not found\n", { status: 404 });
  }
  const date = post.publishedAt.toISOString().slice(0, 10);
  const url = `${SEO_BASE_URL}/blog/${post.slug}`;
  const body = `# ${post.title}

_${date} · ${post.authorName} · [${url}](${url})_

${post.excerpt ? `> ${post.excerpt}\n\n` : ""}${post.body}
`;
  return new NextResponse(body, {
    headers: {
      "Content-Type": "text/markdown; charset=utf-8",
      "Cache-Control": "public, max-age=3600, s-maxage=3600",
    },
  });
}
