import Link from "next/link";
import { auth } from "@/lib/auth";
import { db } from "@/db/client";
import { AdminShell } from "@/components/feature/admin/admin-shell";
import { AdminPageHeader } from "@/components/feature/admin/admin-page-header";
import { FeedbackStatusButtons } from "@/components/feature/admin/feedback-status-buttons";
import { Badge } from "@/components/ui/badge";

export const dynamic = "force-dynamic";

const FILTERS = [
  { key: "NEW", label: "New" },
  { key: "READ", label: "Read" },
  { key: "DONE", label: "Done" },
  { key: "ALL", label: "All" },
];
const CATEGORY_LABEL: Record<string, string> = { bug: "Bug", idea: "Idea", other: "Other" };

export default async function AdminFeedbackPage({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  const session = await auth();
  const params = await searchParams;
  const active = FILTERS.some((f) => f.key === params.status) ? (params.status as string) : "NEW";

  const [rows, counts] = await Promise.all([
    db.feedback.findMany({
      where: active === "ALL" ? {} : { status: active },
      orderBy: { createdAt: "desc" },
      take: 200,
      include: { user: { select: { email: true, name: true } } },
    }),
    db.feedback.groupBy({ by: ["status"], _count: { _all: true } }),
  ]);
  const countOf = (key: string) =>
    key === "ALL" ? counts.reduce((sum, c) => sum + c._count._all, 0) : (counts.find((c) => c.status === key)?._count._all ?? 0);

  return (
    <AdminShell current="feedback" userEmail={session?.user?.email}>
      <AdminPageHeader title="Feedback" sub="Messages sent by signed-in users from the Feedback page." />

      <div className="flex gap-1 border-b border-border mb-5 overflow-x-auto">
        {FILTERS.map((f) => (
          <Link
            key={f.key}
            href={`/pr/yonet/feedback?status=${f.key}`}
            className={`px-4 py-2.5 text-sm font-medium border-b-2 -mb-px whitespace-nowrap ${
              active === f.key ? "border-primary text-primary" : "border-transparent text-text-muted hover:text-text"
            }`}
          >
            {f.label} <span className="tabular-nums text-text-faint">({countOf(f.key)})</span>
          </Link>
        ))}
      </div>

      {rows.length === 0 ? (
        <p className="rounded-xl border border-border bg-surface p-8 text-center text-sm text-text-muted">
          {active === "NEW" ? "No new feedback." : "Nothing here."}
        </p>
      ) : (
        <ul className="flex flex-col gap-3">
          {rows.map((f) => (
            <li key={f.id} className="rounded-xl border border-border bg-surface p-5">
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-text-faint mb-2">
                <Badge>{CATEGORY_LABEL[f.category] ?? "Other"}</Badge>
                <span className="text-text-muted break-all">{f.user.name ? `${f.user.name} · ${f.user.email}` : f.user.email}</span>
                <span>{f.createdAt.toISOString().slice(0, 16).replace("T", " ")} UTC</span>
                <span>· {f.status}</span>
              </div>
              <p className="text-sm whitespace-pre-wrap break-words mb-3">{f.message}</p>
              <FeedbackStatusButtons id={f.id} status={f.status} />
            </li>
          ))}
        </ul>
      )}
    </AdminShell>
  );
}
