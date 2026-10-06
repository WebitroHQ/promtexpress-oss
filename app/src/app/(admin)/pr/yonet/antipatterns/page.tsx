import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { AdminShell } from "@/components/feature/admin/admin-shell";
import { AdminPageHeader } from "@/components/feature/admin/admin-page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { db } from "@/db/client";

export default async function AntiPatternsPage() {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") redirect("/dashboard");

  const rules = await db.antiPatternRule.findMany({
    orderBy: [{ severity: "desc" }, { createdAt: "desc" }],
  });

  return (
    <AdminShell current="antipatterns" userEmail={session.user.email}>
      <AdminPageHeader
        helpKey="antipatterns"
        title="Anti-Pattern Rules"
        sub={`${rules.length} rules. Generated prompts are validated against these in the validator.`}
      />
      {rules.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center text-sm text-text-muted">
            No anti-pattern rules yet. Add them automatically via Training Distillations or manually.
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-0">
            <table className="w-full text-sm min-w-[640px]">
              <thead className="border-b border-border">
                <tr className="text-left">
                  <th className="px-4 py-2 text-xs font-medium text-text-muted">Domain</th>
                  <th className="px-4 py-2 text-xs font-medium text-text-muted">Pattern</th>
                  <th className="px-4 py-2 text-xs font-medium text-text-muted">Severity</th>
                  <th className="px-4 py-2 text-xs font-medium text-text-muted">Rationale</th>
                  <th className="px-4 py-2 text-xs font-medium text-text-muted">Active</th>
                </tr>
              </thead>
              <tbody>
                {rules.map((r) => (
                  <tr key={r.id} className="border-b border-border">
                    <td className="px-4 py-2 text-xs">{r.domainSlug ?? <span className="text-text-faint">global</span>}</td>
                    <td className="px-4 py-2 text-xs font-mono">{r.pattern}{r.isRegex && <Badge variant="outline" className="ml-1">regex</Badge>}</td>
                    <td className="px-4 py-2"><Badge variant={r.severity === "block" ? "error" : "default"}>{r.severity}</Badge></td>
                    <td className="px-4 py-2 text-xs text-text-muted">{r.rationale}</td>
                    <td className="px-4 py-2 text-xs">{r.isActive ? "✓" : "—"}</td>
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
