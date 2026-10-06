"use client";

import * as React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { approveDistillation, rejectDistillation } from "@/server/actions/admin-training";

type DistillationRow = {
  id: string;
  type: "CONSTITUTION_UPDATE" | "PERSONA_UPDATE" | "ANTIPATTERN" | "EXEMPLAR";
  targetSlug: string | null;
  proposalJson: unknown;
  rationale: string;
  status: "PENDING" | "APPROVED" | "REJECTED" | "APPLIED";
  reviewNotes: string | null;
  resourceTitle: string | null;
  createdAt: string;
};

const STATUS_VARIANT: Record<DistillationRow["status"], "default" | "outline" | "error"> = {
  PENDING: "outline",
  APPROVED: "default",
  APPLIED: "default",
  REJECTED: "error",
};

export function DistillationsClient({ items }: { items: DistillationRow[] }) {
  const [busy, setBusy] = React.useState<string | null>(null);

  async function handleApprove(id: string) {
    const notes = window.prompt("Onay notu (opsiyonel):", "");
    setBusy(id);
    try {
      await approveDistillation(id, notes ?? undefined);
    } catch (e) {
      window.alert((e as Error).message);
    } finally {
      setBusy(null);
    }
  }

  async function handleReject(id: string) {
    const notes = window.prompt("Red sebebi (zorunlu):", "");
    if (!notes || !notes.trim()) return;
    setBusy(id);
    try {
      await rejectDistillation(id, notes.trim());
    } catch (e) {
      window.alert((e as Error).message);
    } finally {
      setBusy(null);
    }
  }

  if (items.length === 0) {
    return (
      <Card>
        <CardContent className="p-8 text-center text-sm text-text-muted">
          No distillations yet. Add a resource and run the Distiller.
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      {items.map((d) => (
        <Card key={d.id} className={d.status === "PENDING" ? "border-warning/50" : ""}>
          <CardContent className="p-4">
            <div className="flex items-start justify-between gap-4 mb-2">
              <div>
                <h3 className="text-sm font-semibold flex items-center gap-2 flex-wrap">
                  {d.type}
                  <Badge variant={STATUS_VARIANT[d.status]}>{d.status}</Badge>
                  {d.targetSlug && <Badge variant="outline">{d.targetSlug}</Badge>}
                </h3>
                <p className="text-[11px] text-text-faint mt-1">
                  Source: {d.resourceTitle ?? "?"} · {new Date(d.createdAt).toLocaleString("en-US")}
                </p>
              </div>
              {d.status === "PENDING" && (
                <div className="flex gap-2 shrink-0">
                  <Button
                    size="sm"
                    onClick={() => handleApprove(d.id)}
                    disabled={busy === d.id}
                  >Approve</Button>
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => handleReject(d.id)}
                    disabled={busy === d.id}
                  >Reject</Button>
                </div>
              )}
            </div>
            <p className="text-sm text-text-muted">{d.rationale}</p>
            {d.reviewNotes && (
              <p className="text-xs text-text-faint mt-1">Review note: {d.reviewNotes}</p>
            )}
            <details className="mt-2">
              <summary className="text-xs text-text-muted cursor-pointer hover:text-text">
                Proposal JSON
              </summary>
              <pre className="mt-1 rounded-md border border-border bg-surface-2 p-2 text-[11px] text-text-muted whitespace-pre-wrap max-h-[300px] overflow-auto">
                {JSON.stringify(d.proposalJson, null, 2)}
              </pre>
            </details>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
