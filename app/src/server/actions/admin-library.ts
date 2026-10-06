"use server";

import { db } from "@/db/client";
import { requireAdmin, writeAudit } from "@/lib/audit";
import { embedText, saveEmbedding } from "@/lib/library/embedding";
import { detectLanguage } from "@/lib/library/lang-detect";
import { maybeTranslate } from "@/lib/library/translate";
import { revalidatePath } from "next/cache";

export async function updateExemplar(
  id: string,
  data: {
    title?: string;
    prompt?: string;
    expectedOutput?: string;
    modality?: string;
    subCategory?: string;
    intentTags?: string[];
    targetEngineId?: string | null;
    qualityScore?: number | null;
    notes?: string;
  },
): Promise<void> {
  const admin = await requireAdmin();
  await db.promptExemplar.update({
    where: { id },
    data: {
      ...(data.title !== undefined && { title: data.title || null }),
      ...(data.prompt !== undefined && { prompt: data.prompt, contentLength: data.prompt.length }),
      ...(data.expectedOutput !== undefined && { expectedOutput: data.expectedOutput || null }),
      ...(data.modality !== undefined && { modality: data.modality }),
      ...(data.subCategory !== undefined && { subCategory: data.subCategory || null }),
      ...(data.intentTags !== undefined && { intentTags: data.intentTags }),
      ...(data.targetEngineId !== undefined && { targetEngineId: data.targetEngineId || null }),
      ...(data.qualityScore !== undefined && { qualityScore: data.qualityScore }),
      ...(data.notes !== undefined && { notes: data.notes || null }),
    },
  });
  await writeAudit({ actorId: admin.id, action: "exemplar.update", targetType: "promptExemplar", targetId: id });
  revalidatePath(`/pr/yonet/library/${id}`);
  revalidatePath("/pr/yonet/library");
}

export async function updateExemplarStatus(
  id: string,
  status: "REVIEW" | "VERIFIED" | "GOLD" | "ARCHIVED" | "REJECTED",
): Promise<void> {
  const admin = await requireAdmin();
  await db.promptExemplar.update({ where: { id }, data: { status } });
  await writeAudit({ actorId: admin.id, action: "exemplar.setStatus", targetType: "promptExemplar", targetId: id, meta: { status } });
  revalidatePath(`/pr/yonet/library/${id}`);
  revalidatePath("/pr/yonet/library");
}

export async function embedExemplar(id: string): Promise<{ success: boolean; error?: string }> {
  const admin = await requireAdmin();
  const exemplar = await db.promptExemplar.findUnique({ where: { id }, select: { prompt: true } });
  if (!exemplar) return { success: false, error: "Not found" };

  const result = await embedText(exemplar.prompt);
  if (!result) return { success: false, error: "No active embedding engine or missing API key" };

  await saveEmbedding(id, result);
  await writeAudit({ actorId: admin.id, action: "exemplar.embed", targetType: "promptExemplar", targetId: id });
  revalidatePath(`/pr/yonet/library/${id}`);
  return { success: true };
}

export async function deleteExemplar(id: string): Promise<void> {
  const admin = await requireAdmin();
  await db.promptExemplar.delete({ where: { id } });
  await writeAudit({ actorId: admin.id, action: "exemplar.delete", targetType: "promptExemplar", targetId: id });
  revalidatePath("/pr/yonet/library");
}

export async function translateExemplar(
  id: string,
): Promise<{ success: boolean; error?: string; translated?: boolean }> {
  const admin = await requireAdmin();
  const exemplar = await db.promptExemplar.findUnique({
    where: { id },
    select: { prompt: true },
  });
  if (!exemplar) return { success: false, error: "Not found" };

  const result = await maybeTranslate(exemplar.prompt);
  if (result.skipped) return { success: false, error: result.reason ?? "Translation skipped" };
  if (!result.changed) return { success: true, translated: false };

  await db.promptExemplar.update({
    where: { id },
    data: { prompt: result.result, contentLength: result.result.length },
  });
  await writeAudit({ actorId: admin.id, action: "exemplar.translate", targetType: "promptExemplar", targetId: id });
  revalidatePath(`/pr/yonet/library/${id}`);
  return { success: true, translated: true };
}

