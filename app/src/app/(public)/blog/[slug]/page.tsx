import { Link } from "@/i18n/navigation";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeSanitize from "rehype-sanitize";
import { TopNav } from "@/components/feature/layout/top-nav";
import { Button } from "@/components/ui/button";
import {
  getBlogPostBySlug,
  incrementBlogPostViews,
} from "@/server/queries/blog";
import { buildMetadata } from "@/lib/seo/metadata";
import { JsonLd } from "@/components/seo/json-ld";
import { breadcrumbSchema, blogPostingSchema } from "@/lib/seo/schemas";

// Plan 2026-05-08 step 9 (D2 evidence — slug was discarded with `void slug`).
// Now reads BlogPost row by slug; 404 if absent or not yet published. Author
// composes the body in /pr/yonet/blog as Markdown (existing admin tooling).

export const dynamic = "force-dynamic";

interface Props {
  params: Promise<{ slug: string }>;
}

function formatDate(d: Date): string {
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const post = await getBlogPostBySlug(slug);
  if (!post) {
    return {
      title: "Post not found",
      description: "This post is unavailable.",
      robots: { index: false, follow: false },
    };
  }
  const meta = buildMetadata({
    pathname: `/blog/${slug}`,
    title: post.title,
    description: post.excerpt ?? `Read “${post.title}” on the PromtExpress blog.`,
    ogType: "article",
    publishedTime: post.publishedAt.toISOString(),
    authors: [post.authorName],
  });
  // GEO-2: advertise the clean Markdown rendition (/blog/<slug>/md) so AI
  // crawlers can discover the structure-preserving variant. The route already
  // exists (src/app/blog/[slug]/md/route.ts) but was previously undiscoverable.
  meta.alternates = {
    ...meta.alternates,
    types: { "text/markdown": [{ url: `/blog/${slug}/md`, title: post.title }] },
  };
  return meta;
}

export default async function BlogDetailPage({ params }: Props) {
  const { slug } = await params;
  const post = await getBlogPostBySlug(slug);
  if (!post) notFound();

  // Fire-and-forget — never block render on view counter.
  void incrementBlogPostViews(slug);

  return (
    <div>
      <JsonLd
        data={breadcrumbSchema([
          { name: "Home", url: "/" },
          { name: "Blog", url: "/blog" },
          { name: post.title, url: `/blog/${slug}` },
        ])}
      />
      <JsonLd
        data={blogPostingSchema({
          slug: post.slug,
          title: post.title,
          excerpt: post.excerpt,
          authorName: post.authorName,
          publishedAt: post.publishedAt,
          views: post.views,
        })}
      />
      <TopNav />

      <article className="max-w-[1100px] mx-auto px-4 py-8 md:px-8 md:py-12">
        <div className="max-w-[760px] mx-auto">
          <Link
            href="/blog"
            className="text-sm text-text-muted hover:text-text transition-colors"
          >
            ← Back to blog
          </Link>
          <h1 className="mt-4 text-[clamp(28px,5vw,44px)] font-semibold tracking-[-0.03em] leading-[1.1]">
            {post.title}
          </h1>
          <div className="flex flex-wrap gap-3 mt-4 text-sm text-text-faint">
            <span>{post.authorName}</span>
            <span>·</span>
            <span>{formatDate(post.publishedAt)}</span>
            {post.views > 0 && (
              <>
                <span>·</span>
                <span>{post.views.toLocaleString("en-US")} views</span>
              </>
            )}
          </div>

          {post.excerpt && (
            <p className="mt-6 text-[18px] leading-[1.6] text-text-muted">{post.excerpt}</p>
          )}

          {/* Body — Markdown stored in BlogPost.body, rendered to real
              semantic HTML (h2/h3/ul/ol/a/table/code…) via react-markdown.
              remark-gfm enables tables, task lists, strikethrough and
              autolinks; rehype-sanitize applies an XSS-safe allowlist so no
              raw HTML injection is possible (no dangerouslySetInnerHTML). */}
          <div
            className="mt-8 text-[17px] leading-[1.75] text-text
              [&>*+*]:mt-5
              [&_h2]:mt-10 [&_h2]:mb-3 [&_h2]:text-[clamp(22px,3.5vw,30px)] [&_h2]:font-semibold [&_h2]:tracking-[-0.02em] [&_h2]:leading-[1.2]
              [&_h3]:mt-8 [&_h3]:mb-2 [&_h3]:text-[clamp(19px,3vw,23px)] [&_h3]:font-semibold [&_h3]:tracking-[-0.01em] [&_h3]:leading-[1.25]
              [&_h4]:mt-6 [&_h4]:mb-2 [&_h4]:text-[18px] [&_h4]:font-semibold
              [&_a]:text-accent [&_a]:underline [&_a]:underline-offset-2 [&_a:hover]:opacity-80
              [&_ul]:list-disc [&_ul]:ps-6 [&_ol]:list-decimal [&_ol]:ps-6 [&_li]:mt-1.5 [&_li]:leading-[1.7]
              [&_strong]:font-semibold
              [&_blockquote]:border-s-2 [&_blockquote]:border-border [&_blockquote]:ps-4 [&_blockquote]:text-text-muted [&_blockquote]:italic
              [&_code]:rounded [&_code]:bg-surface [&_code]:px-1.5 [&_code]:py-0.5 [&_code]:text-[0.9em]
              [&_pre]:rounded-lg [&_pre]:bg-surface [&_pre]:border [&_pre]:border-border [&_pre]:p-4 [&_pre]:overflow-x-auto [&_pre_code]:bg-transparent [&_pre_code]:p-0
              [&_table]:w-full [&_table]:border-collapse [&_table]:text-[15px]
              [&_th]:border [&_th]:border-border [&_th]:px-3 [&_th]:py-2 [&_th]:text-start [&_th]:font-semibold
              [&_td]:border [&_td]:border-border [&_td]:px-3 [&_td]:py-2
              [&_hr]:my-8 [&_hr]:border-border
              [&_img]:rounded-lg [&_img]:max-w-full [&_img]:h-auto"
          >
            <ReactMarkdown
              remarkPlugins={[remarkGfm]}
              rehypePlugins={[rehypeSanitize]}
            >
              {post.body}
            </ReactMarkdown>
          </div>

          <div className="mt-12 rounded-xl border border-border bg-surface pe-hero-bg p-7 text-center">
            <h3 className="text-xl font-semibold">Try it on your own work</h3>
            <p className="text-sm text-text-muted mt-1.5 mb-4">
              50 free credits, no credit card.
            </p>
            <Button asChild>
              <Link href="/auth/signup">Start free →</Link>
            </Button>
          </div>
        </div>
      </article>
    </div>
  );
}
