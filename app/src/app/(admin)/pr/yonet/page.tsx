import { auth } from "@/lib/auth";
import { Download } from "lucide-react";
import { AdminShell } from "@/components/feature/admin/admin-shell";
import { AdminPageHeader } from "@/components/feature/admin/admin-page-header";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { getDashboardData } from "@/lib/admin/dashboard-stats";

export default async function AdminDashboardPage() {
  const session = await auth();
  const data = await getDashboardData();

  // Build a 12-point polyline. Normalize values to chart 0..200 (inverted).
  const maxRev = Math.max(1, ...data.chart.map((c) => c.revenue));
  const maxGen = Math.max(1, ...data.chart.map((c) => c.generations));
  const stepX = data.chart.length > 1 ? 600 / (data.chart.length - 1) : 0;
  const revPoly = data.chart.map((c, i) => `${i * stepX},${175 - (c.revenue / maxRev) * 130}`).join(" ");
  const genPoly = data.chart.map((c, i) => `${i * stepX},${175 - (c.generations / maxGen) * 130}`).join(" ");
  const monthLabels = data.chart.map((c) => c.label.slice(5));

  return (
    <AdminShell current="dashboard" userEmail={session?.user?.email}>
      <AdminPageHeader
        helpKey="dashboard"
        title="Overview"
        sub="Live snapshot of platform health and revenue"
        actions={
          <>
            <Button variant="secondary" size="sm">Last 30 days</Button>
            <Button size="sm"><Download className="h-3.5 w-3.5" /> Export report</Button>
          </>
        }
      />

      {/* KPI row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
        {data.stats.map((s) => (
          <div key={s.label} className="rounded-xl border border-border bg-surface p-4">
            <p className="text-xs text-text-muted mb-1">{s.label}</p>
            <p className="text-[28px] font-semibold tracking-tight">{s.value}</p>
            <p className={`text-xs mt-1 ${s.up ? "text-success" : "text-error"}`}>{s.delta}</p>
          </div>
        ))}
      </div>

      {/* Chart + health */}
      <div className="grid grid-cols-1 lg:grid-cols-[2fr_1fr] gap-4 mb-4">
        <div className="rounded-xl border border-border bg-surface p-5">
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-semibold text-[15px]">Revenue & generations</h3>
            <div className="flex gap-4 text-xs text-text-faint">
              <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm bg-primary inline-block" />Revenue</span>
              <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm bg-accent inline-block" />Generations</span>
            </div>
          </div>
          {data.chart.length === 0 ? (
            <div className="h-[180px] flex items-center justify-center text-sm text-text-muted">
              No data yet
            </div>
          ) : (
            <>
              <svg viewBox="0 0 600 200" className="w-full h-[180px]">
                {[0, 1, 2, 3].map((i) => (
                  <line key={i} x1={0} y1={i * 50} x2={600} y2={i * 50} stroke="var(--pe-border)" strokeDasharray="2,4" />
                ))}
                <polyline fill="none" stroke="var(--pe-primary)" strokeWidth={2.5} points={revPoly} />
                <polyline fill="none" stroke="var(--pe-accent)" strokeWidth={2.5} strokeDasharray="4,3" points={genPoly} />
              </svg>
              <div className="flex justify-between text-[11px] text-text-faint mt-2">
                {monthLabels.map((m) => <span key={m}>{m}</span>)}
              </div>
            </>
          )}
        </div>

        <div className="rounded-xl border border-border bg-surface p-5">
          <h3 className="font-semibold text-[15px] mb-4">System health</h3>
          {data.health.map((s) => (
            <div key={s.service} className="flex justify-between items-center py-1.5 border-b border-border last:border-0 text-sm">
              <span className="text-text-muted">{s.service}</span>
              <span className={`flex items-center gap-1.5 text-xs font-medium ${
                s.status === "Healthy" ? "text-success" : s.status === "Degraded" ? "text-warning" : "text-error"
              }`}>
                <span className={`w-2 h-2 rounded-full ${
                  s.status === "Healthy" ? "bg-success" : s.status === "Degraded" ? "bg-warning" : "bg-error"
                }`} />
                {s.status}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Plan dist + activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="rounded-xl border border-border bg-surface p-5">
          <h3 className="font-semibold text-[15px] mb-4">Plan distribution</h3>
          {data.planDist.length === 0 ? (
            <p className="text-sm text-text-muted">No plans yet</p>
          ) : (
            data.planDist.map((r) => (
              <div key={r.name} className="mb-3">
                <div className="flex justify-between text-sm mb-1">
                  <span>{r.name}</span>
                  <span className="text-text-muted tabular-nums">{r.users.toLocaleString()} · {r.pct}%</span>
                </div>
                <Progress value={r.pct} className="h-2" />
              </div>
            ))
          )}
        </div>

        <div className="rounded-xl border border-border bg-surface p-5">
          <h3 className="font-semibold text-[15px] mb-4">Recent activity</h3>
          {data.activity.length === 0 ? (
            <p className="text-sm text-text-muted">No activity yet</p>
          ) : (
            <div className="flex flex-col">
              {data.activity.map((a, i) => (
                <div key={i} className={`flex justify-between py-2 text-sm ${i > 0 ? "border-t border-border" : ""}`}>
                  <span>
                    <span className="font-medium">{a.who}</span>{" "}
                    <span className="text-text-muted">{a.what}</span>
                  </span>
                  <span className="text-text-faint shrink-0 ml-3">{a.t}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </AdminShell>
  );
}
