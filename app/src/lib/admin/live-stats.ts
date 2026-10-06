/**
 * Numbers for the admin "Live" page: visitors, sign-ups, generations, library growth and
 * bring-your-own-key adoption. Day boundaries follow Europe/Istanbul.
 *
 * A visitor is a distinct browser session (PageView.sessionId, falling back to IP).
 */
import { Prisma } from "@prisma/client";
import { db } from "@/db/client";

const TZ = "Europe/Istanbul";

export interface PeriodCounts {
  today: number;
  yesterday: number;
  last7: number;
  last30: number;
  prev30: number;
  total: number;
}

export interface DailyPoint {
  day: string; // YYYY-MM-DD
  visitors: number;
  pageViews: number;
  signups: number;
  prompts: number;
  libraryAdded: number;
}

export interface LiveStats {
  generatedAt: string;
  onlineNow: number;
  visitors: PeriodCounts;
  pageViews: PeriodCounts;
  signups: PeriodCounts;
  prompts: PeriodCounts;
  library: PeriodCounts & {
    byStatus: { status: string; count: number }[];
    byModality: { modality: string; count: number }[];
  };
  aiKeys: {
    usersWithKey: number;
    totalUsers: number;
    byProvider: { provider: string; count: number }[];
  };
  daily: DailyPoint[];
  topPagesToday: { path: string; views: number }[];
  topReferrers30: { referrer: string; visitors: number }[];
  recentSignups: { email: string; at: string }[];
}

type CountRow = { today: bigint; yesterday: bigint; last7: bigint; last30: bigint; prev30: bigint; total: bigint };

const num = (value: bigint | number | null | undefined): number => Number(value ?? 0);

/** Counts `expr` (e.g. `count(*)`) per period for one table's timestamp column. */
async function periodCounts(table: string, expr: string, column = "createdAt"): Promise<PeriodCounts> {
  const col = Prisma.raw(`"${column}"`);
  // Columns are `timestamp` holding UTC. `now_utc` and `today` are naive UTC too, so the comparison
  // never depends on the database session's time zone.
  const rows = await db.$queryRaw<CountRow[]>(Prisma.sql`
    WITH b AS (
      SELECT
        (now() AT TIME ZONE 'UTC') AS now_utc,
        ((date_trunc('day', now() AT TIME ZONE ${TZ}) AT TIME ZONE ${TZ}) AT TIME ZONE 'UTC') AS today
    )
    SELECT
      ${Prisma.raw(expr)} FILTER (WHERE ${col} >= b.today) AS today,
      ${Prisma.raw(expr)} FILTER (WHERE ${col} >= b.today - interval '1 day' AND ${col} < b.today) AS yesterday,
      ${Prisma.raw(expr)} FILTER (WHERE ${col} >= b.now_utc - interval '7 days') AS last7,
      ${Prisma.raw(expr)} FILTER (WHERE ${col} >= b.now_utc - interval '30 days') AS last30,
      ${Prisma.raw(expr)} FILTER (WHERE ${col} >= b.now_utc - interval '60 days' AND ${col} < b.now_utc - interval '30 days') AS prev30,
      ${Prisma.raw(expr)} AS total
    FROM ${Prisma.raw(`"${table}"`)}, b
  `);
  const r = rows[0];
  return {
    today: num(r?.today),
    yesterday: num(r?.yesterday),
    last7: num(r?.last7),
    last30: num(r?.last30),
    prev30: num(r?.prev30),
    total: num(r?.total),
  };
}

const VISITOR = `count(DISTINCT coalesce("sessionId", "ip"))`;

