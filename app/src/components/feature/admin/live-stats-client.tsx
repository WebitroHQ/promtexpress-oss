"use client";

import * as React from "react";
import type { DailyPoint, LiveStats, PeriodCounts } from "@/lib/admin/live-stats";

const REFRESH_MS = 10_000;

const nf = new Intl.NumberFormat("en-US");

/** "+12%" against the previous 30 days, or a plain note when there is nothing to compare with. */
function trend(c: PeriodCounts): { text: string; up: boolean } {
  if (c.prev30 === 0) return { text: c.last30 > 0 ? "no data for the previous 30 days" : "no data", up: true };
  const change = ((c.last30 - c.prev30) / c.prev30) * 100;
  return { text: `${change >= 0 ? "+" : ""}${change.toFixed(0)}% vs the previous 30 days`, up: change >= 0 };
}

function PeriodCard({ title, counts, note }: { title: string; counts: PeriodCounts; note?: string }) {
  const t = trend(counts);
  return (
    <div className="rounded-xl border border-border bg-surface p-4">
      <p className="text-xs text-text-muted mb-1">{title}</p>
      <p className="text-[28px] font-semibold tracking-tight tabular-nums">{nf.format(counts.today)}</p>
      <p className="text-xs text-text-faint mb-3">today · yesterday {nf.format(counts.yesterday)}</p>
      <dl className="grid grid-cols-3 gap-2 text-sm">
        <div>
          <dt className="text-[11px] text-text-faint">7 days</dt>
          <dd className="tabular-nums font-medium">{nf.format(counts.last7)}</dd>
        </div>
        <div>
          <dt className="text-[11px] text-text-faint">30 days</dt>
          <dd className="tabular-nums font-medium">{nf.format(counts.last30)}</dd>
        </div>
        <div>
          <dt className="text-[11px] text-text-faint">Total</dt>
          <dd className="tabular-nums font-medium">{nf.format(counts.total)}</dd>
        </div>
      </dl>
      <p className={`text-xs mt-3 ${t.up ? "text-success" : "text-error"}`}>{t.text}</p>
      {note && <p className="text-[11px] text-text-faint mt-1">{note}</p>}
    </div>
  );
}

function DailyBars({ title, data, pick }: { title: string; data: DailyPoint[]; pick: (p: DailyPoint) => number }) {
  const values = data.map(pick);
  const max = Math.max(1, ...values);
  const total = values.reduce((a, b) => a + b, 0);
  return (
    <div className="rounded-xl border border-border bg-surface p-5">
      <div className="flex justify-between items-baseline mb-4">
        <h3 className="font-semibold text-[15px]">{title}</h3>
        <span className="text-xs text-text-faint tabular-nums">last 30 days: {nf.format(total)}</span>
      </div>
      <div className="flex items-end gap-[3px] h-[120px]" role="img" aria-label={`${title}, ${total} in the last 30 days`}>
        {data.map((p, i) => (
          <div
            key={p.day}
            title={`${p.day}: ${nf.format(values[i])}`}
            className="flex-1 min-w-0 rounded-sm bg-primary/80 hover:bg-primary"
            style={{ height: `${Math.max(values[i] > 0 ? 4 : 1, (values[i] / max) * 100)}%`, opacity: values[i] > 0 ? 1 : 0.25 }}
          />
        ))}
      </div>
      <div className="flex justify-between text-[11px] text-text-faint mt-2">
        <span>{data[0]?.day.slice(5)}</span>
        <span>{data[data.length - 1]?.day.slice(5)}</span>
      </div>
    </div>
  );
}

