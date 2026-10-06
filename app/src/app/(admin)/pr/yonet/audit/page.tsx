import { auth } from "@/lib/auth";
import { AdminShell } from "@/components/feature/admin/admin-shell";
import { AdminPageHeader } from "@/components/feature/admin/admin-page-header";
import { Badge } from "@/components/ui/badge";
import { db } from "@/db/client";

interface SearchParams {
  action?: string;
  actor?: string;
}

export default async function AdminAuditPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const session = await auth();
  const params = await searchParams;

  const where = {
    ...(params.action ? { action: { startsWith: params.action } } : {}),
    ...(params.actor ? { actor: { email: { contains: params.actor, mode: "insensitive" as const } } } : {}),
  };

  const [rows, total] = await Promise.all([
    db.auditLog.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: 100,
      include: { actor: { select: { email: true } } },
    }),
    db.auditLog.count({ where }),
  ]);

  return (
    <AdminShell current="audit" userEmail={session?.user?.email}>
      <AdminPageHeader
        helpKey="audit"
        title="Audit log"
        sub={`All admin and system actions, append-only · ${rows.length} of ${total.toLocaleString()}`}
      />

      <form className="flex gap-2 mb-4 flex-wrap" method="get">
        <input
          name="action"
          defaultValue={params.action ?? ""}
          placeholder="Action prefix (e.g. user., plan.)"
          className="h-8 rounded-md border border-border bg-surface px-3 text-sm w-[240px]"
        />
        <input
          name="actor"
          defaultValue={params.actor ?? ""}
          placeholder="Actor email contains…"
          className="h-8 rounded-md border border-border bg-surface px-3 text-sm w-[240px]"
        />
        <button type="submit" className="h-8 rounded-md border border-border-strong bg-surface px-3 text-sm hover:bg-surface-2">Filter</button>
        {(params.action || params.actor) && (
          <a href="?" className="h-8 rounded-md border border-border bg-surface px-3 text-sm flex items-center text-text-muted hover:text-text">Clear</a>
        )}
      </form>

      <div className="rounded-xl border border-border bg-surface overflow-x-auto">
        <table className="w-full text-sm min-w-[640px]">
          <thead>
            <tr className="bg-surface-2 border-b border-border">
              {["When", "Actor", "Action", "Target", "IP"].map((h, i) => (
                <th key={i} className="px-4 py-3 text-left font-medium text-text-muted">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr><td colSpan={5} className="px-4 py-8 text-center text-sm text-text-muted">No audit records yet</td></tr>
            ) : (
              rows.map((e) => (
                <tr key={e.id} className="border-t border-border hover:bg-surface-2 transition-colors">
                  <td className="px-4 py-3 font-mono text-xs">{e.createdAt.toLocaleString()}</td>
                  <td className="px-4 py-3 text-text-muted">{e.actor?.email ?? "system"}</td>
                  <td className="px-4 py-3"><Badge className="font-mono text-[10px]">{e.action}</Badge></td>
                  <td className="px-4 py-3 text-text-muted">
                    {e.targetType ? (
                      <span>
                        {e.targetType}
                        {e.targetId && <span className="text-text-faint">:{e.targetId.slice(0, 16)}</span>}
                      </span>
                    ) : "—"}
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-text-muted">{e.ip ?? "—"}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </AdminShell>
  );
}
