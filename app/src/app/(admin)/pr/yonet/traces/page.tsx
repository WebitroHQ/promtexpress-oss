import Link from "next/link";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { AdminShell } from "@/components/feature/admin/admin-shell";
import { AdminPageHeader } from "@/components/feature/admin/admin-page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { db } from "@/db/client";

export default async function TracesPage() {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") redirect("/dashboard");

  const traces = await db.generationTrace.findMany({
    orderBy: { createdAt: "desc" },
    take: 50,
    select: {
      id: true,
      promptId: true,
      userId: true,
      iterationOf: true,
      modality: true,
      totalLatencyMs: true,
      status: true,
      createdAt: true,
    },
  });

  return (
    <AdminShell current="traces" userEmail={session.user.email}>
      <AdminPageHeader
        helpKey="traces"
        title="Generation Traces"
        sub="Last 50 generations. Each row contains the input/output trace of all 6 pipeline layers."
      />
      {traces.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center text-sm text-text-muted">
            No generations yet. Wire up the pipeline (`/pr/yonet/agent-roles`).
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-0">
            <table className="w-full text-sm min-w-[640px]">
              <thead className="border-b border-border">
                <tr className="text-left">
                  <th className="px-4 py-2 text-xs font-medium text-text-muted">Time</th>
                  <th className="px-4 py-2 text-xs font-medium text-text-muted">Status</th>
                  <th className="px-4 py-2 text-xs font-medium text-text-muted">Modality</th>
                  <th className="px-4 py-2 text-xs font-medium text-text-muted">Latency</th>
                  <th className="px-4 py-2 text-xs font-medium text-text-muted">Iteration</th>
                  <th className="px-4 py-2 text-xs font-medium text-text-muted">Trace ID</th>
                </tr>
              </thead>
              <tbody>
                {traces.map((t) => (
                  <tr key={t.id} className="border-b border-border hover:bg-surface-2/40 transition-colors">
                    <td className="px-4 py-2 text-xs">
                      <Link href={`/pr/yonet/traces/${t.id}`} className="text-primary hover:underline">
                        {t.createdAt.toLocaleString("tr-TR")}
                      </Link>
                    </td>
                    <td className="px-4 py-2"><Badge variant={t.status === "ok" ? "default" : "error"}>{t.status}</Badge></td>
                    <td className="px-4 py-2 text-xs">{t.modality}</td>
                    <td className="px-4 py-2 text-xs">{t.totalLatencyMs ? `${t.totalLatencyMs}ms` : "—"}</td>
                    <td className="px-4 py-2 text-xs">{t.iterationOf ? <Badge variant="outline">iter</Badge> : "—"}</td>
                    <td className="px-4 py-2 text-xs font-mono text-text-faint">
                      <Link href={`/pr/yonet/traces/${t.id}`} className="hover:text-primary hover:underline">
                        {t.id.slice(0, 12)}…
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}
    </AdminShell>
  );
}
