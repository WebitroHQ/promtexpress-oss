import { auth } from "@/lib/auth";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { AdminShell } from "@/components/feature/admin/admin-shell";
import { AdminPageHeader } from "@/components/feature/admin/admin-page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { db } from "@/db/client";
import { TraceLayerPanel } from "@/components/feature/admin/trace-layer-panel";

interface Props {
  params: Promise<{ id: string }>;
}

export default async function TraceDetailPage({ params }: Props) {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") redirect("/dashboard");

  const { id } = await params;
  const trace = await db.generationTrace.findUnique({ where: { id } });

  if (!trace) notFound();

  const owner = await db.user.findUnique({
    where: { id: trace.userId },
    select: { email: true, name: true },
  });

  const meta: Array<[string, string]> = [
    ["Trace ID", trace.id],
    ["Created", trace.createdAt.toLocaleString("tr-TR")],
    ["Status", trace.status],
    ["Modality", trace.modality],
    ["Latency", trace.totalLatencyMs ? `${trace.totalLatencyMs}ms` : "—"],
    ["User", owner?.email ?? trace.userId],
    ["Prompt ID", trace.promptId ?? "—"],
    ["Iteration of", trace.iterationOf ?? "—"],
    ["Target engine", trace.targetEngineId ?? "—"],
  ];

  return (
    <AdminShell current="traces" userEmail={session.user.email}>
      <AdminPageHeader
        helpKey="traces"
        title="Trace Detail"
        sub={`Complete input/output trace of all 6 pipeline layers. Trace ID: ${trace.id}`}
      />
      <div className="mb-4 -mt-2">
        <Link href="/pr/yonet/traces" className="text-sm text-primary hover:underline">← Back to traces</Link>
      </div>

      <Card className="mb-6">
        <CardContent className="p-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 text-sm">
            {meta.map(([k, v]) => (
              <div key={k} className="flex flex-col">
                <span className="text-[11px] uppercase tracking-wide text-text-faint">{k}</span>
                <span className="font-medium">
                  {k === "Status" ? (
                    <Badge variant={v === "ok" ? "default" : "error"}>{v}</Badge>
                  ) : (
                    <span className="font-mono text-xs">{v}</span>
                  )}
                </span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <div className="flex flex-col gap-3">
        <TraceLayerPanel title="Layer 1 — Preprocess" subtitle="Cleaned text, language, PII, entity hints" data={trace.preprocessJson} />
        <TraceLayerPanel title="Layer 2 — Intent Analyzer" subtitle="Domain, scenario, chip questions, entities" data={trace.intentJson} />
        <TraceLayerPanel title="Layer 3 — Context Assembly" subtitle="Persona, exemplars, constitution version" data={trace.contextJson} />
        <TraceLayerPanel title="Layer 4 — Synthesizer" subtitle="Generated prompt(s) + assumptions" data={trace.synthesisJson} />
        <TraceLayerPanel title="Layer 5 — Validator" subtitle="Decision, issues, AI safety result" data={trace.validationJson} />
        <TraceLayerPanel title="Layer 6 — Final" subtitle="Final prompt + per-layer latencies" data={trace.finalJson} />
        <TraceLayerPanel title="Engine Sources" subtitle="Per-layer engine selection (modality-mapping vs role-assignment)" data={trace.engineSourcesJson} />
      </div>
    </AdminShell>
  );
}
