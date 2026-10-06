import { Link } from "@/i18n/navigation";
import { TopNav } from "@/components/feature/layout/top-nav";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { getPublishedBlogPosts } from "@/server/queries/blog";
import { buildMetadata } from "@/lib/seo/metadata";
import { JsonLd } from "@/components/seo/json-ld";
import { breadcrumbSchema } from "@/lib/seo/schemas";

// Plan 2026-05-08 step 9 — list page now reads PUBLISHED rows from BlogPost
// instead of the hardcoded POSTS array. Authoring stays in /pr/yonet/blog.
//
// `force-dynamic` keeps the list aligned with the admin's most recent
// publish action (revalidate-on-demand could replace this later, but the
// current page weight is small enough that per-request fetch is fine).
export const dynamic = "force-dynamic";

export const metadata = buildMetadata({
  pathname: "/blog",
  title: "Blog",
  description: "Field notes from the PromtExpress team — engineering, product, tutorials.",
});

const FALLBACK_READ_MIN = 6;

function formatDate(d: Date): string {
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

export default async function BlogListPage() {
  const posts = await getPublishedBlogPosts(60);
  const featured = posts[0];
  const rest = posts.slice(1);

  return (
    <div>
      <JsonLd
        data={breadcrumbSchema([
          { name: "Home", url: "/" },
          { name: "Blog", url: "/blog" },
        ])}
      />
      <TopNav />

      <section className="pe-section pt-16">
        <div className="mb-8">
          <p className="text-xs font-semibold uppercase tracking-[0.08em] text-text-faint mb-2">
            Field notes
          </p>
          <h1 className="text-[clamp(28px,5vw,40px)] font-semibold tracking-[-0.025em]">
            The PromtExpress journal
          </h1>
        </div>

        {posts.length === 0 ? (
          <div className="rounded-xl border border-border bg-surface p-10 text-center">
            <h2 className="text-lg font-semibold mb-2">No posts yet</h2>
            <p className="text-sm text-text-muted">Check back soon — we publish updates regularly.</p>
          </div>
        ) : (
          <>
            {featured && (
              <div className="rounded-xl border border-border bg-surface overflow-hidden grid grid-cols-1 md:grid-cols-2 mb-8">
                <div
                  className="min-h-[240px]"
                  style={{
                    background:
                      "linear-gradient(135deg, var(--pe-primary-soft), var(--pe-accent-soft))",
                  }}
                />
                <div className="p-8 flex flex-col justify-center">
                  <Badge variant="primary" className="self-start mb-3">
                    Featured
                  </Badge>
                  <h2 className="text-[clamp(22px,3.5vw,28px)] font-semibold tracking-[-0.02em] leading-tight">
                    {featured.title}
                  </h2>
                  {featured.excerpt && (
                    <p className="text-sm text-text-muted mt-2.5">{featured.excerpt}</p>
                  )}
                  <div className="flex gap-2 mt-4 text-xs text-text-faint">
                    <span>{featured.authorName}</span>
                    <span>·</span>
                    <span>{formatDate(featured.publishedAt)}</span>
                    <span>·</span>
                    <span>{FALLBACK_READ_MIN} min read</span>
                  </div>
                  <Button variant="secondary" size="sm" className="self-start mt-5" asChild>
                    <Link href={`/blog/${featured.slug}`}>Read article →</Link>
                  </Button>
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {rest.map((p) => (
                <Link
                  key={p.slug}
                  href={`/blog/${p.slug}`}
                  className="rounded-xl border border-border bg-surface overflow-hidden hover:border-border-strong transition-colors"
                >
                  <div
                    className="h-40"
                    style={{
                      background:
                        "linear-gradient(135deg, var(--pe-primary-soft), var(--pe-surface-2))",
                    }}
                  />
                  <div className="p-5">
                    <h3 className="text-[17px] font-semibold leading-snug">{p.title}</h3>
                    {p.excerpt && (
                      <p className="text-xs text-text-muted mt-2 line-clamp-3">{p.excerpt}</p>
                    )}
                    <div className="flex gap-2 mt-3.5 text-xs text-text-faint">
                      <span>{p.authorName}</span>
                      <span>·</span>
                      <span>{formatDate(p.publishedAt)}</span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </>
        )}
      </section>
    </div>
  );
}
