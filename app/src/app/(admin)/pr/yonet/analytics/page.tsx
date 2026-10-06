import { auth } from "@/lib/auth";
import { AdminShell } from "@/components/feature/admin/admin-shell";
import { AdminPageHeader } from "@/components/feature/admin/admin-page-header";
import { Button } from "@/components/ui/button";
import { getAnalyticsData } from "@/lib/admin/analytics-stats";

export default async function AdminAnalyticsPage() {
  const session = await auth();
  const data = await getAnalyticsData(30);

  return (
    <AdminShell current="analytics" userEmail={session?.user?.email}>
      <AdminPageHeader
        helpKey="analytics"
        title="Analytics"
        sub={`Detailed usage, retention, and conversion${data.approximate ? " · approximate (full event tracking pending)" : ""}`}
        actions={<Button variant="secondary" size="sm">Last {data.windowDays} days</Button>}
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
        {data.stats.map((s) => (
          <div key={s.label} className="rounded-xl border border-border bg-surface p-4">
            <p className="text-xs text-text-muted mb-1">{s.label}</p>
            <p className="text-[28px] font-semibold tracking-tight">{s.value}</p>
            <p className={`text-xs mt-1 ${s.up ? "text-success" : "text-error"}`}>{s.delta}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="rounded-xl border border-border bg-surface p-5">
          <h3 className="font-semibold text-[15px] mb-4">Funnel · last {data.windowDays} days</h3>
          {data.funnel.map((s, i) => (
            <div key={s.step} className="mb-3">
              <div className="flex justify-between text-sm mb-1">
                <span>{s.step}</span>
                <span className="text-text-muted tabular-nums">{s.count.toLocaleString()} · {s.pct}%</span>
              </div>
              <div className="h-7 rounded bg-surface-2 overflow-hidden">
                <div
                  className="h-full bg-primary transition-all"
                  style={{ width: `${Math.max(0.5, s.pct)}%`, opacity: 1 - i * 0.12 }}
                />
              </div>
            </div>
          ))}
        </div>

        <div className="rounded-xl border border-border bg-surface p-5">
          <h3 className="font-semibold text-[15px] mb-4">Top countries</h3>
          {data.countries.length === 0 ? (
            <p className="text-sm text-text-muted">No users yet</p>
          ) : (
            data.countries.map((c) => (
              <div key={c.country} className="flex items-center gap-3 mb-2.5">
                <span className="w-[140px] text-sm shrink-0">{c.country}</span>
                <div className="flex-1 h-2 rounded-full bg-surface-2 overflow-hidden">
                  <div className="h-full rounded-full bg-accent" style={{ width: `${Math.min(100, c.pct * 3)}%` }} />
                </div>
                <span className="text-xs text-text-muted tabular-nums w-8 text-right">{c.pct}%</span>
              </div>
            ))
          )}
        </div>
      </div>

      {data.approximate && (
        <p className="text-[11px] text-text-faint mt-4">
          Note: Visitor/funnel numbers are proxy values (real page-event tracking model is added in Phase 2). Sign-up rate, trial → paid, churn, and country distribution are computed from real DB data.
        </p>
      )}
    </AdminShell>
  );
}
