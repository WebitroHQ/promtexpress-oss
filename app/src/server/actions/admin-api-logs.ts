"use server";

import { z } from "zod";
import { db } from "@/db/client";
import { requireAdmin } from "@/lib/audit";

const FetchSchema = z.object({
  cursor: z.string().nullable().optional(),
  status: z.enum(["all", "2xx", "3xx", "4xx", "5xx"]).default("all"),
  path: z.string().trim().max(200).optional().nullable(),
  user: z.string().trim().max(100).optional().nullable(),
  limit: z.number().int().min(1).max(200).default(100),
});

export type ApiLogRow = {
  id: string;
  method: string;
  path: string;
  status: number;
  latencyMs: number;
  userEmail: string | null;
  apiKeyName: string | null;
  apiKeyPrefix: string | null;
  ip: string | null;
  createdAt: string;
};

function statusFilter(status: string) {
  switch (status) {
    case "2xx": return { status: { gte: 200, lt: 300 } };
    case "3xx": return { status: { gte: 300, lt: 400 } };
    case "4xx": return { status: { gte: 400, lt: 500 } };
    case "5xx": return { status: { gte: 500 } };
    default: return {};
  }
}

export async function fetchApiLogs(input: z.input<typeof FetchSchema>): Promise<{
  rows: ApiLogRow[];
  nextCursor: string | null;
  total24h: number;
  errors24h: number;
  hourlyBuckets: { hour: string; count: number; errors: number }[];
}> {
  await requireAdmin();
  const parsed = FetchSchema.parse(input);

  const where = {
    ...statusFilter(parsed.status),
    ...(parsed.path ? { path: { contains: parsed.path } } : {}),
    ...(parsed.user
      ? {
          OR: [
            { user: { email: { contains: parsed.user, mode: "insensitive" as const } } },
            { apiKey: { keyPrefix: { contains: parsed.user } } },
          ],
        }
      : {}),
  };

  const [rows, total24h, errors24h, hourly] = await Promise.all([
    db.apiCallLog.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: parsed.limit + 1,
      ...(parsed.cursor ? { cursor: { id: parsed.cursor }, skip: 1 } : {}),
      include: {
        user: { select: { email: true } },
        apiKey: { select: { name: true, keyPrefix: true } },
      },
    }),
    db.apiCallLog.count({ where: { createdAt: { gte: new Date(Date.now() - 86400000) } } }),
    db.apiCallLog.count({
      where: {
        createdAt: { gte: new Date(Date.now() - 86400000) },
        status: { gte: 400 },
      },
    }),
    db.$queryRaw<{ hour: Date; count: bigint; errors: bigint }[]>`
      SELECT date_trunc('hour', "createdAt") AS hour,
             COUNT(*)::bigint AS count,
             SUM(CASE WHEN "status" >= 400 THEN 1 ELSE 0 END)::bigint AS errors
      FROM "ApiCallLog"
      WHERE "createdAt" >= NOW() - INTERVAL '24 hours'
      GROUP BY 1
      ORDER BY 1 ASC
    `,
  ]);

  const hasMore = rows.length > parsed.limit;
  const items = hasMore ? rows.slice(0, parsed.limit) : rows;
  const nextCursor = hasMore ? items[items.length - 1]!.id : null;

  return {
    rows: items.map((r) => ({
      id: r.id,
      method: r.method,
      path: r.path,
      status: r.status,
      latencyMs: r.latencyMs,
      userEmail: r.user?.email ?? null,
      apiKeyName: r.apiKey?.name ?? null,
      apiKeyPrefix: r.apiKey?.keyPrefix ?? null,
      ip: r.ip,
      createdAt: r.createdAt.toISOString(),
    })),
    nextCursor,
    total24h,
    errors24h,
    hourlyBuckets: hourly.map((h) => ({
      hour: h.hour.toISOString(),
      count: Number(h.count),
      errors: Number(h.errors),
    })),
  };
}
