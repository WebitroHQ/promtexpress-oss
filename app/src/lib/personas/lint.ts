/**
 * Persona kalite linter — UI rozetleri ve drawer uyarıları için.
 * Saf fonksiyon: server-side server action'lardan ve client UI'dan ortak çağrılır.
 */

export type PersonaLintCode =
  | "BODY_TOO_SHORT"
  | "JARGON_EMPTY"
  | "FRAMEWORKS_EMPTY"
  | "ANTIPATTERNS_EMPTY"
  | "SLUG_FORMAT"
  | "BODY_GENERIC";

export type PersonaLintSeverity = "warn" | "info";

export interface PersonaLintIssue {
  code: PersonaLintCode;
  severity: PersonaLintSeverity;
  message: string;
}

export interface PersonaLintInput {
  domainSlug: string;
  body: string;
  jargon: string[];
  frameworks: string[];
  antiPatterns: string[];
}

const SLUG_RE = /^[a-z0-9-]+$/;
const GENERIC_OPENERS = [
  "you are an expert",
  "you are a professional",
  "you are a helpful",
  "you are a knowledgeable",
];

export function lintPersona(p: PersonaLintInput): PersonaLintIssue[] {
  const issues: PersonaLintIssue[] = [];

  if (!SLUG_RE.test(p.domainSlug)) {
    issues.push({
      code: "SLUG_FORMAT",
      severity: "warn",
      message: "domainSlug yalnızca küçük harf, rakam ve tire içermeli",
    });
  }

  if (p.body.trim().length < 200) {
    issues.push({
      code: "BODY_TOO_SHORT",
      severity: "warn",
      message: `Body çok kısa (${p.body.trim().length} karakter). En az 200 karakter olmalı; uzman tonu ve spesifik teknikler için yer açın.`,
    });
  }

  const lower = p.body.toLowerCase().trimStart();
  if (GENERIC_OPENERS.some((g) => lower.startsWith(g))) {
    issues.push({
      code: "BODY_GENERIC",
      severity: "info",
      message: "Body jenerik bir cümle ile başlıyor (\"You are an expert...\"). Daha spesifik bir uzmanlık ifadesi kullanın.",
    });
  }

  if (p.jargon.length === 0) {
    issues.push({
      code: "JARGON_EMPTY",
      severity: "warn",
      message: "Jargon listesi boş — Synthesizer domain-specific terim kullanamaz.",
    });
  }

  if (p.frameworks.length === 0) {
    issues.push({
      code: "FRAMEWORKS_EMPTY",
      severity: "info",
      message: "Frameworks listesi boş — domain'e özgü çerçeve/mental model eklemek kaliteyi yükseltir.",
    });
  }

  if (p.antiPatterns.length === 0) {
    issues.push({
      code: "ANTIPATTERNS_EMPTY",
      severity: "info",
      message: "Anti-pattern listesi boş — Synthesizer kaçınılması gereken kalıpları bilmiyor.",
    });
  }

  return issues;
}

/**
 * Çoklu persona seti üzerinde duplicate slug benzerliği (Levenshtein <2).
 * Tüm setin içinden çağrılır; tek persona için anlamsızdır.
 */
export function findDuplicateSlugRisks(slugs: string[]): Array<{ a: string; b: string; distance: number }> {
  const out: Array<{ a: string; b: string; distance: number }> = [];
  for (let i = 0; i < slugs.length; i++) {
    for (let j = i + 1; j < slugs.length; j++) {
      const d = levenshtein(slugs[i], slugs[j]);
      if (d > 0 && d <= 2) out.push({ a: slugs[i], b: slugs[j], distance: d });
    }
  }
  return out;
}

function levenshtein(a: string, b: string): number {
  if (a === b) return 0;
  const m = a.length;
  const n = b.length;
  if (m === 0) return n;
  if (n === 0) return m;
  const dp = new Array(n + 1);
  for (let j = 0; j <= n; j++) dp[j] = j;
  for (let i = 1; i <= m; i++) {
    let prev = dp[0];
    dp[0] = i;
    for (let j = 1; j <= n; j++) {
      const tmp = dp[j];
      dp[j] = a[i - 1] === b[j - 1] ? prev : 1 + Math.min(prev, dp[j], dp[j - 1]);
      prev = tmp;
    }
  }
  return dp[n];
}
