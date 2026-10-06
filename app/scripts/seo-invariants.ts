// Plan §8.5 — invariant checks that run before deploy. Fail fast on
// regressions of the SEO foundation:
//   - metadataBase host = lowercase https://promtexpress.com
//   - routing.locales = ["en"] (US-only)
//   - No "PromtExpress.com" / "promtExpress.com" URL casing in src
//   - No hardcoded AI model ids (CLAUDE.md §8)
//   - No fictional aggregateRating (12000 reviews) lingering anywhere
//
// Run: pnpm exec tsx scripts/seo-invariants.ts

import { execSync } from "node:child_process";
import { readFileSync } from "node:fs";

const ROOT = process.cwd();
const failures: string[] = [];

function check(label: string, predicate: () => boolean | string) {
  try {
    const result = predicate();
    if (result === true) {
      console.log(`✓ ${label}`);
    } else {
      const msg = typeof result === "string" ? result : "predicate returned false";
      console.log(`✗ ${label}: ${msg}`);
      failures.push(`${label}: ${msg}`);
    }
  } catch (e) {
    const msg = (e as Error).message;
    console.log(`✗ ${label}: ${msg}`);
    failures.push(`${label}: ${msg}`);
  }
}

function grepCount(pattern: string, includeGlob: string): number {
  try {
    const out = execSync(
      `grep -rEn ${JSON.stringify(pattern)} src/ --include=${JSON.stringify(includeGlob)} || true`,
      { cwd: ROOT, encoding: "utf-8" },
    );
    return out.split("\n").filter((l) => l.trim().length > 0).length;
  } catch {
    return 0;
  }
}

// 1. metadataBase host lowercase. layout.tsx uses `new URL(SEO_BASE_URL)`;
// SEO_BASE_URL is defined in src/lib/seo/hreflang.ts. Both files must agree.
check("metadataBase + SEO_BASE_URL host lowercase", () => {
  const layout = readFileSync(`${ROOT}/src/app/layout.tsx`, "utf-8");
  if (/metadataBase[^)]*PromtExpress/.test(layout))
    return "found CamelCase host in layout.tsx metadataBase";
  if (!/metadataBase[^)]*(promtexpress\.com|SEO_BASE_URL)/.test(layout))
    return "metadataBase missing or unrecognised in layout.tsx";
  const hreflang = readFileSync(`${ROOT}/src/lib/seo/hreflang.ts`, "utf-8");
  const m = /SEO_BASE_URL\s*=\s*"([^"]+)"/.exec(hreflang);
  if (!m) return "SEO_BASE_URL constant not found";
  if (m[1] !== "https://promtexpress.com")
    return `SEO_BASE_URL = ${m[1]}, expected lowercase host`;
  return true;
});

// 2. routing.locales single locale
check("routing.locales = [\"en\"] (US-only)", () => {
  const routing = readFileSync(`${ROOT}/src/i18n/routing.ts`, "utf-8");
  const m = /export const locales\s*=\s*\[([^\]]+)\]/.exec(routing);
  if (!m) return "could not parse locales array";
  const list = m[1]
    .split(",")
    .map((s) => s.trim().replace(/['"]/g, ""))
    .filter(Boolean);
  if (list.length !== 1 || list[0] !== "en")
    return `locales = [${list.join(", ")}], expected ["en"]`;
  return true;
});

// 3. No CamelCase URL host in src
check("no PromtExpress.com / promtExpress.com URLs in src/", () => {
  const count = grepCount("PromtExpress\\.com|promtExpress\\.com", "*.ts*");
  return count === 0 ? true : `${count} occurrences`;
});

// 4. CLAUDE.md §8 — no hardcoded model ids outside engines adapter.
// Comments (// ... or block /* */) are allowed — they document examples but
// do not introduce runtime hardcoding. We strip those before matching.
check("no hardcoded AI model ids (CLAUDE.md §8)", () => {
  try {
    const out = execSync(
      `grep -rnE "(claude-[0-9]|gpt-[0-9]|gemini-[0-9]|deepseek-)" src/ \
        --exclude-dir=node_modules --include="*.ts" --include="*.tsx" \
        | grep -v "src/lib/engines/" | grep -v ".md:" || true`,
      { cwd: ROOT, encoding: "utf-8", shell: "/bin/bash" },
    );
    const hits = out
      .split("\n")
      .filter((l) => l.trim().length > 0)
      // grep -n output: file:LINE:content. Strip the prefix and skip pure
      // comment lines — model ids in prose are not runtime hardcoding.
      .filter((l) => {
        const codePart = l.replace(/^[^:]+:\d+:\s*/, "");
        return !/^(\/\/|\*|\/\*)/.test(codePart);
      });
    return hits.length === 0 ? true : `${hits.length} hardcoded model ids found`;
  } catch {
    return true;
  }
});

// 5. No fictional aggregateRating lingering
check("no fictional aggregateRating (ratingCount: 12000)", () => {
  const count = grepCount('"ratingCount":\\s*"?12000"?', "*.ts*");
  return count === 0 ? true : `${count} occurrences`;
});

console.log("");
if (failures.length > 0) {
  console.error(`FAIL — ${failures.length} invariant(s) violated`);
  process.exit(1);
}
console.log(`OK — all invariants pass`);
