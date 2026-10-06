import { po } from "gettext-parser";

export interface PoImportResult {
  added: string[];
  updated: string[];
  skipped: string[];
  totalEntries: number;
}

/**
 * Parse a .po file content into a flat { key: translation } map.
 * - msgid → key
 * - msgstr → value
 * - empty msgstr (untranslated) skipped
 * - msgctxt prepended as "ctx::msgid" if present
 */
export function parsePoToFlat(poContent: string): Record<string, string> {
  const parsed = po.parse(Buffer.from(poContent, "utf8"));
  const result: Record<string, string> = {};

  for (const ctx of Object.keys(parsed.translations ?? {})) {
    const ctxMap = parsed.translations[ctx]!;
    for (const msgid of Object.keys(ctxMap)) {
      if (!msgid) continue; // header
      const entry = ctxMap[msgid]!;
      const msgstr = (entry.msgstr ?? [])[0];
      if (!msgstr) continue;
      const key = ctx ? `${ctx}::${msgid}` : msgid;
      result[key] = msgstr;
    }
  }

  return result;
}

/**
 * Walk a nested JSON object, returning flat dot-notation { "a.b.c": "value" }.
 * Used to compare/merge with PO output (which is naturally flat).
 */
export function flattenJson(obj: Record<string, unknown>, prefix = ""): Record<string, string> {
  const out: Record<string, string> = {};
  for (const key of Object.keys(obj)) {
    const value = obj[key];
    const next = prefix ? `${prefix}.${key}` : key;
    if (value && typeof value === "object" && !Array.isArray(value)) {
      Object.assign(out, flattenJson(value as Record<string, unknown>, next));
    } else if (typeof value === "string") {
      out[next] = value;
    }
  }
  return out;
}

/**
 * Reverse of flattenJson — build nested object from flat dot-notation.
 */
export function unflattenJson(flat: Record<string, string>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const key of Object.keys(flat)) {
    const parts = key.split(".");
    let cur: Record<string, unknown> = out;
    for (let i = 0; i < parts.length - 1; i++) {
      const p = parts[i]!;
      if (typeof cur[p] !== "object" || cur[p] === null) cur[p] = {};
      cur = cur[p] as Record<string, unknown>;
    }
    cur[parts[parts.length - 1]!] = flat[key]!;
  }
  return out;
}

/**
 * Merge a flat PO dict into an existing flat locale dict.
 * Returns: which keys were added/updated/skipped.
 */
export function mergeFlat(existing: Record<string, string>, incoming: Record<string, string>): PoImportResult & { merged: Record<string, string> } {
  const merged = { ...existing };
  const added: string[] = [];
  const updated: string[] = [];
  const skipped: string[] = [];

  for (const key of Object.keys(incoming)) {
    const value = incoming[key]!;
    if (!(key in existing)) {
      added.push(key);
      merged[key] = value;
    } else if (existing[key] !== value) {
      updated.push(key);
      merged[key] = value;
    } else {
      skipped.push(key);
    }
  }

  return { added, updated, skipped, totalEntries: Object.keys(incoming).length, merged };
}