// ──────────────────────────────────────────────────────
// Bulk embedding: long-running worker with stop control
// ──────────────────────────────────────────────────────
//
// Mirrors the bulk-translation worker pattern. Two AppSetting keys:
//   embedding_status — "idle" | "running"
//   embedding_stats  — JSON progress
//
// startBulkEmbed
//   1. Refuses if already running (single worker).
//   2. Loads every row where embeddedAt IS NULL.
//   3. If list is empty → returns { success: false, error: "no_unembedded" }
//      so the UI can surface a clear "everything is already embedded" notice.
//   4. Iterates one by one, embedText() → saveEmbedding(). Each iteration
//      re-reads embedding_status; if flipped to "idle" by stopBulkEmbed,
//      the loop exits cleanly.
//   5. try/finally guarantees status returns to "idle" even on crash.
//
// stopBulkEmbed flips status → "idle"; the running loop bails on next
// iteration. Idempotent — embedded rows have embeddedAt set, so re-runs
// pick up exactly where a previous run stopped.

const EM_STATUS_KEY = "embedding_status";
const EM_STATS_KEY = "embedding_stats";

type EmbeddingStatus = "idle" | "running";

type EmbeddingStats = {
  done: number;       // rows successfully embedded this run
  failed: number;     // embedText returned null OR threw
  total: number;      // unembedded rows at start of run
  scanned: number;    // total rows in library at start (for UI denominator)
  startedAt?: string;
  finishedAt?: string;
  lastError?: string;
};

async function readEmbeddingStatus(): Promise<EmbeddingStatus> {
  const row = await db.appSetting.findUnique({ where: { key: EM_STATUS_KEY } });
  return row?.value === "running" ? "running" : "idle";
}

async function writeEmbeddingStatus(value: EmbeddingStatus): Promise<void> {
  await db.appSetting.upsert({
    where: { key: EM_STATUS_KEY },
    create: { key: EM_STATUS_KEY, value, notes: "Bulk embedding flag (idle|running)" },
    update: { value },
  });
}

async function writeEmbeddingStats(stats: EmbeddingStats): Promise<void> {
  await db.appSetting.upsert({
    where: { key: EM_STATS_KEY },
    create: { key: EM_STATS_KEY, value: JSON.stringify(stats), notes: "Bulk embedding progress (JSON)" },
    update: { value: JSON.stringify(stats) },
  });
}

export async function getEmbeddingStatus(): Promise<{
  status: EmbeddingStatus;
  stats: EmbeddingStats | null;
}> {
  await requireAdmin();
  const status = await readEmbeddingStatus();
  const row = await db.appSetting.findUnique({ where: { key: EM_STATS_KEY } });
  let stats: EmbeddingStats | null = null;
  if (row?.value) {
    try {
      stats = JSON.parse(row.value) as EmbeddingStats;
    } catch {
      stats = null;
    }
  }
  return { status, stats };
}

export async function stopBulkEmbed(): Promise<{ success: boolean }> {
  const admin = await requireAdmin();
  await writeEmbeddingStatus("idle");
  await writeAudit({ actorId: admin.id, action: "library.bulkEmbed.stop" });
  return { success: true };
}

export async function startBulkEmbed(): Promise<{
  success: boolean;
  error?: string;
  finalStats?: EmbeddingStats;
}> {
  const admin = await requireAdmin();

  const current = await readEmbeddingStatus();
  if (current === "running") return { success: false, error: "already_running" };

  const unembedded = await db.promptExemplar.findMany({
    where: { embeddedAt: null },
    select: { id: true, prompt: true },
  });
  const totalScanned = await db.promptExemplar.count();

  if (unembedded.length === 0) {
    // Surface a distinct error so the UI can show a clean "all done" notice.
    return { success: false, error: "no_unembedded" };
  }

  await writeEmbeddingStatus("running");

  const stats: EmbeddingStats = {
    done: 0,
    failed: 0,
    total: unembedded.length,
    scanned: totalScanned,
    startedAt: new Date().toISOString(),
  };
  await writeEmbeddingStats(stats);

  try {
    for (const ex of unembedded) {
      if ((await readEmbeddingStatus()) !== "running") break;

      try {
        const result = await embedText(ex.prompt);
        if (!result) {
          stats.failed++;
          stats.lastError = "embed_engine_returned_null";
        } else {
          await saveEmbedding(ex.id, result);
          stats.done++;
        }
      } catch (e) {
        stats.failed++;
        stats.lastError = e instanceof Error ? e.message : String(e);
      }

      await writeEmbeddingStats(stats);
    }

    stats.finishedAt = new Date().toISOString();
    await writeEmbeddingStats(stats);
    await writeAudit({
      actorId: admin.id,
      action: "library.bulkEmbed.complete",
      targetType: "promptExemplar",
      meta: { done: stats.done, failed: stats.failed, total: stats.total, scanned: stats.scanned },
    });
    return { success: true, finalStats: stats };
  } finally {
    await writeEmbeddingStatus("idle");
    revalidatePath("/pr/yonet/library");
  }
}

