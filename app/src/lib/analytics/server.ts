"use server";

import { headers, cookies } from "next/headers";
import { db } from "@/db/client";
import { auth } from "@/lib/auth";

const BOT_RE = /(bot|crawler|spider|preview|fetch|curl|wget|httrack|slurp|monitor|uptime|googleother|headlesschrome)/i;
const SESSION_COOKIE = "pe_sid";

export interface RecordPageViewInput {
  path: string;
  referrer?: string | null;
  utmSource?: string | null;
  utmMedium?: string | null;
  utmCampaign?: string | null;
  durationMs?: number | null;
}

export interface RecordEventInput {
  type: string;
  name: string;
  path?: string | null;
  meta?: Record<string, unknown>;
}

async function ctx(): Promise<{ ip: string | null; ua: string | null; sessionId: string | null; userId: string | null; isBot: boolean }> {
  const h = await headers();
  const fwd = h.get("x-forwarded-for");
  const ip = fwd ? fwd.split(",")[0]!.trim() : (h.get("x-real-ip") ?? null);
  const ua = h.get("user-agent") ?? null;
  const isBot = ua ? BOT_RE.test(ua) : false;

  const c = await cookies();
  const sessionId = c.get(SESSION_COOKIE)?.value ?? null;

  let userId: string | null = null;
  try {
    const session = await auth();
    userId = session?.user?.id ?? null;
  } catch {
    userId = null;
  }

  return { ip, ua, sessionId, userId, isBot };
}

export async function recordPageView(input: RecordPageViewInput): Promise<void> {
  try {
    const { ip, ua, sessionId, userId, isBot } = await ctx();
    if (isBot) return;

    await db.pageView.create({
      data: {
        sessionId,
        userId,
        path: input.path,
        referrer: input.referrer ?? null,
        utmSource: input.utmSource ?? null,
        utmMedium: input.utmMedium ?? null,
        utmCampaign: input.utmCampaign ?? null,
        durationMs: input.durationMs ?? null,
        ip,
        ua,
      },
    });
  } catch (err) {
    console.error("[analytics] recordPageView failed:", err);
  }
}

export async function recordEvent(input: RecordEventInput): Promise<void> {
  try {
    const { sessionId, userId, isBot } = await ctx();
    if (isBot) return;

    await db.analyticsEvent.create({
      data: {
        sessionId,
        userId,
        type: input.type,
        name: input.name,
        path: input.path ?? null,
        meta: (input.meta as never) ?? undefined,
      },
    });
  } catch (err) {
    console.error("[analytics] recordEvent failed:", err);
  }
}
