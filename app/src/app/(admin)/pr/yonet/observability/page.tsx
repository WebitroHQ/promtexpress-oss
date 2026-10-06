/**
 * FAZ 7 (2026-05-03) — Observability dashboard.
 *
 * p50/p95/p99 generation latency over last 24h, queue depth, status distribution.
 * Server Component, 30s revalidate.
 */
import { auth } from "@/lib/auth";
import { AdminShell } from "@/components/feature/admin/admin-shell";
import { AdminPageHeader } from "@/components/feature/admin/admin-page-header";
import { db } from "@/db/client";
import { getGenerationQueue } from "@/lib/queue/generation-queue";
import { getRedis } from "@/lib/redis";

export const dynamic = "force-dynamic";
export const revalidate = 30;

function percentile(sorted: number[], p: number): number {
  if (sorted.length === 0) return 0;
  const i = Math.min(sorted.length - 1, Math.floor((sorted.length - 1) * p));
  return sorted[i] ?? 0;
}

export default async function ObservabilityPage() {
  const session = await auth();
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000);

  const [latencyRows, statusGroups, modalityGroups, totalCount, recentTraces, qualifiedEngines] = await Promise.all([
    db.generationTrace.findMany({
      where: { createdAt: { gte: since }, totalLatencyMs: { gt: 0 } },
      select: { totalLatencyMs: true },
      orderBy: { totalLatencyMs: "asc" },
      take: 10000,
    }),
    db.generationTrace.groupBy({
      by: ["status"],
      where: { createdAt: { gte: since } },
      _count: true,
    }),
    db.generationTrace.groupBy({
      by: ["modality"],
      where: { createdAt: { gte: since } },
      _count: true,
      orderBy: { _count: { modality: "desc" } },
    }),
    db.generationTrace.count({ where: { createdAt: { gte: since } } }),
    // FAZ D2 — cache hit + fallback usage signals (last 24h, sample up to 5K traces)
    db.generationTrace.findMany({
      where: { createdAt: { gte: since } },
      select: { finalJson: true, engineSourcesJson: true },
      take: 5000,
    }),
    // FAZ C4 — last qualification snapshot per active engine
    db.aiEngine.findMany({
      where: { isActive: true },
      select: { id: true, name: true, capabilityTier: true, lastQualificationJson: true },
      orderBy: { sortOrder: "asc" },
    }),
  ]);

  // FAZ D2 — Queue + worker telemetry (BullMQ + Redis), best-effort.
  let queueDepth = 0;
  let queueActive = 0;
  let queueDelayed = 0;
  let avgJobMs = 0;
  let intentCacheKeys = 0;
  try {
    const q = getGenerationQueue();
    const counts = await q.getJobCounts("waiting", "active", "delayed");
    queueDepth = counts.waiting ?? 0;
    queueActive = counts.active ?? 0;
    queueDelayed = counts.delayed ?? 0;
    const r = getRedis();
    const ema = await r.get("metrics:gen:avg_job_ms");
    if (ema) avgJobMs = Number(ema);
    // SCAN for intent-cache:v1:* — sample first 500 (cap)
    const scanned = await r.scan("0", "MATCH", "intent-cache:v1:*", "COUNT", 500);
    intentCacheKeys = (scanned[1] as string[])?.length ?? 0;
  } catch {
    /* metrics best-effort */
  }

  // FAZ B2 — derive cache-hit rate from trace samples (finalJson.cacheHit set by persistCachedResult)
  let cacheHits = 0;
  for (const t of recentTraces) {
    const fj = t.finalJson as { cacheHit?: boolean } | null;
    if (fj?.cacheHit === true) cacheHits++;
  }
  const cacheHitRate =
    recentTraces.length > 0 ? Math.round((cacheHits / recentTraces.length) * 1000) / 10 : 0;

  const latencies = latencyRows
    .map((r) => r.totalLatencyMs)
    .filter((n): n is number => typeof n === "number")
    .sort((a, b) => a - b);
  const p50 = percentile(latencies, 0.5);
  const p95 = percentile(latencies, 0.95);
  const p99 = percentile(latencies, 0.99);
  const max = latencies[latencies.length - 1] ?? 0;
  const avg = latencies.length > 0 ? Math.round(latencies.reduce((a, b) => a + b, 0) / latencies.length) : 0;
  const cloudflare524Risk = latencies.filter((l) => l >= 100_000).length;
  const nginx504Risk = latencies.filter((l) => l >= 120_000).length;

  return (
    <AdminShell current="observability" userEmail={session?.user?.email}>
      <AdminPageHeader
        title="Observability"
        sub="Generation pipeline latency + queue health (last 24h)"
      />
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <Stat label="Total generations (24h)" value={totalCount.toLocaleString()} />
        <Stat label="Average latency" value={`${(avg / 1000).toFixed(1)}s`} />
        <Stat label="p50 latency" value={`${(p50 / 1000).toFixed(1)}s`} />
        <Stat label="p95 latency" value={`${(p95 / 1000).toFixed(1)}s`} tone={p95 > 100_000 ? "danger" : "ok"} />
        <Stat label="p99 latency" value={`${(p99 / 1000).toFixed(1)}s`} tone={p99 > 100_000 ? "danger" : "ok"} />
        <Stat label="Max latency" value={`${(max / 1000).toFixed(1)}s`} />
        <Stat label="≥100s (Cloudflare 524 risk)" value={cloudflare524Risk.toString()} tone={cloudflare524Risk > 0 ? "danger" : "ok"} />
        <Stat label="≥120s (nginx 504 risk)" value={nginx504Risk.toString()} tone={nginx504Risk > 0 ? "danger" : "ok"} />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-6">
        <div className="rounded-xl border border-border bg-surface p-4">
          <p className="text-sm font-medium mb-2">Status distribution</p>
          <table className="w-full text-sm">
            <tbody>
              {statusGroups.map((g) => (
                <tr key={g.status} className="border-t border-border">
                  <td className="py-1 font-mono text-xs">{g.status}</td>
                  <td className="py-1 text-right">{g._count.toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="rounded-xl border border-border bg-surface p-4">
          <p className="text-sm font-medium mb-2">By modality</p>
          <table className="w-full text-sm">
            <tbody>
              {modalityGroups.map((g) => (
                <tr key={g.modality} className="border-t border-border">
                  <td className="py-1 font-mono text-xs">{g.modality}</td>
                  <td className="py-1 text-right">{g._count.toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <p className="text-xs text-text-muted mb-6">
        Cloudflare default timeout is 100s. Async queue (FAZ 4) returns 202 immediately — these latencies measure
        worker-side pipeline duration, not user-perceived wait.
      </p>

      {/* FAZ D2 — queue + worker telemetry */}
      <h2 className="text-sm font-semibold mb-2">Queue & worker (live)</h2>
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-4">
        <Stat label="Queue waiting" value={queueDepth.toLocaleString()} tone={queueDepth > 100 ? "danger" : "ok"} />
        <Stat label="Active jobs" value={queueActive.toLocaleString()} />
        <Stat label="Delayed" value={queueDelayed.toLocaleString()} />
        <Stat label="Avg job (EMA)" value={avgJobMs > 0 ? `${(avgJobMs / 1000).toFixed(1)}s` : "—"} />
        <Stat label="Parallel slots" value="16" />
      </div>

      {/* FAZ B2 — intent cache telemetry */}
      <h2 className="text-sm font-semibold mb-2">Cache & fallback signals (24h sample)</h2>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-6">
        <Stat label="Intent cache keys (Redis)" value={intentCacheKeys.toLocaleString() + (intentCacheKeys >= 500 ? "+" : "")} />
        <Stat label="Cache hit rate" value={`${cacheHitRate}%`} tone={cacheHitRate >= 30 ? "ok" : undefined} />
        <Stat label="Trace sample size" value={recentTraces.length.toLocaleString()} />
      </div>

      {/* FAZ C3+C4 — engine tier + qualification */}
      <h2 className="text-sm font-semibold mb-2">Engines (tier + last qualification)</h2>
      <div className="rounded-xl border border-border bg-surface p-4 mb-6 overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-text-muted text-xs">
              <th className="text-left py-1 pr-3">Engine</th>
              <th className="text-left py-1 pr-3">Tier</th>
              <th className="text-right py-1 pr-3">Last score</th>
              <th className="text-right py-1 pr-3">Passing?</th>
              <th className="text-right py-1">Ran at</th>
            </tr>
          </thead>
          <tbody>
            {qualifiedEngines.length === 0 && (
              <tr>
                <td colSpan={5} className="py-2 text-text-muted text-xs">
                  No active engines
                </td>
              </tr>
            )}
            {qualifiedEngines.map((e) => {
              const q = e.lastQualificationJson as
                | { score?: number; passing?: boolean; ranAt?: number }
                | null;
              return (
                <tr key={e.id} className="border-t border-border">
                  <td className="py-1 pr-3 font-mono text-xs">{e.name}</td>
                  <td className="py-1 pr-3">
                    <span
                      className={`inline-block px-1.5 py-0.5 rounded text-xs ${
                        e.capabilityTier === "S"
                          ? "bg-violet-500/15 text-violet-300"
                          : e.capabilityTier === "A"
                          ? "bg-blue-500/15 text-blue-300"
                          : e.capabilityTier === "B"
                          ? "bg-emerald-500/15 text-emerald-300"
                          : e.capabilityTier === "C"
                          ? "bg-amber-500/15 text-amber-300"
                          : "bg-zinc-500/15 text-zinc-400"
                      }`}
                    >
                      {e.capabilityTier ?? "—"}
                    </span>
                  </td>
                  <td className="py-1 pr-3 text-right">{q?.score != null ? `${q.score}` : "—"}</td>
                  <td className="py-1 pr-3 text-right">
                    {q?.passing == null ? "—" : q.passing ? "✅" : "❌"}
                  </td>
                  <td className="py-1 text-right text-xs text-text-muted">
                    {q?.ranAt ? new Date(q.ranAt).toISOString().slice(0, 16).replace("T", " ") : "—"}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </AdminShell>
  );
}

function Stat({ label, value, tone }: { label: string; value: string; tone?: "ok" | "danger" }) {
  return (
    <div
      className={`rounded-xl border p-3 ${
        tone === "danger" ? "border-error/40 bg-error/5" : "border-border bg-surface"
      }`}
    >
      <p className="text-xs text-text-muted">{label}</p>
      <p className={`text-lg font-semibold ${tone === "danger" ? "text-error" : ""}`}>{value}</p>
    </div>
  );
}
