import fs from "node:fs";
import path from "node:path";

export interface LocaleRow {
  code: string;
  name: string;
  coverage: number;
  strings: number;
  baseStrings: number;
  rtl: boolean;
}

const RTL_CODES = new Set(["ar", "he", "fa", "ur"]);

const NAMES: Record<string, string> = {
  en: "English", tr: "Türkçe", es: "Español", de: "Deutsch", fr: "Français",
  pt: "Português", ja: "日本語", zh: "中文", ar: "العربية", he: "עברית",
  ru: "Русский", it: "Italiano", nl: "Nederlands", pl: "Polski", ko: "한국어",
};

function countKeys(value: unknown): number {
  if (value == null) return 0;
  if (typeof value === "string") return 1;
  if (Array.isArray(value)) return value.reduce<number>((s, v) => s + countKeys(v), 0);
  if (typeof value === "object") {
    return Object.values(value as Record<string, unknown>).reduce<number>((s, v) => s + countKeys(v), 0);
  }
  return 0;
}

export async function listLocales(): Promise<LocaleRow[]> {
  const root = path.join(process.cwd(), "messages");
  let files: string[];
  try {
    files = fs.readdirSync(root).filter((f) => f.endsWith(".json"));
  } catch {
    return [];
  }

  const baseFile = files.find((f) => f === "en.json") ?? files[0];
  if (!baseFile) return [];

  let baseStrings = 0;
  try {
    const baseData = JSON.parse(fs.readFileSync(path.join(root, baseFile), "utf8"));
    baseStrings = countKeys(baseData);
  } catch {
    baseStrings = 0;
  }

  const rows: LocaleRow[] = [];
  for (const file of files.sort()) {
    const code = file.replace(/\.json$/, "");
    let strings = 0;
    try {
      const data = JSON.parse(fs.readFileSync(path.join(root, file), "utf8"));
      strings = countKeys(data);
    } catch {
      strings = 0;
    }
    const coverage = baseStrings > 0 ? Math.min(100, Math.round((strings / baseStrings) * 100)) : 100;
    rows.push({
      code,
      name: NAMES[code] ?? code.toUpperCase(),
      coverage,
      strings,
      baseStrings,
      rtl: RTL_CODES.has(code),
    });
  }

  return rows;
}