export async function getLiveStats(): Promise<LiveStats> {
  const [
    visitors,
    pageViews,
    signups,
    prompts,
    library,
    online,
    byStatus,
    byModality,
    keyUsers,
    byProvider,
    daily,
    topPages,
    topReferrers,
    recentSignups,
  ] = await Promise.all([
    periodCounts("PageView", VISITOR),
    periodCounts("PageView", "count(*)"),
    periodCounts("User", "count(*)"),
    periodCounts("Prompt", "count(*)"),
    periodCounts("PromptExemplar", "count(*)"),
    db.$queryRaw<{ n: bigint }[]>(Prisma.sql`
      SELECT ${Prisma.raw(VISITOR)} AS n FROM "PageView" WHERE "createdAt" >= (now() AT TIME ZONE 'UTC') - interval '5 minutes'`),
    db.promptExemplar.groupBy({ by: ["status"], _count: { _all: true } }),
    db.promptExemplar.groupBy({ by: ["modality"], _count: { _all: true }, orderBy: { _count: { modality: "desc" } } }),
    db.userAiKey.findMany({ where: { isActive: true }, select: { userId: true }, distinct: ["userId"] }),
    db.userAiKey.groupBy({ by: ["provider"], where: { isActive: true }, _count: { _all: true } }),
    db.$queryRaw<{ day: string; visitors: bigint; page_views: bigint; signups: bigint; prompts: bigint; library_added: bigint }[]>(Prisma.sql`
      WITH days AS (
        SELECT generate_series(
          date_trunc('day', now() AT TIME ZONE ${TZ}) - interval '29 days',
          date_trunc('day', now() AT TIME ZONE ${TZ}),
          interval '1 day'
        ) AS d
      ),
      lim AS (SELECT ((min(d) AT TIME ZONE ${TZ}) AT TIME ZONE 'UTC') AS since FROM days),
      pv AS (
        SELECT date_trunc('day', (p."createdAt" AT TIME ZONE 'UTC') AT TIME ZONE ${TZ}) AS d,
               ${Prisma.raw(VISITOR)} AS visitors, count(*) AS page_views
        FROM "PageView" p, lim WHERE p."createdAt" >= lim.since GROUP BY 1
      ),
      su AS (
        SELECT date_trunc('day', (u."createdAt" AT TIME ZONE 'UTC') AT TIME ZONE ${TZ}) AS d, count(*) AS n
        FROM "User" u, lim WHERE u."createdAt" >= lim.since GROUP BY 1
      ),
      pr AS (
        SELECT date_trunc('day', (x."createdAt" AT TIME ZONE 'UTC') AT TIME ZONE ${TZ}) AS d, count(*) AS n
        FROM "Prompt" x, lim WHERE x."createdAt" >= lim.since GROUP BY 1
      ),
      lib AS (
        SELECT date_trunc('day', (e."createdAt" AT TIME ZONE 'UTC') AT TIME ZONE ${TZ}) AS d, count(*) AS n
        FROM "PromptExemplar" e, lim WHERE e."createdAt" >= lim.since GROUP BY 1
      )
      SELECT
        to_char(days.d, 'YYYY-MM-DD') AS day,
        coalesce(pv.visitors, 0) AS visitors,
        coalesce(pv.page_views, 0) AS page_views,
        coalesce(su.n, 0) AS signups,
        coalesce(pr.n, 0) AS prompts,
        coalesce(lib.n, 0) AS library_added
      FROM days
      LEFT JOIN pv ON pv.d = days.d
      LEFT JOIN su ON su.d = days.d
      LEFT JOIN pr ON pr.d = days.d
      LEFT JOIN lib ON lib.d = days.d
      ORDER BY days.d
    `),
    db.$queryRaw<{ path: string; views: bigint }[]>(Prisma.sql`
      SELECT "path", count(*) AS views FROM "PageView"
      WHERE "createdAt" >= ((date_trunc('day', now() AT TIME ZONE ${TZ}) AT TIME ZONE ${TZ}) AT TIME ZONE 'UTC')
      GROUP BY "path" ORDER BY views DESC LIMIT 8`),
    db.$queryRaw<{ referrer: string; visitors: bigint }[]>(Prisma.sql`
      SELECT "referrer", ${Prisma.raw(VISITOR)} AS visitors FROM "PageView"
      WHERE "createdAt" >= (now() AT TIME ZONE 'UTC') - interval '30 days' AND "referrer" IS NOT NULL AND "referrer" <> ''
      GROUP BY "referrer" ORDER BY visitors DESC LIMIT 8`),
    db.user.findMany({ orderBy: { createdAt: "desc" }, take: 6, select: { email: true, createdAt: true } }),
  ]);

  return {
    generatedAt: new Date().toISOString(),
    onlineNow: num(online[0]?.n),
    visitors,
    pageViews,
    signups,
    prompts,
    library: {
      ...library,
      byStatus: byStatus.map((r) => ({ status: r.status, count: r._count._all })),
      byModality: byModality.map((r) => ({ modality: r.modality, count: r._count._all })),
    },
    aiKeys: {
      usersWithKey: keyUsers.length,
      totalUsers: signups.total,
      byProvider: byProvider.map((r) => ({ provider: r.provider, count: r._count._all })),
    },
    daily: daily.map((r) => ({
      day: r.day,
      visitors: num(r.visitors),
      pageViews: num(r.page_views),
      signups: num(r.signups),
      prompts: num(r.prompts),
      libraryAdded: num(r.library_added),
    })),
    topPagesToday: topPages.map((r) => ({ path: r.path, views: num(r.views) })),
    topReferrers30: topReferrers.map((r) => ({ referrer: r.referrer, visitors: num(r.visitors) })),
    recentSignups: recentSignups.map((u) => ({ email: u.email, at: u.createdAt.toISOString() })),
  };
}
