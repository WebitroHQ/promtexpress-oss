"use server";

/**
 * Public API key CRUD server actions.
 *
 * - createApiKey: returns the plain key ONCE. Per-user creation rate limit
 *   (10 keys/hour). Audit-logged. Scopes are persisted on the row so that
 *   /api/v1/* endpoints can enforce them via requireScope().
 * - revokeApiKey: idempotent soft-delete (sets revokedAt + revokedBy).
 *   Audit-logged. Existing rows in ApiCallLog keep their FK reference.
 * - rotateApiKey: atomic revoke-old + issue-new. Returns the new plain key
 *   once; the old key is revoked in the same transaction so there is never
 *   a moment when both are live or neither is.
 */
import { randomBytes } from "node:crypto";
import { auth } from "@/lib/auth";
import { db } from "@/db/client";
import { hashApiKey } from "@/server/api/bearer-auth";
import { writeAudit } from "@/lib/audit";
import { getRedis } from "@/lib/redis";

const ALLOWED_SCOPES = ["read", "generate", "admin"] as const;
type Scope = (typeof ALLOWED_SCOPES)[number];

const CREATE_RATE_LIMIT_PER_HOUR = 10;

function generatePlainKey(env: "live" | "test"): string {
  // 32 bytes → 43 base64-url chars, ample entropy
  const random = randomBytes(32).toString("base64url");
  return `pe_${env}_${random}`;
}

/**
 * Per-user creation rate limit (10 keys/hour). Redis token bucket if
 * available, else falls back to a DB count of recent ApiKey rows. Fail-open
 * is intentional and matches assertIpRateLimit's stance.
 */
async function assertCreationRateLimit(userId: string): Promise<void> {
  const hasRedisCfg = !!(process.env.REDIS_URL || process.env.REDIS_HOST);
  if (hasRedisCfg) {
    try {
      const r = getRedis();
      const key = `rl:apikey-create:${userId}`;
      const n = await r.incr(key);
      if (n === 1) await r.expire(key, 3600);
      if (n > CREATE_RATE_LIMIT_PER_HOUR) {
        throw new Error("Too many API keys created in the last hour");
      }
      return;
    } catch (err) {
      if (err instanceof Error && err.message.startsWith("Too many")) throw err;
      // Fall through to DB count
    }
  }
  const since = new Date(Date.now() - 3_600_000);
  const count = await db.apiKey.count({
    where: { userId, createdAt: { gte: since } },
  });
  if (count >= CREATE_RATE_LIMIT_PER_HOUR) {
    throw new Error("Too many API keys created in the last hour");
  }
}

export interface CreateApiKeyResult {
  id: string;
  name: string;
  plainKey: string;
  prefix: string;
}

export async function createApiKey(input: {
  name: string;
  scopes: Scope[];
  expiresInDays?: number;
}): Promise<CreateApiKeyResult> {
  const session = await auth();
  if (!session?.user) throw new Error("Unauthorized");

  const name = input.name.trim();
  if (name.length === 0 || name.length > 60) {
    throw new Error("Key name must be 1–60 characters");
  }
  for (const s of input.scopes) {
    if (!ALLOWED_SCOPES.includes(s)) throw new Error(`Invalid scope: ${s}`);
  }
  if (input.scopes.length === 0) {
    throw new Error("At least one scope is required");
  }

  await assertCreationRateLimit(session.user.id);

  const env: "live" | "test" = process.env.NODE_ENV === "production" ? "live" : "test";
  const plainKey = generatePlainKey(env);
  const keyHash = hashApiKey(plainKey);
  const keyPrefix = plainKey.slice(0, 12);

  const expiresAt = input.expiresInDays
    ? new Date(Date.now() + input.expiresInDays * 86400_000)
    : null;

  const row = await db.apiKey.create({
    data: {
      userId: session.user.id,
      name,
      keyHash,
      keyPrefix,
      scopes: input.scopes,
      expiresAt,
      isActive: true,
    },
  });

  await writeAudit({
    actorId: session.user.id,
    action: "apiKey.created",
    targetType: "ApiKey",
    targetId: row.id,
    meta: { name, scopes: input.scopes, expiresAt: expiresAt?.toISOString() ?? null, prefix: keyPrefix },
  });

  return { id: row.id, name: row.name, plainKey, prefix: keyPrefix };
}

/**
 * Soft-delete: sets revokedAt + revokedBy and flips isActive. Idempotent —
 * a second revoke for the same id is a silent no-op (already-revoked rows
 * are filtered by the `revokedAt: null` clause).
 */
export async function revokeApiKey(id: string): Promise<void> {
  const session = await auth();
  if (!session?.user) throw new Error("Unauthorized");

  const result = await db.apiKey.updateMany({
    where: { id, userId: session.user.id, revokedAt: null },
    data: {
      revokedAt: new Date(),
      revokedBy: session.user.id,
      isActive: false,
    },
  });

  if (result.count > 0) {
    await writeAudit({
      actorId: session.user.id,
      action: "apiKey.revoked",
      targetType: "ApiKey",
      targetId: id,
    });
  }
}

/**
 * Atomic rotate: revoke the existing key and issue a fresh one carrying the
 * same name/scopes/expiry/rateLimit. The new plain key is returned exactly
 * once. The old key is revoked inside the same DB transaction so there is
 * never a window where both are live.
 */
export async function rotateApiKey(id: string): Promise<CreateApiKeyResult> {
  const session = await auth();
  if (!session?.user) throw new Error("Unauthorized");

  const env: "live" | "test" = process.env.NODE_ENV === "production" ? "live" : "test";
  const plainKey = generatePlainKey(env);
  const keyHash = hashApiKey(plainKey);
  const keyPrefix = plainKey.slice(0, 12);

  const newRow = await db.$transaction(async (tx) => {
    const old = await tx.apiKey.findFirst({
      where: { id, userId: session.user.id, revokedAt: null },
    });
    if (!old) throw new Error("API key not found");

    await tx.apiKey.update({
      where: { id: old.id },
      data: {
        revokedAt: new Date(),
        revokedBy: session.user.id,
        isActive: false,
      },
    });

    return tx.apiKey.create({
      data: {
        userId: session.user.id,
        name: old.name,
        scopes: old.scopes,
        keyHash,
        keyPrefix,
        expiresAt: old.expiresAt,
        rateLimit: old.rateLimit,
        isActive: true,
      },
    });
  });

  await writeAudit({
    actorId: session.user.id,
    action: "apiKey.rotated",
    targetType: "ApiKey",
    targetId: newRow.id,
    meta: { rotatedFrom: id, prefix: keyPrefix },
  });

  return { id: newRow.id, name: newRow.name, plainKey, prefix: keyPrefix };
}