// ──────────────────────────────────────────────────────
// Bulk translation: long-running worker with stop control
// ──────────────────────────────────────────────────────
//
// Two pieces of mutable state stored in AppSetting:
//   translation_status — "idle" | "running"   (toggles only)
//   translation_stats  — JSON with progress counters + timestamps
//
// Lifecycle:
//   startBulkTranslate
//     1. Refuses if status already "running" (single worker).
//     2. Flips status → "running", resets stats.
//     3. Iterates EVERY row, one at a time, in id order.
//        - English rows (detected from content): skipped, move on.
//        - Non-English rows: translateToEnglish() → update prompt,
//          contentLength → continue. Errors are recorded but never
//          stop the loop.
//        - Every iteration re-reads translation_status; if it has been
//          flipped to "idle" by stopBulkTranslate, the loop exits cleanly.
//     4. try/finally guarantees status returns to "idle" even on crash.
//
//   stopBulkTranslate — flips status → "idle". The running loop sees
//     this on its next iteration and exits.
//
//   getTranslationStatus — returns { status, stats } for UI polling.
//
// Idempotent: a translated row is now English, so the next pass detects
// "en" and skips it. A user can stop and restart freely without losing
// work.

const TR_STATUS_KEY = "translation_status";
const TR_STATS_KEY = "translation_stats";

type TranslationStatus = "idle" | "running";

type TranslationStats = {
  done: number;       // rows actually translated and saved
  skipped: number;    // candidates the AI confirmed were already English (rare)
  failed: number;     // candidates whose translation hit an API error
  total: number;      // candidate count after pre-filter
  scanned: number;    // total rows examined in DB (denominator the user expects)
  startedAt?: string;
  finishedAt?: string;
  lastError?: string;
};

async function readTranslationStatus(): Promise<TranslationStatus> {
  const row = await db.appSetting.findUnique({ where: { key: TR_STATUS_KEY } });
  return row?.value === "running" ? "running" : "idle";
}

async function writeTranslationStatus(value: TranslationStatus): Promise<void> {
  await db.appSetting.upsert({
    where: { key: TR_STATUS_KEY },
    create: { key: TR_STATUS_KEY, value, notes: "Bulk translation flag (idle|running)" },
    update: { value },
  });
}

async function writeTranslationStats(stats: TranslationStats): Promise<void> {
  const value = JSON.stringify(stats);
  await db.appSetting.upsert({
    where: { key: TR_STATS_KEY },
    create: { key: TR_STATS_KEY, value, notes: "Bulk translation progress (JSON)" },
    update: { value },
  });
}

export async function getTranslationStatus(): Promise<{
  status: TranslationStatus;
  stats: TranslationStats | null;
}> {
  await requireAdmin();
  const status = await readTranslationStatus();
  const row = await db.appSetting.findUnique({ where: { key: TR_STATS_KEY } });
  let stats: TranslationStats | null = null;
  if (row?.value) {
    try {
      stats = JSON.parse(row.value) as TranslationStats;
    } catch {
      stats = null;
    }
  }
  return { status, stats };
}

export async function stopBulkTranslate(): Promise<{ success: boolean }> {
  const admin = await requireAdmin();
  await writeTranslationStatus("idle");
  await writeAudit({ actorId: admin.id, action: "library.bulkTranslate.stop" });
  return { success: true };
}

