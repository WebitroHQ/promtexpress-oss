import "server-only";
import { db } from "@/db/client";

/**
 * Blog read queries (public side).
 *
 * Plan 2026-05-08 step 9 (D1 + D2 evidence — list page used a hardcoded
 * POSTS array; detail page never read the slug). All consumers now go
 * through these helpers; the (public)/blog routes stay free of Prisma
 * imports for clarity.
 *
 * Authoring (BlogPost row creation/edit) lives in the existing admin module
 * at src/server/actions/admin-blog.ts and /pr/yonet/blog/* — untouched here.
 */

export interface BlogListItem {
  slug: string;
  title: string;
  excerpt: string | null;
  authorName: string;
  publishedAt: Date;
}

export interface BlogPostDetail extends BlogListItem {
  id: string;
  body: string;
  views: number;
}

const PUBLISHED_FILTER = {
  status: "PUBLISHED" as const,
  publishedAt: { not: null },
};

export async function getPublishedBlogPosts(limit = 60): Promise<BlogListItem[]> {
  const rows = await db.blogPost.findMany({
    where: PUBLISHED_FILTER,
    orderBy: { publishedAt: "desc" },
    take: limit,
    select: {
      slug: true,
      title: true,
      excerpt: true,
      publishedAt: true,
      author: { select: { name: true, email: true } },
    },
  });
  return rows
    .filter((r): r is typeof r & { publishedAt: Date } => r.publishedAt !== null)
    .map((r) => ({
      slug: r.slug,
      title: r.title,
      excerpt: r.excerpt,
      authorName: r.author.name ?? r.author.email.split("@")[0]!,
      publishedAt: r.publishedAt,
    }));
}

export async function getBlogPostBySlug(slug: string): Promise<BlogPostDetail | null> {
  const row = await db.blogPost.findUnique({
    where: { slug },
    select: {
      id: true,
      slug: true,
      title: true,
      excerpt: true,
      body: true,
      views: true,
      publishedAt: true,
      status: true,
      author: { select: { name: true, email: true } },
    },
  });
  if (!row || row.status !== "PUBLISHED" || !row.publishedAt) return null;
  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    excerpt: row.excerpt,
    body: row.body,
    views: row.views,
    authorName: row.author.name ?? row.author.email.split("@")[0]!,
    publishedAt: row.publishedAt,
  };
}

/** Fire-and-forget view counter increment. Failures are silent. */
export async function incrementBlogPostViews(slug: string): Promise<void> {
  try {
    await db.blogPost.updateMany({
      where: { slug, status: "PUBLISHED" },
      data: { views: { increment: 1 } },
    });
  } catch {
    /* counters are advisory */
  }
}
