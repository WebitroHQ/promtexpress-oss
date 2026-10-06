// Plan §8.1 — SEO smoke test. Crawls every public route and asserts:
//   - HTTP 200
//   - <link rel="canonical">
//   - hreflang count = 2 (en-US + x-default)
//   - <meta name="viewport"> present
//   - <meta name="theme-color"> present (at least one)
//   - At least one JSON-LD <script type="application/ld+json">
//   - All JSON-LD blocks parse cleanly
//   - <html lang="en-US">
//   - og:url canonical-aligned
//
// Runs against an arbitrary base URL — CI hits the locally-built server
// (pnpm start:prod), local dev uses pnpm dev. Set SEO_BASE_URL env to
// override; default http://localhost:3010.

const BASE = process.env.SEO_BASE_URL ?? "http://localhost:3010";

const PUBLIC_ROUTES = [
  "/",
  "/pricing",
  "/about",
  "/contact",
  "/blog",
  "/legal",
  "/privacy",
  "/terms",
  "/refund",
];

const ANCILLARY_ROUTES = [
  "/sitemap.xml",
  "/robots.txt",
  "/manifest.webmanifest",
  "/feed.xml",
  "/atom.xml",
  "/llms.txt",
  "/llms-full.txt",
];

interface RouteFinding {
  route: string;
  status: number;
  ok: boolean;
  errors: string[];
}

async function fetchText(url: string): Promise<{ status: number; body: string }> {
  const res = await fetch(url, { redirect: "manual" });
  const body = await res.text();
  return { status: res.status, body };
}

async function auditPage(route: string): Promise<RouteFinding> {
  const url = `${BASE}${route}`;
  const errors: string[] = [];
  let status = 0;
  try {
    const { status: s, body } = await fetchText(url);
    status = s;
    if (s !== 200) errors.push(`status ${s}, expected 200`);

    if (!/<html[^>]*\blang="en-US"/i.test(body)) errors.push("missing <html lang=\"en-US\">");
    if (!/<link\s+rel="canonical"[^>]+href=/i.test(body))
      errors.push("missing <link rel=\"canonical\">");

    const hreflangs = body.match(/<link\s+rel="alternate"[^>]+hrefLang=/gi) ?? [];
    if (hreflangs.length !== 2)
      errors.push(`hreflang count = ${hreflangs.length}, expected 2 (en-US + x-default)`);

    if (!/<meta\s+name="viewport"/i.test(body)) errors.push("missing viewport meta");
    if (!/<meta\s+name="theme-color"/i.test(body)) errors.push("missing theme-color meta");

    const ldBlocks = body.match(/<script[^>]+type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/gi) ?? [];
    if (ldBlocks.length === 0) errors.push("no JSON-LD blocks");
    for (const block of ldBlocks) {
      const inner = block.replace(/^<script[^>]*>/i, "").replace(/<\/script>$/i, "");
      try {
        JSON.parse(inner);
      } catch (e) {
        errors.push(`JSON-LD parse error: ${(e as Error).message.slice(0, 80)}`);
      }
    }

    const ogUrl = /<meta[^>]+property="og:url"[^>]+content="([^"]+)"/i.exec(body)?.[1];
    if (!ogUrl) errors.push("missing og:url");
    else if (!ogUrl.startsWith("https://promtexpress.com"))
      errors.push(`og:url casing/host wrong: ${ogUrl}`);
  } catch (e) {
    errors.push(`fetch error: ${(e as Error).message}`);
  }
  return { route, status, ok: errors.length === 0, errors };
}

async function auditAncillary(route: string): Promise<RouteFinding> {
  const url = `${BASE}${route}`;
  const errors: string[] = [];
  let status = 0;
  try {
    const { status: s } = await fetchText(url);
    status = s;
    if (s !== 200) errors.push(`status ${s}, expected 200`);
  } catch (e) {
    errors.push(`fetch error: ${(e as Error).message}`);
  }
  return { route, status, ok: errors.length === 0, errors };
}

async function main() {
  console.log(`SEO audit against ${BASE}`);
  const findings: RouteFinding[] = [];
  for (const r of PUBLIC_ROUTES) findings.push(await auditPage(r));
  for (const r of ANCILLARY_ROUTES) findings.push(await auditAncillary(r));

  const failures = findings.filter((f) => !f.ok);
  for (const f of findings) {
    const icon = f.ok ? "✓" : "✗";
    console.log(`${icon} ${f.route} (${f.status})`);
    for (const err of f.errors) console.log(`    - ${err}`);
  }
  console.log("");
  console.log(`Summary: ${findings.length - failures.length}/${findings.length} ok`);
  if (failures.length > 0) process.exit(1);
}

main().catch((e) => {
  console.error("audit crashed:", e);
  process.exit(2);
});
