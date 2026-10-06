import { db } from "@/db/client";

export interface KpiStat {
  label: string;
  value: string;
  delta: string;
  up: boolean;
}

export interface PlanRow {
  name: string;
  users: number;
  pct: number;
}

export interface ActivityRow {
  who: string;
  what: string;
  t: string;
}

export interface ChartPoint {
  label: string;
  revenue: number;
  generations: number;
}

export interface SystemHealthRow {
  service: string;
  status: "Healthy" | "Degraded" | "Down";
}

export interface DashboardData {
  stats: KpiStat[];
  planDist: PlanRow[];
  activity: ActivityRow[];
  chart: ChartPoint[];
  health: SystemHealthRow[];
  generatedAt: string;
}

const MS_DAY = 86400000;

function pct(part: number, whole: number): number {
  if (whole <= 0) return 0;
  return Math.round((part / whole) * 1000) / 10;
}

function fmtMoney(n: number): string {
  if (n >= 1000) return `$${(n / 1000).toFixed(1)}K`;
  return `$${n.toFixed(0)}`;
}

function fmtNumber(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1000) return `${(n / 1000).toFixed(1)}K`;
  return n.toString();
}

function deltaPct(now: number, prev: number, asPct = false): { delta: string; up: boolean } {
  if (prev <= 0 && now <= 0) return { delta: "0%", up: true };
  if (prev <= 0) return { delta: "+new", up: true };
  const change = ((now - prev) / prev) * 100;
  const sign = change >= 0 ? "+" : "";
  return { delta: `${sign}${change.toFixed(1)}${asPct ? "pp" : "%"}`, up: change >= 0 };
}

