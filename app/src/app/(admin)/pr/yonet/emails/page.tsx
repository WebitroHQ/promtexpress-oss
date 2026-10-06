import { auth } from "@/lib/auth";
import { AdminShell } from "@/components/feature/admin/admin-shell";
import { AdminPageHeader } from "@/components/feature/admin/admin-page-header";
import { EmailEditorClient } from "@/components/feature/admin/email-editor-client";
import { db } from "@/db/client";

export default async function AdminEmailsPage() {
  const session = await auth();

  const rows = await db.emailTemplate.findMany({
    orderBy: [{ slug: "asc" }, { locale: "asc" }],
    take: 200,
  });

  const templates = rows.map((t) => ({
    id: t.id,
    slug: t.slug,
    locale: t.locale,
    subject: t.subject,
    bodyHtml: t.bodyHtml,
    bodyText: t.bodyText,
    isActive: t.isActive,
    sentCount: t.sentCount,
    updatedAt: t.updatedAt.toISOString(),
  }));

  const uniqueSlugs = new Set(templates.map((t) => t.slug)).size;

  return (
    <AdminShell current="emails" userEmail={session?.user?.email}>
      <AdminPageHeader helpKey="emails" title="Email templates" sub={`${uniqueSlugs} templates · ${templates.length} locales`} />
      <EmailEditorClient templates={templates} />
    </AdminShell>
  );
}
