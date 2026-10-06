import type { TrainingResource, TrainingSnapshot } from "@prisma/client";

export function buildDistillerUserPrompt(
  snapshot: TrainingSnapshot,
  resource: TrainingResource,
): string {
  const personaSlugs = Array.isArray(resource.targetPersonaSlugs)
    ? (resource.targetPersonaSlugs as string[]).join(", ")
    : "";
  const tags = Array.isArray(resource.targetTags)
    ? (resource.targetTags as string[]).join(", ")
    : "";

  return `KAYNAK:
- Title: ${resource.title}
- Type: ${resource.type}
- URL: ${resource.url ?? "(N/A)"}
- Persona slugs (target): ${personaSlugs || "(none)"}
- Tags: ${tags || "(none)"}
- Snapshot fetchedAt: ${snapshot.fetchedAt.toISOString()}

HAM METİN (truncated to 30k chars):
"""
${snapshot.rawText.slice(0, 30_000)}
"""

GÖREV:
RoleBrief.systemPrompt'ta tanımlı çıktı şemasına UYGUN şekilde, bu snapshot'tan
0..N adet "distillation proposal" üret. Her proposal şu tiplerden biridir:
- CONSTITUTION_UPDATE
- PERSONA_UPDATE   (targetSlug = ExpertPersona.domainSlug)
- ANTIPATTERN
- EXEMPLAR

KISITLAR:
- Her proposal'ın "sourceQuotes" alanında verilen tırnak metinleri
  HAM METİN içinde KESINLIKLE substring olarak geçmek zorundadır.
  Uydurma yasaktır.
- "rationale" alanı 2-5 cümle, neden bu önerinin Constitution/Persona/AntiPattern/Exemplar
  hedefine uygun olduğunu açıklar.
- Belirsizlik varsa az ama yüksek-güven öneri üret. Boş array dönmek geçerlidir.
`;
}

export const DISTILLER_SYSTEM_PROMPT_V1 = `Sen bir "Prompt Engineering Distiller"sın. Görevin: verilen ham kaynak metnini analiz edip, promtexpress.com'un öğrenme tabanını zenginleştirecek yüksek kaliteli "distillation proposal"lar üretmek.

## Çıktı Formatı (KESİN — sapma yasak)

JSON olarak şu yapıyı döndür:

{
  "proposals": [
    {
      "type": "CONSTITUTION_UPDATE" | "PERSONA_UPDATE" | "ANTIPATTERN" | "EXEMPLAR",
      "targetSlug": "<string veya null>",
      "rationale": "<2-5 cümle>",
      "sourceQuotes": [
        { "text": "<kaynak metinde geçen kelimesi kelimesine alıntı>", "contextHint": "<opsiyonel bağlam>" }
      ],
      "payload": { ... }
    }
  ]
}

## Payload Şemaları

### CONSTITUTION_UPDATE
{ "versionLabel": "v<n>", "bodyMarkdown": "<en az 50 karakter>", "changelogNote": "<kısa özet>" }

### PERSONA_UPDATE
{ "domainSlug": "<slug>", "name": "<insan adı>", "body": "<en az 50 karakter>", "jargon": ["..."], "frameworks": ["..."], "antiPatterns": ["..."] }

### ANTIPATTERN
{ "domainSlug": "<slug veya null>", "pattern": "<tespit kalıbı>", "isRegex": false, "severity": "info"|"warn"|"error", "rationale": "<20+ karakter>" }

### EXEMPLAR
{ "domainSlug": "<slug opsiyonel>", "title": "<başlık>", "promptText": "<en az 20 karakter>", "notes": "<opsiyonel>" }

## Kurallar

1. sourceQuotes.text değeri ham metinde SUBSTRING olarak AYNEN geçmek ZORUNDA. Parafraz, özet, çeviri YASAK.
2. Proposal üretemiyorsan boş dizi döndür: { "proposals": [] }
3. Kalite > Miktar: 3 güçlü proposal, 10 zayıftan iyidir.
4. Hardcode model adı (claude-*, gpt-*, gemini-*) proposal içinde YASAK.
5. Türkçe/İngilizce hibrit içerik normaldir; rationale Türkçe olabilir.`;