function relTime(d: Date): string {
  const sec = Math.max(1, Math.floor((Date.now() - d.getTime()) / 1000));
  if (sec < 60) return `${sec}s ago`;
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min} min ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h ago`;
  const day = Math.floor(hr / 24);
  return `${day}d ago`;
}

export async function getDashboardData(): Promise<DashboardData> {
  const now = Date.now();
  const todayStart = new Date(); todayStart.setHours(0, 0, 0, 0);
  const last30Start = new Date(now - 30 * MS_DAY);
  const prev30Start = new Date(now - 60 * MS_DAY);

  const [
    activeSubs,
    activeUsers30,
    prevActiveUsers30,
    gensToday,
    gensYesterday,
    creditDebits30,
    creditDebitsPrev30,
    plans,
    subsByPlan,
    totalUsers,
    auditEntries,
    monthlyTraces,
    monthlySubs,
  ] = await Promise.all([
    db.subscription.findMany({
      where: { status: "ACTIVE" },
      include: { plan: { select: { priceMonthly: true } } },
    }),
    db.generationTrace.findMany({
      where: { createdAt: { gte: last30Start } },
      select: { userId: true },
      distinct: ["userId"],
    }),
    db.generationTrace.findMany({
      where: { createdAt: { gte: prev30Start, lt: last30Start } },
      select: { userId: true },
      distinct: ["userId"],
    }),
    db.generationTrace.count({ where: { createdAt: { gte: todayStart } } }),
    db.generationTrace.count({
      where: {
        createdAt: { gte: new Date(todayStart.getTime() - MS_DAY), lt: todayStart },
      },
    }),
    db.creditLedger.aggregate({
      where: { delta: { lt: 0 }, createdAt: { gte: last30Start } },
      _sum: { delta: true },
      _count: true,
    }),
    db.creditLedger.aggregate({
      where: { delta: { lt: 0 }, createdAt: { gte: prev30Start, lt: last30Start } },
      _sum: { delta: true },
      _count: true,
    }),
    db.plan.findMany({ select: { id: true, name: true, isActive: true } }),
    db.subscription.groupBy({
      by: ["planId"],
      where: { status: { in: ["ACTIVE", "TRIALING"] } },
      _count: true,
    }),
    db.user.count(),
    db.auditLog.findMany({
      take: 6,
      orderBy: { createdAt: "desc" },
      include: { actor: { select: { email: true } } },
    }),
    db.$queryRaw<{ month: Date; c: bigint }[]>`
      SELECT date_trunc('month', "createdAt") AS month, COUNT(*)::bigint AS c
      FROM "GenerationTrace"
      WHERE "createdAt" >= NOW() - INTERVAL '12 months'
      GROUP BY 1 ORDER BY 1 ASC
    `,
    db.$queryRaw<{ month: Date; revenue: number }[]>`
      SELECT date_trunc('month', s."createdAt") AS month,
             COALESCE(SUM(p."priceMonthly"), 0)::float AS revenue
      FROM "Subscription" s
      JOIN "Plan" p ON p.id = s."planId"
      WHERE s."status" IN ('ACTIVE','TRIALING')
        AND s."createdAt" >= NOW() - INTERVAL '12 months'
      GROUP BY 1 ORDER BY 1 ASC
    `,
  ]);

  // KPI: MRR
  const mrr = activeSubs.reduce((sum, s) => sum + Number(s.plan.priceMonthly), 0);

  // KPI: Active users 30d
  const activeCount = activeUsers30.length;
  const prevActiveCount = prevActiveUsers30.length;
  const activeDelta = deltaPct(activeCount, prevActiveCount);

  // KPI: Generations today vs yesterday
  const gensDelta = deltaPct(gensToday, gensYesterday);

  // KPI: Avg credit cost (avg debit per call) — interpret credits as $0.001 each (placeholder factor)
  const totalDebited30 = Math.abs(creditDebits30._sum.delta ?? 0);
  const debitCount30 = creditDebits30._count;
  const avgCost30 = debitCount30 > 0 ? totalDebited30 / debitCount30 : 0;
  const totalDebitedPrev30 = Math.abs(creditDebitsPrev30._sum.delta ?? 0);
  const debitCountPrev30 = creditDebitsPrev30._count;
  const avgCostPrev30 = debitCountPrev30 > 0 ? totalDebitedPrev30 / debitCountPrev30 : 0;
  const avgCostDelta = deltaPct(avgCost30, avgCostPrev30);

  const stats: KpiStat[] = [
    { label: "MRR", value: fmtMoney(mrr), delta: "live", up: true },
    { label: "Active users (30d)", value: fmtNumber(activeCount), delta: activeDelta.delta, up: activeDelta.up },
    { label: "Generations / day", value: fmtNumber(gensToday), delta: gensDelta.delta, up: gensDelta.up },
    { label: "Avg credit cost (30d)", value: avgCost30 > 0 ? avgCost30.toFixed(2) + " cr" : "—", delta: avgCostDelta.delta, up: !avgCostDelta.up }, // lower cost = good
  ];

  // Plan distribution
  const subsCount = subsByPlan.reduce((sum, r) => sum + r._count, 0);
  const free = totalUsers - subsCount;
  const planMap = new Map(plans.map((p) => [p.id, p.name]));
  const planRows: PlanRow[] = [
    { name: "Free", users: Math.max(0, free), pct: pct(Math.max(0, free), totalUsers) },
    ...subsByPlan
      .map((r) => ({
        name: planMap.get(r.planId) ?? "Unknown",
        users: r._count,
        pct: pct(r._count, totalUsers),
      }))
      .sort((a, b) => b.users - a.users),
  ];

  // Activity from audit log
  const activity: ActivityRow[] = auditEntries.map((e) => ({
    who: e.actor?.email ?? "system",
    what: e.action.replace(/^[a-z]+\./, "").replace(/([A-Z])/g, " $1").toLowerCase().trim(),
    t: relTime(e.createdAt),
  }));

  // Chart — last 12 months
  const monthMap = new Map<string, ChartPoint>();
  for (const row of monthlyTraces) {
    const key = row.month.toISOString().slice(0, 7);
    monthMap.set(key, { label: key, revenue: 0, generations: Number(row.c) });
  }
  for (const row of monthlySubs) {
    const key = row.month.toISOString().slice(0, 7);
    const existing = monthMap.get(key);
    if (existing) existing.revenue = row.revenue;
    else monthMap.set(key, { label: key, revenue: row.revenue, generations: 0 });
  }
  const chart = Array.from(monthMap.values()).sort((a, b) => a.label.localeCompare(b.label));

  // System health — basic env-driven; degraded/down derived from recent error rate (last 5 minutes)
  const recentErrors = await db.generationTrace.count({
    where: { createdAt: { gte: new Date(now - 5 * 60 * 1000) }, status: { not: "ok" } },
  }).catch(() => 0);
  const recentTotal = await db.generationTrace.count({
    where: { createdAt: { gte: new Date(now - 5 * 60 * 1000) } },
  }).catch(() => 0);
  const errorRate = recentTotal > 0 ? recentErrors / recentTotal : 0;
  const aiStatus: SystemHealthRow["status"] = errorRate >= 0.5 ? "Down" : errorRate >= 0.1 ? "Degraded" : "Healthy";

  const health: SystemHealthRow[] = [
    { service: "API server", status: "Healthy" },
    { service: "Database", status: "Healthy" },
    { service: "AI gateway", status: aiStatus },
  ];

  return { stats, planDist: planRows, activity, chart, health, generatedAt: new Date().toISOString() };
}
