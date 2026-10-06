import { auth } from "@/lib/auth";
import { AdminShell } from "@/components/feature/admin/admin-shell";
import { AdminPageHeader } from "@/components/feature/admin/admin-page-header";
import { QuestionsManager } from "@/components/feature/admin/questions-manager";
import { db } from "@/db/client";

export default async function AdminQuestionsPage() {
  const session = await auth();

  const rows = await db.questionTemplate.findMany({
    orderBy: [{ modality: "asc" }, { weight: "desc" }],
  });

  const items = rows.map((r) => ({
    id: r.id,
    modality: r.modality,
    category: r.category,
    question: r.question,
    options: Array.isArray(r.options) ? (r.options as unknown as string[]) : [],
    weight: r.weight,
    isActive: r.isActive,
  }));

  return (
    <AdminShell current="questions" userEmail={session?.user?.email}>
      <AdminPageHeader
        helpKey="questions"
        title="Questions"
        sub="Question pool grouped by modality — provided as context to the AI questioner engine"
      />
      <QuestionsManager items={items} />
    </AdminShell>
  );
}
