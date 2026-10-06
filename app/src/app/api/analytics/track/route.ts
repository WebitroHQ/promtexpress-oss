import { NextResponse } from "next/server";
import { z } from "zod";
import { recordPageView, recordEvent } from "@/lib/analytics/server";

const PayloadSchema = z.discriminatedUnion("kind", [
  z.object({
    kind: z.literal("view"),
    path: z.string().min(1).max(2000),
    referrer: z.string().max(2000).nullable().optional(),
    utmSource: z.string().max(100).nullable().optional(),
    utmMedium: z.string().max(100).nullable().optional(),
    utmCampaign: z.string().max(100).nullable().optional(),
    durationMs: z.number().int().min(0).max(3_600_000).nullable().optional(),
  }),
  z.object({
    kind: z.literal("event"),
    type: z.string().min(1).max(40),
    name: z.string().min(1).max(80),
    path: z.string().max(2000).nullable().optional(),
    meta: z.record(z.string(), z.unknown()).optional(),
  }),
]);

// In-memory IP rate limit: 10 events/sec
const lastSecondByIp = new Map<string, { ts: number; count: number }>();
const RATE_WINDOW_MS = 1000;
const RATE_MAX = 10;

function checkRate(ip: string): boolean {
  const now = Date.now();
  const cur = lastSecondByIp.get(ip);
  if (!cur || now - cur.ts > RATE_WINDOW_MS) {
    lastSecondByIp.set(ip, { ts: now, count: 1 });
    return true;
  }
  if (cur.count >= RATE_MAX) return false;
  cur.count++;
  return true;
}

export async function POST(req: Request) {
  const fwd = req.headers.get("x-forwarded-for");
  const ip = fwd ? fwd.split(",")[0]!.trim() : (req.headers.get("x-real-ip") ?? "unknown");
  if (!checkRate(ip)) {
    return NextResponse.json({ error: "rate_limited" }, { status: 429 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  const parsed = PayloadSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid_payload" }, { status: 400 });
  }

  // Fire-and-forget DB write so beacon returns 204 immediately
  if (parsed.data.kind === "view") {
    void recordPageView({
      path: parsed.data.path,
      referrer: parsed.data.referrer ?? null,
      utmSource: parsed.data.utmSource ?? null,
      utmMedium: parsed.data.utmMedium ?? null,
      utmCampaign: parsed.data.utmCampaign ?? null,
      durationMs: parsed.data.durationMs ?? null,
    });
  } else {
    void recordEvent({
      type: parsed.data.type,
      name: parsed.data.name,
      path: parsed.data.path ?? null,
      meta: parsed.data.meta,
    });
  }

  return new NextResponse(null, { status: 204 });
}
