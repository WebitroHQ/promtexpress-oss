import { db } from "@/db/client";

export interface PopularTarget {
  id: string;
  slug: string;
  name: string;
  provider: string | null;
  modality: string;
  sortOrder: number;
  iconUrl: string | null;
}

/**
 * Returns the most-used active TargetEngines for a given modality, based on
 * Prompt.targetEngineId counts in the last `days` window.
 */
export async function getPopularTargets(
  modality: string,
  days = 7,
  limit = 6,
): Promise<PopularTarget[]> {
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

  const rows = await db.prompt.groupBy({
    by: ["targetEngineId"],
    where: {
      createdAt: { gte: since },
      targetEngineId: { not: null },
    },
    _count: { _all: true },
    orderBy: { _count: { targetEngineId: "desc" } },
    take: limit * 4, // some hits may be inactive or in another modality
  });

  const ids = rows
    .map((r) => r.targetEngineId)
    .filter((x): x is string => Boolean(x));

  if (ids.length === 0) return [];

  const targets = await db.targetEngine.findMany({
    where: { id: { in: ids }, isActive: true, modality },
    select: {
      id: true,
      slug: true,
      name: true,
      provider: true,
      modality: true,
      sortOrder: true,
      iconUrl: true,
    },
  });

  // Preserve descending usage order.
  const order = new Map(rows.map((r, i) => [r.targetEngineId, i]));
  return targets
    .sort((a, b) => (order.get(a.id) ?? 999) - (order.get(b.id) ?? 999))
    .slice(0, limit);
}
