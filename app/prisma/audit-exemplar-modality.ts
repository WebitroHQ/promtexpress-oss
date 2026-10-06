/**
 * 2026-05-12 confabulation fix — Plan §4.
 *
 * PromptExemplar.modality alanı içeriğe uymayan satırları tespit eder.
 * Kanıt: Prompt cmp2aq14u000bh0ermbawejs1 trace'inde retrieve edilen exemplar
 * cmom1luni00esoe4o93sxb4bk ("🛡️ RED TEAM MODE") modality='image' olarak
 * tag'lenmişti — gerçekte adversarial system prompt'u, image prompt değil.
 *
 * Kullanım:
 *   pnpm tsx prisma/audit-exemplar-modality.ts          # rapor (read-only)
 *   pnpm tsx prisma/audit-exemplar-modality.ts --apply  # mismatch satırları status='DRAFT'
 *
 * 9 modalite × ayrı pattern sözlüğü. text catch-all (negatif kontrol).
 */
import { PrismaClient } from "@prisma/client";

const db = new PrismaClient();

type ModalityKey =
  | "text"
  | "code"
  | "image"
  | "video"
  | "audio"
  | "music"
  | "math"
  | "slides"
  | "diagram";

// Pozitif pattern'ler — modaliteye uygun içeriğin tipik işaretleri.
const POSITIVE: Record<Exclude<ModalityKey, "text">, RegExp[]> = {
  image: [
    /\bshot\b/i,
    /\bphoto(graph)?\b/i,
    /\baspect\s*ratio\b/i,
    /--ar\s+\d+:\d+/i,
    /\billustration\b/i,
    /\bcomposition\b/i,
    /\blighting\b/i,
    /\bhero[-\s]shot\b/i,
    /\bmidjourney|dall-?e|sdxl|stable\s+diffusion\b/i,
    /\brendering?\b/i,
    /\b(portrait|landscape|cinematic|studio)\b/i,
  ],
  video: [
    /\bscene\b/i,
    /\bshot\s*list\b/i,
    /\bcamera\b/i,
    /\bframe(s)?\b/i,
    /\bfps\b/i,
    /\baspect\s*ratio\b/i,
    /\bveo|runway|sora|pika\b/i,
    /\bseconds?\b/i,
    /\bpan(ning)?|zoom|tilt\b/i,
  ],
  audio: [
    /\bvoice\b/i,
    /\btts\b/i,
    /\bnarration\b/i,
    /\bspeaker\b/i,
    /\baccent\b/i,
    /\btone\b/i,
    /\bemotion[_\-]?tags?\b/i,
    /\bssml\b/i,
    /\belevenlabs|playht\b/i,
  ],
  music: [
    /\[LYRICS\]/,
    /\[STYLE\]/,
    /\bbpm\b/i,
    /\btempo\b/i,
    /\bverse\b/i,
    /\bchorus\b/i,
    /\binstrumental\b/i,
    /\bsuno|udio\b/i,
  ],
  code: [
    /```/,
    /\bfunction\b/,
    /\bclass\s+\w/,
    /\bimport\s+/,
    /\bconst\s+\w/,
    /\blet\s+\w/,
    /\bdef\s+\w/,
    /=>\s/,
    /\breturn\s+/,
    /console\.\w/,
  ],
  math: [
    /\\\(/,
    /\\\[/,
    /\$\$/,
    /\\(begin|end)\{(equation|align|matrix)/,
    /\bequation\b/i,
    /\btheorem\b/i,
    /\bintegral\b/i,
    /\bderivative\b/i,
    /\bmatrix\b/i,
    /\bLaTeX\b/i,
  ],
  slides: [
    /\bslide\s*\d+/i,
    /\bdeck\b/i,
    /\bpresentation\b/i,
    /\boutline\b/i,
    /\breveal\.js\b/i,
    /^\s*[-*]\s.+$/m, // bullet structure
  ],
  diagram: [
    /\bmermaid\b/i,
    /\bgraphviz\b/i,
    /\bflowchart\b/i,
    /\bsequence\s*diagram\b/i,
    /\bclass\s*diagram\b/i,
    /\bplantuml\b/i,
    /\bdigraph\s+/i,
  ],
};

function detectModality(text: string): ModalityKey {
  // Önce spesifik modaliteler; text catch-all.
  for (const m of [
    "music",
    "code",
    "diagram",
    "math",
    "slides",
    "audio",
    "video",
    "image",
  ] as Exclude<ModalityKey, "text">[]) {
    if (POSITIVE[m].some((rx) => rx.test(text))) return m;
  }
  return "text";
}

async function main() {
  const apply = process.argv.includes("--apply");
  const rows = await db.promptExemplar.findMany({
    where: { status: { in: ["GOLD", "VERIFIED"] } },
    select: { id: true, title: true, prompt: true, modality: true, status: true },
    orderBy: [{ modality: "asc" }, { createdAt: "asc" }],
  });

  const mismatches: { id: string; title: string | null; declared: string; detected: string }[] = [];
  for (const r of rows) {
    const detected = detectModality(r.prompt);
    if (detected !== r.modality) {
      mismatches.push({ id: r.id, title: r.title, declared: r.modality, detected });
    }
  }

  console.log(`\n=== PromptExemplar modality audit ===`);
  console.log(`Total scanned: ${rows.length}`);
  console.log(`Mismatches:    ${mismatches.length}\n`);

  // Modaliteye göre grupla
  const byDeclared: Record<string, typeof mismatches> = {};
  for (const m of mismatches) {
    (byDeclared[m.declared] ??= []).push(m);
  }
  for (const [declared, list] of Object.entries(byDeclared)) {
    console.log(`\n--- declared=${declared} (${list.length}) ---`);
    for (const m of list) {
      console.log(
        `  ${m.id}  declared=${m.declared}  detected=${m.detected}  title="${(m.title ?? "").slice(0, 60)}"`,
      );
    }
  }

  if (apply && mismatches.length > 0) {
    // ExemplarStatus enum: REVIEW | VERIFIED | GOLD | ARCHIVED | REJECTED.
    // ARCHIVED kullanılır — geri-alınabilir, RAG'den dışlanır (status filtre).
    console.log(`\n--- APPLYING: setting status='ARCHIVED' for ${mismatches.length} mismatches ---`);
    const ids = mismatches.map((m) => m.id);
    const result = await db.promptExemplar.updateMany({
      where: { id: { in: ids } },
      data: { status: "ARCHIVED" },
    });
    console.log(`Updated ${result.count} rows to status='ARCHIVED'.`);
  } else if (mismatches.length > 0) {
    console.log(`\n(Run with --apply to set these rows to status='ARCHIVED'.)`);
  }

  await db.$disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
