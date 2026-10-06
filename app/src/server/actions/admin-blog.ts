"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { db } from "@/db/client";
import { requireAdmin, writeAudit } from "@/lib/audit";
import { BlogStatus } from "@prisma/client";

const SLUG_RE = /^[a-z0-9-]+$/;

const PostSchema = z.object({
  slug: z.string().trim().min(1).max(120).regex(SLUG_RE, "Slug yalnızca [a-z0-9-]"),
  title: z.string().trim().min(1).max(200),
  excerpt: z.string().trim().max(500).optional().nullable().transform((v) => (v && v.length > 0 ? v : null)),
  body: z.string().min(1).max(50000),
  status: z.nativeEnum(BlogStatus).default(BlogStatus.DRAFT),
});

export async function createBlogPost(input: z.input<typeof PostSchema>) {
  const admin = await requireAdmin();
  const parsed = PostSchema.parse(input);

  const created = await db.blogPost.create({
    data: {
      slug: parsed.slug,
      title: parsed.title,
      excerpt: parsed.excerpt,
      body: parsed.body,
      authorId: admin.id,
      status: parsed.status,
      publishedAt: parsed.status === BlogStatus.PUBLISHED ? new Date() : null,
    },
  });
  await writeAudit({ actorId: admin.id, action: "blog.create", targetType: "blogPost", targetId: created.id, meta: { title: parsed.title, status: parsed.status } });
  revalidatePath("/pr/yonet/blog");
  return { ok: true, id: created.id };
}

export async function updateBlogPost(id: string, input: z.input<typeof PostSchema>) {
  const admin = await requireAdmin();
  const parsed = PostSchema.parse(input);

  const existing = await db.blogPost.findUnique({ where: { id } });
  if (!existing) throw new Error("Post not found");

  const becamePublished = existing.status !== BlogStatus.PUBLISHED && parsed.status === BlogStatus.PUBLISHED;

  await db.blogPost.update({
    where: { id },
    data: {
      slug: parsed.slug,
      title: parsed.title,
      excerpt: parsed.excerpt,
      body: parsed.body,
      status: parsed.status,
      ...(becamePublished ? { publishedAt: new Date() } : {}),
    },
  });
  await writeAudit({ actorId: admin.id, action: "blog.update", targetType: "blogPost", targetId: id, meta: { title: parsed.title, status: parsed.status } });
  revalidatePath("/pr/yonet/blog");
  return { ok: true };
}

export async function setBlogPostStatus(id: string, status: BlogStatus) {
  const admin = await requireAdmin();
  await db.blogPost.update({
    where: { id },
    data: {
      status,
      ...(status === BlogStatus.PUBLISHED ? { publishedAt: new Date() } : {}),
    },
  });
  await writeAudit({ actorId: admin.id, action: "blog.setStatus", targetType: "blogPost", targetId: id, meta: { status } });
  revalidatePath("/pr/yonet/blog");
  return { ok: true };
}

export async function deleteBlogPost(id: string) {
  const admin = await requireAdmin();
  await db.blogPost.delete({ where: { id } });
  await writeAudit({ actorId: admin.id, action: "blog.delete", targetType: "blogPost", targetId: id });
  revalidatePath("/pr/yonet/blog");
  return { ok: true };
}
