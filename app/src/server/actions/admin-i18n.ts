"use server";

import fs from "node:fs";
import path from "node:path";
import { z } from "zod";
import { revalidatePath } from "next/cache";
import { requireAdmin, writeAudit } from "@/lib/audit";

const CODE_RE = /^[a-z]{2}(-[A-Z]{2})?$/;

const AddLocaleSchema = z.object({
  code: z.string().trim().min(2).max(10).regex(CODE_RE, "Locale e.g. 'en' veya 'tr-TR'"),
});

export async function addLocale(input: z.input<typeof AddLocaleSchema>) {
  const admin = await requireAdmin();
  const parsed = AddLocaleSchema.parse(input);

  const root = path.join(process.cwd(), "messages");
  const target = path.join(root, `${parsed.code}.json`);
  if (fs.existsSync(target)) throw new Error(`Locale "${parsed.code}" already exists`);

  const base = path.join(root, "en.json");
  if (!fs.existsSync(base)) throw new Error("Base file en.json not found");

  fs.copyFileSync(base, target);
  await writeAudit({ actorId: admin.id, action: "i18n.addLocale", targetType: "locale", targetId: parsed.code });
  revalidatePath("/pr/yonet/i18n");
  return { ok: true };
}

export async function deleteLocale(code: string) {
  const admin = await requireAdmin();
  if (code === "en") throw new Error("Cannot delete the base locale");
  const target = path.join(process.cwd(), "messages", `${code}.json`);
  if (!fs.existsSync(target)) throw new Error("Locale not found");
  fs.unlinkSync(target);
  await writeAudit({ actorId: admin.id, action: "i18n.deleteLocale", targetType: "locale", targetId: code });
  revalidatePath("/pr/yonet/i18n");
  return { ok: true };
}

import {
  parsePoToFlat,
  flattenJson,
  unflattenJson,
  mergeFlat,
} from "@/lib/admin/po-import";

const ImportPoSchema = z.object({
  locale: z.string().trim().min(2).max(10).regex(CODE_RE, "Geçersiz locale"),
  poContent: z.string().min(1).max(2_000_000),
  dryRun: z.boolean().default(false),
});

export async function importPoFile(input: z.input<typeof ImportPoSchema>) {
  const admin = await requireAdmin();
  const parsed = ImportPoSchema.parse(input);

  const root = path.join(process.cwd(), "messages");
  const target = path.join(root, `${parsed.locale}.json`);
  if (!fs.existsSync(target)) {
    throw new Error(`Locale ${parsed.locale} dosyası yok. Önce "Add language" ile oluştur.`);
  }

  // Parse PO + flatten existing JSON
  let incoming: Record<string, string>;
  try {
    incoming = parsePoToFlat(parsed.poContent);
  } catch (e) {
    throw new Error(`PO parse hatası: ${(e as Error).message}`);
  }

  if (Object.keys(incoming).length === 0) {
    return { ok: true, added: 0, updated: 0, skipped: 0, totalEntries: 0, dryRun: parsed.dryRun };
  }

  const raw = fs.readFileSync(target, "utf8");
  const existingObj = JSON.parse(raw) as Record<string, unknown>;
  const existingFlat = flattenJson(existingObj);

  const result = mergeFlat(existingFlat, incoming);

  if (!parsed.dryRun) {
    // Atomic write: temp file + rename
    const merged = unflattenJson(result.merged);
    const tmp = `${target}.tmp.${Date.now()}`;
    fs.writeFileSync(tmp, JSON.stringify(merged, null, 2) + "\n", "utf8");
    fs.renameSync(tmp, target);

    await writeAudit({
      actorId: admin.id,
      action: "i18n.importPo",
      targetType: "locale",
      targetId: parsed.locale,
      meta: { added: result.added.length, updated: result.updated.length, skipped: result.skipped.length, total: result.totalEntries },
    });
    revalidatePath("/pr/yonet/i18n");
  }

  return {
    ok: true,
    added: result.added.length,
    updated: result.updated.length,
    skipped: result.skipped.length,
    totalEntries: result.totalEntries,
    dryRun: parsed.dryRun,
    sampleAdded: result.added.slice(0, 5),
    sampleUpdated: result.updated.slice(0, 5),
  };
}