function RankList({ title, rows, empty }: { title: string; rows: { label: string; value: number }[]; empty: string }) {
  const max = Math.max(1, ...rows.map((r) => r.value));
  return (
    <div className="rounded-xl border border-border bg-surface p-5">
      <h3 className="font-semibold text-[15px] mb-4">{title}</h3>
      {rows.length === 0 ? (
        <p className="text-sm text-text-muted">{empty}</p>
      ) : (
        <ul className="flex flex-col gap-2.5">
          {rows.map((r) => (
            <li key={r.label}>
              <div className="flex justify-between gap-3 text-sm mb-1">
                <span className="truncate">{r.label}</span>
                <span className="tabular-nums text-text-muted shrink-0">{nf.format(r.value)}</span>
              </div>
              <div className="h-1.5 rounded-full bg-border overflow-hidden">
                <div className="h-full bg-primary" style={{ width: `${(r.value / max) * 100}%` }} />
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export function LiveStatsClient({ initial }: { initial: LiveStats }) {
  const [stats, setStats] = React.useState(initial);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    let cancelled = false;
    const load = async () => {
      if (document.hidden) return; // don't query the database for a tab nobody is looking at
      try {
        const res = await fetch("/api/admin/live-stats", { cache: "no-store" });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const next = (await res.json()) as LiveStats;
        if (!cancelled) {
          setStats(next);
          setError(null);
        }
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : "connection error");
      }
    };
    const timer = setInterval(load, REFRESH_MS);
    document.addEventListener("visibilitychange", load);
    return () => {
      cancelled = true;
      clearInterval(timer);
      document.removeEventListener("visibilitychange", load);
    };
  }, []);

  const keyShare = stats.aiKeys.totalUsers > 0 ? Math.round((stats.aiKeys.usersWithKey / stats.aiKeys.totalUsers) * 100) : 0;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-x-5 gap-y-2 rounded-xl border border-border bg-surface px-5 py-3">
        <span className="flex items-center gap-2 text-sm">
          <span className={`w-2 h-2 rounded-full ${error ? "bg-error" : "bg-success animate-pulse"}`} />
          <strong className="tabular-nums">{nf.format(stats.onlineNow)}</strong> on the site right now
          <span className="text-text-faint">(last 5 minutes)</span>
        </span>
        <span className="text-xs text-text-faint ml-auto">
          {error
            ? `Could not refresh: ${error}. Showing data from ${new Date(stats.generatedAt).toLocaleTimeString("en-GB")}`
            : `Updated ${new Date(stats.generatedAt).toLocaleTimeString("en-GB")} · refreshes every 10 seconds`}
        </span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-3">
        <PeriodCard title="Visitors" counts={stats.visitors} note="Distinct browser sessions" />
        <PeriodCard title="Page views" counts={stats.pageViews} />
        <PeriodCard title="Sign-ups" counts={stats.signups} />
        <PeriodCard title="Prompts generated" counts={stats.prompts} />
        <PeriodCard title="Added to library" counts={stats.library} note="Total = exemplars in the library" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <DailyBars title="Visitors per day" data={stats.daily} pick={(p) => p.visitors} />
        <DailyBars title="Sign-ups per day" data={stats.daily} pick={(p) => p.signups} />
        <DailyBars title="Prompts per day" data={stats.daily} pick={(p) => p.prompts} />
        <DailyBars title="Library additions per day" data={stats.daily} pick={(p) => p.libraryAdded} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <RankList
          title="Library by modality"
          rows={stats.library.byModality.map((r) => ({ label: r.modality, value: r.count }))}
          empty="The library is empty"
        />
        <RankList
          title="Library by status"
          rows={stats.library.byStatus.map((r) => ({ label: r.status, value: r.count }))}
          empty="The library is empty"
        />
        <div className="rounded-xl border border-border bg-surface p-5">
          <h3 className="font-semibold text-[15px] mb-1">Users with their own AI key</h3>
          <p className="text-[28px] font-semibold tracking-tight tabular-nums">
            {nf.format(stats.aiKeys.usersWithKey)}
            <span className="text-sm font-normal text-text-muted"> / {nf.format(stats.aiKeys.totalUsers)} users ({keyShare}%)</span>
          </p>
          <ul className="mt-3 flex flex-col gap-1.5 text-sm">
            {stats.aiKeys.byProvider.length === 0 ? (
              <li className="text-text-muted">Nobody has added a key yet</li>
            ) : (
              stats.aiKeys.byProvider.map((p) => (
                <li key={p.provider} className="flex justify-between">
                  <span>{p.provider}</span>
                  <span className="tabular-nums text-text-muted">{nf.format(p.count)}</span>
                </li>
              ))
            )}
          </ul>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <RankList
          title="Top pages today"
          rows={stats.topPagesToday.map((r) => ({ label: r.path, value: r.views }))}
          empty="No page views today"
        />
        <RankList
          title="Referrers (30 days)"
          rows={stats.topReferrers30.map((r) => ({ label: r.referrer, value: r.visitors }))}
          empty="No referrers recorded"
        />
        <div className="rounded-xl border border-border bg-surface p-5">
          <h3 className="font-semibold text-[15px] mb-4">Latest sign-ups</h3>
          {stats.recentSignups.length === 0 ? (
            <p className="text-sm text-text-muted">No users yet</p>
          ) : (
            <ul className="flex flex-col gap-2 text-sm">
              {stats.recentSignups.map((u) => (
                <li key={u.email} className="flex justify-between gap-3">
                  <span className="truncate">{u.email}</span>
                  <span className="text-text-faint shrink-0">{new Date(u.at).toLocaleDateString("en-GB")}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
