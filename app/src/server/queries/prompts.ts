import { db } from "@/db/client";

/** Relative-time formatter; days/hours/minutes ago. */
function relativeTime(date: Date): string {
  const diffMs = Date.now() - date.getTime();
  const min = Math.floor(diffMs / 60000);
  if (min < 1) return "just now";
  if (min < 60) return `${min}m ago`;
  const h = Math.floor(min / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d === 1) return "yesterday";
  if (d < 7) return `${d} days ago`;
  return date.toLocaleDateString();
}

export interface RecentPrompt {
  id: string;
  mod: string;
  title: string;
  userInput: string;
  date: string;
  cost: number;
  result: string | null;
}

/** Most recent prompts for a user, formatted for the dashboard widget. */
export async function getRecentPrompts(userId: string, limit = 5): Promise<RecentPrompt[]> {
  const rows = await db.prompt.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    take: limit,
    select: {
      id: true,
      title: true,
      userInput: true,
      modality: true,
      creditsUsed: true,
      createdAt: true,
      result: true,
    },
  });

  return rows.map((p) => ({
    id: p.id,
    mod: p.modality,
    title: p.title ?? p.userInput.slice(0, 80),
    userInput: p.userInput,
    date: relativeTime(p.createdAt),
    cost: p.creditsUsed,
    result: p.result,
  }));
}

export interface MonthlyPromptStats {
  thisMonth: number;
  lastMonth: number;
  trend: number;
  topModality: string;
  topModalityPct: number;
}

/** Monthly prompt stats for dashboard KPI cards. */
export async function getMonthlyPromptStats(userId: string): Promise<MonthlyPromptStats> {
  const now = new Date();
  const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);

  const [thisMonth, lastMonth, modalityGroups] = await Promise.all([
    db.prompt.count({ where: { userId, createdAt: { gte: thisMonthStart } } }),
    db.prompt.count({ where: { userId, createdAt: { gte: lastMonthStart, lt: thisMonthStart } } }),
    db.prompt.groupBy({
      by: ["modality"],
      where: { userId, createdAt: { gte: thisMonthStart } },
      _count: { _all: true },
      orderBy: { _count: { modality: "desc" } },
      take: 1,
    }),
  ]);

  const topGroup = modalityGroups[0];
  const topModality = topGroup
    ? topGroup.modality.charAt(0).toUpperCase() + topGroup.modality.slice(1)
    : "Text";
  const topModalityPct =
    thisMonth > 0 && topGroup ? Math.round((topGroup._count._all / thisMonth) * 100) : 0;

  return { thisMonth, lastMonth, trend: thisMonth - lastMonth, topModality, topModalityPct };
}

/** Paginated history rows for the History page. */
export interface HistoryRow {
  id: string;
  title: string;
  modality: string;
  credits: number;
  date: string;
  status: "Done" | "Failed";
  userInput: string;
  result: string | null;
}

export async function getPromptHistory(
  userId: string,
  opts: { page?: number; pageSize?: number; modality?: string; search?: string } = {},
): Promise<{ rows: HistoryRow[]; total: number }> {
  const { page = 0, pageSize = 10, modality, search } = opts;

  const where = {
    userId,
    ...(modality && modality !== "All" ? { modality: modality.toLowerCase() } : {}),
    ...(search
      ? {
          OR: [
            { title: { contains: search, mode: "insensitive" as const } },
            { userInput: { contains: search, mode: "insensitive" as const } },
          ],
        }
      : {}),
  };

  const [rows, total] = await Promise.all([
    db.prompt.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: page * pageSize,
      take: pageSize,
      select: {
        id: true,
        title: true,
        userInput: true,
        modality: true,
        creditsUsed: true,
        result: true,
        createdAt: true,
      },
    }),
    db.prompt.count({ where }),
  ]);

  return {
    total,
    rows: rows.map((p) => ({
      id: p.id,
      title: p.title ?? p.userInput.slice(0, 100),
      modality: p.modality.charAt(0).toUpperCase() + p.modality.slice(1),
      credits: p.creditsUsed,
      date: p.createdAt.toLocaleString(),
      status: (p.result != null && p.result.length > 0 ? "Done" : "Failed") as HistoryRow["status"],
      userInput: p.userInput,
      result: p.result,
    })),
  };
}

/** Favorited prompts for the Favorites page. */
export async function getFavoritePrompts(userId: string) {
  const rows = await db.prompt.findMany({
    where: { userId, isFavorited: true },
    orderBy: { updatedAt: "desc" },
    select: {
      id: true,
      title: true,
      userInput: true,
      modality: true,
      updatedAt: true,
    },
  });

  return rows.map((p) => ({
    id: p.id,
    title: p.title ?? p.userInput.slice(0, 80),
    modality: p.modality.charAt(0).toUpperCase() + p.modality.slice(1),
    note: p.userInput.slice(0, 140),
    userInput: p.userInput,
    date: `Saved ${p.updatedAt.toLocaleDateString(undefined, { month: "short", day: "numeric" })}`,
  }));
}
