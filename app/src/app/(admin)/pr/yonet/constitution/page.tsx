import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { AdminShell } from "@/components/feature/admin/admin-shell";
import { AdminPageHeader } from "@/components/feature/admin/admin-page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { db } from "@/db/client";

export default async function ConstitutionPage() {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") redirect("/dashboard");

  const all = await db.constitution.findMany({
    orderBy: [{ activatedAt: "desc" }, { createdAt: "desc" }],
  });

  return (
    <AdminShell current="constitution" userEmail={session.user.email}>
      <AdminPageHeader
        helpKey="constitution"
        title="Constitution"
        sub="The Synthesizer's main system prompt. Versioned — only one can be isActive."
      />
      {all.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center text-sm text-text-muted">
            No Constitution yet. Run seed: <code className="text-text">pnpm db:seed</code>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {all.map((c) => (
            <Card key={c.id} className={c.isActive ? "border-primary" : ""}>
              <CardContent className="p-5">
                <div className="flex items-start justify-between gap-4 mb-3">
                  <div>
                    <h3 className="text-[15px] font-semibold flex items-center gap-2">
                      Version {c.version}
                      {c.isActive && <Badge>Active</Badge>}
                    </h3>
                    <p className="text-xs text-text-faint mt-1">
                      Created: {c.createdAt.toLocaleString("en-US")} · Activated: {c.activatedAt?.toLocaleString("en-US") ?? "—"}
                    </p>
                    {c.changelog && (
                      <p className="text-sm text-text-muted mt-2 italic">{c.changelog}</p>
                    )}
                  </div>
                </div>
                <details>
                  <summary className="text-xs text-text-muted cursor-pointer hover:text-text">
                    Show content ({c.content.length} char)
                  </summary>
                  <pre className="mt-2 rounded-md border border-border bg-surface-2 p-3 text-[11px] text-text-muted whitespace-pre-wrap max-h-[600px] overflow-auto">
                    {c.content}
                  </pre>
                </details>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </AdminShell>
  );
}
