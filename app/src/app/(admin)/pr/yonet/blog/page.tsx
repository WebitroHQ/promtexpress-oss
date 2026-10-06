import { auth } from "@/lib/auth";
import { AdminShell } from "@/components/feature/admin/admin-shell";
import { AdminPageHeader } from "@/components/feature/admin/admin-page-header";
import { BlogEditorClient } from "@/components/feature/admin/blog-editor-client";
import { db } from "@/db/client";

export default async function AdminBlogPage() {
  const session = await auth();

  const rows = await db.blogPost.findMany({
    orderBy: [{ status: "asc" }, { createdAt: "desc" }],
    take: 100,
    include: { author: { select: { email: true } } },
  });

  const posts = rows.map((p) => ({
    id: p.id,
    slug: p.slug,
    title: p.title,
    excerpt: p.excerpt,
    body: p.body,
    authorEmail: p.author.email,
    status: p.status,
    views: p.views,
    publishedAt: p.publishedAt?.toISOString() ?? null,
    createdAt: p.createdAt.toISOString(),
  }));

  return (
    <AdminShell current="blog" userEmail={session?.user?.email}>
      <AdminPageHeader helpKey="blog" title="Blog" sub={`${posts.length} posts`} />
      <BlogEditorClient posts={posts} />
    </AdminShell>
  );
}