export async function startBulkTranslate(): Promise<{
  success: boolean;
  error?: string;
  finalStats?: TranslationStats;
}> {
  const admin = await requireAdmin();

  const current = await readTranslationStatus();
  if (current === "running") return { success: false, error: "already_running" };

  await writeTranslationStatus("running");

  // ── PRE-FILTER: pick only candidates that are NOT obviously English ─────
  // Two layers of detection, both free (no API calls):
  //
  //   Layer 1 (SQL): rows whose prompt contains a non-Latin script glyph —
  //     Cyrillic, Greek, Hebrew, Arabic, Devanagari, Bengali, Thai,
  //     Burmese, Hiragana, Katakana, CJK Unified Ideographs, Hangul.
  //     A single match is enough to mark the row non-English.
  //
  //   Layer 2 (in-process): for the remaining (Latin-script) rows, run
  //     detectLanguage() — Turkish chars / German|French|Spanish word
  //     density. Also accept rows whose `language` metadata is non-en.
  //
  // Pure English rows skip the AI entirely. On the current 1,376-row
  // library this means ~100 API calls instead of 1,376 (~25× speedup).
  const NON_LATIN_REGEX =
    "[Ѐ-ԯͰ-Ͽ֐-׿؀-ۿऀ-ॿঀ-৿฀-๿က-႟぀-ヿ㐀-䶿一-鿿가-힯]";

  const nonLatinIds = await db.$queryRawUnsafe<{ id: string }[]>(
    `SELECT id FROM "PromptExemplar" WHERE prompt ~ '${NON_LATIN_REGEX}'`,
  );
  const candidateIds = new Set(nonLatinIds.map((r) => r.id));

  const allRows: { id: string; language: string; prompt: string }[] =
    await db.promptExemplar.findMany({
      select: { id: true, language: true, prompt: true },
    });
  const totalScanned = allRows.length;

  for (const row of allRows) {
    if (candidateIds.has(row.id)) continue;
    if (row.language && row.language !== "en") {
      candidateIds.add(row.id);
      continue;
    }
    const detected = detectLanguage(row.prompt);
    if (detected.lang !== "en" && detected.confidence !== "low") {
      candidateIds.add(row.id);
    }
  }

  const stats: TranslationStats = {
    done: 0,
    skipped: 0,
    failed: 0,
    total: candidateIds.size,
    scanned: totalScanned,
    startedAt: new Date().toISOString(),
  };
  await writeTranslationStats(stats);

  if (candidateIds.size === 0) {
    stats.finishedAt = new Date().toISOString();
    await writeTranslationStats(stats);
    await writeTranslationStatus("idle");
    await writeAudit({
      actorId: admin.id,
      action: "library.bulkTranslate.complete",
      meta: { done: 0, skipped: 0, failed: 0, total: 0, scanned: totalScanned, note: "no_candidates" },
    });
    revalidatePath("/pr/yonet/library");
    return { success: true, finalStats: stats };
  }

  try {
    const candidates: { id: string; prompt: string }[] = await db.promptExemplar.findMany({
      where: { id: { in: Array.from(candidateIds) } },
      select: { id: true, prompt: true },
      orderBy: { id: "asc" },
    });

    for (const ex of candidates) {
      if ((await readTranslationStatus()) !== "running") break;

      try {
        const result = await maybeTranslate(ex.prompt);
        if (result.skipped) {
          stats.failed++;
          if (result.reason) stats.lastError = result.reason;
        } else if (result.changed) {
          await db.promptExemplar.update({
            where: { id: ex.id },
            data: {
              prompt: result.result,
              contentLength: result.result.length,
              language: "en",
            },
          });
          stats.done++;
        } else {
          // AI confirmed it was already English — rare since pre-filter
          // already screens these, but possible for ambiguous Latin text.
          stats.skipped++;
        }
      } catch (e) {
        stats.failed++;
        stats.lastError = e instanceof Error ? e.message : String(e);
      }

      // Each translation API call is slow; flush after every one so the
      // UI poll picks up live progress.
      await writeTranslationStats(stats);
    }

    stats.finishedAt = new Date().toISOString();
    await writeTranslationStats(stats);
    await writeAudit({
      actorId: admin.id,
      action: "library.bulkTranslate.complete",
      meta: {
        done: stats.done,
        skipped: stats.skipped,
        failed: stats.failed,
        total: stats.total,
        scanned: stats.scanned,
      },
    });
    return { success: true, finalStats: stats };
  } finally {
    await writeTranslationStatus("idle");
    revalidatePath("/pr/yonet/library");
  }
}
