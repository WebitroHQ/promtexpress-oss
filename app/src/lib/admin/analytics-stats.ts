import { db } from "@/db/client";

export interface AnalyticsKpi {
  label: string;
  value: string;
  delta: string;
  up: boolean;
}

export interface FunnelStep {
  step: string;
  count: number;
  pct: number;
}

export interface CountryRow {
  country: string;
  pct: number;
  count: number;
}

export interface AnalyticsData {
  stats: AnalyticsKpi[];
  funnel: FunnelStep[];
  countries: CountryRow[];
  approximate: boolean;
  windowDays: number;
}

const MS_DAY = 86400000;

function fmtN(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1000) return `${(n / 1000).toFixed(1)}K`;
  return n.toString();
}

function pctFmt(part: number, whole: number, digits = 1): number {
  if (whole <= 0) return 0;
  const v = (part / whole) * 100;
  return Math.round(v * 10 ** digits) / 10 ** digits;
}

function deltaPp(now: number, prev: number): { delta: string; up: boolean } {
  const diff = now - prev;
  const sign = diff >= 0 ? "+" : "";
  return { delta: `${sign}${diff.toFixed(1)}pp`, up: diff >= 0 };
}

function deltaPct(now: number, prev: number): { delta: string; up: boolean } {
  if (prev === 0 && now === 0) return { delta: "0%", up: true };
  if (prev === 0) return { delta: "+new", up: true };
  const change = ((now - prev) / prev) * 100;
  const sign = change >= 0 ? "+" : "";
  return { delta: `${sign}${change.toFixed(1)}%`, up: change >= 0 };
}

const COUNTRY_NAME: Record<string, string> = {
  US: "United States", TR: "Türkiye", GB: "United Kingdom", DE: "Germany",
  FR: "France", ES: "Spain", IT: "Italy", BR: "Brazil", IN: "India",
  JP: "Japan", CN: "China", RU: "Russia", NL: "Netherlands", PL: "Poland",
};

function localeToCountry(locale: string): string {
  const u = locale.toUpperCase();
  if (COUNTRY_NAME[u]) return COUNTRY_NAME[u]!;
  const map: Record<string, string> = {
    EN: "United States", TR: "Türkiye", DE: "Germany", FR: "France",
    ES: "Spain", IT: "Italy", PT: "Brazil", JA: "Japan", ZH: "China",
    RU: "Russia", AR: "Other", HE: "Other",
  };
  return map[u] ?? "Other";
}

