import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { resolveEngine } from "@/lib/engines/registry";

const BodySchema = z.object({
  engineId: z.string().min(1),
});

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  let body: z.infer<typeof BodySchema>;
  try {
    body = BodySchema.parse(await req.json());
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  // 2026-05-04 — Engine contract test: 3 stages.
  //   T1: free-text (non-empty string back)
  //   T2: JSON mode without schema (parseable JSON)
  //   T3: JSON mode with strict schema (parseable JSON matching shape)
  // Reasoning models that fail T2/T3 here would also fail in production —
  // surfaces the "engine-agnostic" contract before admin assigns the engine.
  type StageResult = {
    name: string;
    ok: boolean;
    latencyMs: number;
    selfRepairUsed?: boolean;
    preview?: string;
    error?: string;
  };

  const stages: StageResult[] = [];
  let adapter;
  let meta;
  try {
    const resolved = await resolveEngine(body.engineId);
    adapter = resolved.adapter;
    meta = resolved.meta;
  } catch (err) {
    return NextResponse.json({
      ok: false,
      error: err instanceof Error ? err.message : "Failed to resolve engine",
    });
  }

  // 2026-05-11 — Reasoning-aware contract budgets.
  // Production synthesizer scales maxTokens by 2.5x for reasoning engines so
  // the model has room to emit content after its hidden thinking pass (see
  // 4-synthesizer.ts: maxTokensForModality + supportsReasoning branch).
  // The contract test must mirror that intent; otherwise a reasoning model
  // burns its budget on chain-of-thought and emits empty content, surfacing
  // as a false "contract violation" in the admin UI.
  // Note: capability flag is admin-managed on AiEngine row — no model name
  // or provider value is hardcoded here (CLAUDE.md §8).
  const t1MaxTokens = meta.supportsReasoning ? 256 : 32;
  const jsonMaxTokens = meta.supportsReasoning ? 512 : 64;

  // T1 — free-text
  {
    const t0 = Date.now();
    try {
      const r = await adapter.generate({
        systemPrompt: "You are a test assistant. Reply with exactly what is asked.",
        userMessage: "Reply with exactly: OK",
        maxTokens: t1MaxTokens,
        temperature: 0,
      });
      const text = r.text.trim();
      // 2026-05-11 — When the adapter returns cleanly but text is empty, the
      // generic top-level error string used to render as "contract violation"
      // (route default), which is misleading. Surface a specific diagnosis so
      // the admin can tell apart "engine misconfigured" vs "engine exhausted
      // its budget on hidden thinking" without reading server logs. The
      // diagnosis is data-driven from meta.supportsReasoning (admin-managed
      // capability flag) — no model name / provider hardcoded (CLAUDE.md §8).
      const emptyContentDiagnosis = meta.supportsReasoning
        ? "engine returned empty content (reasoning model exhausted token budget on hidden thinking; adapter self-repair also produced no content — consider raising maxOutputTokens for this engine)"
        : "engine returned empty content (adapter completed without error but content was empty)";
      stages.push({
        name: "free-text",
        ok: text.length > 0,
        latencyMs: Date.now() - t0,
        selfRepairUsed: r.selfRepairUsed,
        preview: text.slice(0, 100),
        error: text.length > 0 ? undefined : emptyContentDiagnosis,
      });
    } catch (err) {
      stages.push({
        name: "free-text",
        ok: false,
        latencyMs: Date.now() - t0,
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }

  // T2 — JSON mode (no schema)
  {
    const t0 = Date.now();
    try {
      const r = await adapter.generate({
        systemPrompt: 'You are a test JSON emitter. Output ONLY a JSON object: {"status":"ok"}',
        userMessage: 'Emit the JSON now.',
        maxTokens: jsonMaxTokens,
        temperature: 0,
        responseFormat: "json",
      });
      let parsed: unknown = null;
      try { parsed = JSON.parse(r.text); } catch { /* try fence */
        const m = /```(?:json)?\s*([\s\S]*?)```/i.exec(r.text);
        if (m?.[1]) { try { parsed = JSON.parse(m[1]); } catch { /* ignore */ } }
      }
      stages.push({
        name: "json-mode",
        ok: parsed !== null && typeof parsed === "object",
        latencyMs: Date.now() - t0,
        selfRepairUsed: r.selfRepairUsed,
        preview: r.text.trim().slice(0, 100),
      });
    } catch (err) {
      stages.push({
        name: "json-mode",
        ok: false,
        latencyMs: Date.now() - t0,
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }

  // T3 — JSON mode with schema
  {
    const t0 = Date.now();
    const schema = {
      type: "object",
      properties: {
        status: { type: "string" },
        count: { type: "number" },
      },
      required: ["status", "count"],
      additionalProperties: false,
    };
    try {
      const r = await adapter.generate({
        systemPrompt: 'Emit a JSON object that satisfies the schema. status="ready", count=42.',
        userMessage: 'Emit the JSON now.',
        maxTokens: jsonMaxTokens,
        temperature: 0,
        responseFormat: "json",
        outputSchema: schema,
      });
      let parsed: unknown = null;
      try { parsed = JSON.parse(r.text); } catch { /* fence fallback */
        const m = /```(?:json)?\s*([\s\S]*?)```/i.exec(r.text);
        if (m?.[1]) { try { parsed = JSON.parse(m[1]); } catch { /* ignore */ } }
      }
      const isObj = parsed !== null && typeof parsed === "object";
      const obj = isObj ? (parsed as Record<string, unknown>) : null;
      const ok = obj !== null && typeof obj.status === "string" && typeof obj.count === "number";
      stages.push({
        name: "json-schema",
        ok,
        latencyMs: Date.now() - t0,
        selfRepairUsed: r.selfRepairUsed,
        preview: r.text.trim().slice(0, 100),
      });
    } catch (err) {
      stages.push({
        name: "json-schema",
        ok: false,
        latencyMs: Date.now() - t0,
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }

  const allOk = stages.every((s) => s.ok);
  // Backward-compat with mapping-table.tsx UI: surface legacy fields at top.
  const lastOk = [...stages].reverse().find((s) => s.ok);
  const failingStage = stages.find((s) => !s.ok);
  const totalMs = stages.reduce((a, s) => a + s.latencyMs, 0);
  return NextResponse.json({
    ok: allOk,
    latencyMs: totalMs,
    preview: lastOk?.preview ?? "",
    error: allOk ? undefined : `${failingStage?.name ?? "stage"}: ${failingStage?.error ?? "contract violation"}`,
    engine: { id: meta.id, name: meta.name, provider: meta.provider, modelId: meta.modelId },
    stages,
  });
}