export async function getAnalyticsData(windowDays = 30): Promise<AnalyticsData> {
  const now = Date.now();
  const winStart = new Date(now - windowDays * MS_DAY);
  const prevStart = new Date(now - 2 * windowDays * MS_DAY);

  const [
    visitorsThis,
    visitorsPrev,
    newUsers,
    newUsersPrev,
    firstGenUsers,
    paidNew,
    paidNewPrev,
    canceledThis,
    activeAtStart,
    locales,
    eventsByName,
  ] = await Promise.all([
    // Real visitors via PageView (distinct sessionId)
    db.pageView.findMany({
      where: { createdAt: { gte: winStart }, sessionId: { not: null } },
      distinct: ["sessionId"],
      select: { sessionId: true },
    }),
    db.pageView.findMany({
      where: { createdAt: { gte: prevStart, lt: winStart }, sessionId: { not: null } },
      distinct: ["sessionId"],
      select: { sessionId: true },
    }),
    db.user.count({ where: { createdAt: { gte: winStart } } }),
    db.user.count({ where: { createdAt: { gte: prevStart, lt: winStart } } }),
    db.generationTrace.findMany({
      where: { createdAt: { gte: winStart } },
      distinct: ["userId"],
      select: { userId: true },
    }),
    db.subscription.count({
      where: {
        createdAt: { gte: winStart },
        status: "ACTIVE",
        plan: { priceMonthly: { gt: 0 } },
      },
    }),
    db.subscription.count({
      where: {
        createdAt: { gte: prevStart, lt: winStart },
        status: "ACTIVE",
        plan: { priceMonthly: { gt: 0 } },
      },
    }),
    db.subscription.count({
      where: { updatedAt: { gte: winStart }, status: "CANCELED" },
    }),
    db.subscription.count({
      where: { createdAt: { lt: winStart }, status: { in: ["ACTIVE", "TRIALING"] } },
    }),
    db.user.groupBy({
      by: ["locale"],
      _count: true,
      orderBy: { _count: { locale: "desc" } },
      take: 12,
    }),
    db.analyticsEvent.groupBy({
      by: ["name"],
      where: { createdAt: { gte: winStart } },
      _count: true,
    }),
  ]);

  const visitors = visitorsThis.length;
  const visitorsPrevCount = visitorsPrev.length;
  const visitorsDelta = deltaPct(visitors, visitorsPrevCount);

  // Sign-up rate: new users / visitors
  const signupRate = pctFmt(newUsers, Math.max(visitors, newUsers || 1));
  const signupRatePrev = pctFmt(newUsersPrev, Math.max(visitorsPrevCount, newUsersPrev || 1));
  const signupDelta = deltaPp(signupRate, signupRatePrev);

  // Trial → paid
  const trialPaid = newUsers > 0 ? pctFmt(paidNew, newUsers) : 0;
  const trialPaidPrev = newUsersPrev > 0 ? pctFmt(paidNewPrev, newUsersPrev) : 0;
  const trialDelta = deltaPp(trialPaid, trialPaidPrev);

  // Churn
  const churn = activeAtStart > 0 ? pctFmt(canceledThis, activeAtStart) : 0;
  const churnDelta = { delta: "live", up: churn < 5 };

  const stats: AnalyticsKpi[] = [
    { label: "Visitors", value: fmtN(visitors), delta: visitorsDelta.delta, up: visitorsDelta.up },
    { label: "Sign-up rate", value: `${signupRate}%`, delta: signupDelta.delta, up: signupDelta.up },
    { label: "Trial → paid", value: `${trialPaid}%`, delta: trialDelta.delta, up: trialDelta.up },
    { label: "Churn (30d)", value: `${churn}%`, delta: churnDelta.delta, up: churnDelta.up },
  ];

  // Real funnel from analytics events + user data
  const eventCount = (name: string) => eventsByName.find((e) => e.name === name)?._count ?? 0;
  const tryClickReal = eventCount("cta.try-free");
  const accountCreated = newUsers;
  const firstGen = firstGenUsers.length;
  const paid = paidNew;

  const funnel: FunnelStep[] = [
    { step: "Visit landing", count: visitors, pct: 100 },
    { step: "Click 'Try free'", count: tryClickReal, pct: pctFmt(tryClickReal, visitors) },
    { step: "Created account", count: accountCreated, pct: pctFmt(accountCreated, visitors) },
    { step: "First generation", count: firstGen, pct: pctFmt(firstGen, visitors) },
    { step: "Paid upgrade", count: paid, pct: pctFmt(paid, visitors) },
  ];

  // Countries from User.locale
  const totalLocales = locales.reduce((s, l) => s + l._count, 0);
  const counts = new Map<string, number>();
  for (const l of locales) {
    const country = localeToCountry(l.locale);
    counts.set(country, (counts.get(country) ?? 0) + l._count);
  }
  const countries: CountryRow[] = Array.from(counts.entries())
    .map(([country, count]) => ({ country, count, pct: pctFmt(count, totalLocales, 0) }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 8);

  // approximate=false: PageView gerçek visitor verisi sağlıyor.
  // Tek "approximate" kalan: tryClickReal sadece cta.try-free butonu mount edilmişse gerçek; mount yoksa 0.
  return { stats, funnel, countries, approximate: false, windowDays };
}
