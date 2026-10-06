/**
 * DISTILLER RoleBrief seed.
 *
 * Çalıştırma: pnpm tsx prisma/seeds/seed-distiller-rolebrief.ts
 *
 * Idempotent: var olan DISTILLER RoleBrief'i günceller.
 * CLAUDE.md §8: model adı yok — hangi motor atanacağı admin /pr/yonet/agent-roles'tan belirlenir.
 */

import { PrismaClient } from "@prisma/client";

// Inlined to keep seed script self-contained (no src/ dependency on server)
const DISTILLER_SYSTEM_PROMPT_V1 = `ÇIKTI KURALI (İHLAL EDİLEMEZ):
Sadece ve yalnızca ham JSON döndür. İlk karakter { olmalı.
Hiçbir analiz paragrafı, açıklama cümlesi, düşünce bloğu veya JSON dışı metin yazma.

Sen bir "Prompt Engineering Distiller"sın. Görevin: verilen ham kaynak metnini analiz edip, promtexpress.com'un öğrenme tabanını zenginleştirecek yüksek kaliteli "distillation proposal"lar üretmek.

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
{
  "domainSlug": "<slug veya null>",
  "modality": "text" | "code" | "image" | "video" | "audio" | "music",
  "title": "<başlık>",
  "promptText": "<en az 20 karakter>",
  "notes": "<opsiyonel>"
}

modality KURALI: Kaynak metnin hangi modalite için prompt mühendisliğini öğrettiğini belirle.
- Genel/text yazma talimatı → "text"
- Kod üretim/programlama promtu → "code"
- Image/Midjourney/DALL-E/Stable Diffusion → "image"
- Sora/Runway/video üretim → "video"
- TTS/podcast/ses → "audio"
- Suno/Udio/müzik üretim → "music"
Belirsizse "text" varsayılan kabul edilir.

## Kurallar

1. sourceQuotes.text değeri ham metinde SUBSTRING olarak AYNEN geçmek ZORUNDA. Parafraz, özet, çeviri YASAK.
2. Proposal üretemiyorsan boş dizi döndür: { "proposals": [] }
3. Kalite > Miktar: 3 güçlü proposal, 10 zayıftan iyidir.
4. Hardcode model adı (claude-*, gpt-*, gemini-*) proposal içinde YASAK.
5. Türkçe/İngilizce hibrit içerik normaldir; rationale Türkçe olabilir.`;

const db = new PrismaClient();

const DISTILLER_OUTPUT_SCHEMA = {
  type: "object",
  required: ["proposals"],
  properties: {
    proposals: {
      type: "array",
      items: {
        type: "object",
        required: ["type", "rationale", "sourceQuotes", "payload"],
        properties: {
          type: { type: "string", enum: ["CONSTITUTION_UPDATE", "PERSONA_UPDATE", "ANTIPATTERN", "EXEMPLAR"] },
          targetSlug: { type: ["string", "null"] },
          rationale: { type: "string", minLength: 20 },
          sourceQuotes: {
            type: "array",
            minItems: 1,
            items: {
              type: "object",
              required: ["text"],
              properties: {
                text: { type: "string", minLength: 10 },
                contextHint: { type: "string" },
              },
            },
          },
          payload: { type: "object" },
        },
      },
    },
  },
};

// Few-shot exemplars: Faz 3A (technical layer) + Faz 3B (domain layer)
const DISTILLER_EXEMPLARS = [
  // === FAZ 3A: Technical Layer ===
  {
    input:
      "Chain-of-thought prompting enables models to decompose complex problems into intermediate reasoning steps. Studies show 3-10x accuracy gains on arithmetic and commonsense reasoning tasks when models are asked to 'think step by step'.",
    output: {
      proposals: [
        {
          type: "CONSTITUTION_UPDATE",
          rationale:
            "CoT tekniği complex görevlerde doğruluğu artırır; sistemin synthesizer'ı bunu varsayılan olarak kullanmalı.",
          sourceQuotes: [
            {
              text: "Chain-of-thought prompting enables models to decompose complex problems into intermediate reasoning steps",
            },
          ],
          payload: {
            versionLabel: "v-cot-principle",
            bodyMarkdown:
              "## Chain-of-Thought İlkesi\nKarmaşık görevlerde adım adım düşünmeyi teşvik eden cümleler ekle. 'Önce analiz et, sonra üret' yaklaşımı benimse.",
            changelogNote: "CoT ilkesi eklendi — The Prompt Report 2024 bulgusu",
          },
        },
      ],
    },
  },
  {
    input:
      "A common mistake is asking the model to do too many things in a single turn: 'Write a poem, summarize it, translate it to French, and rate it on a scale of 1-10.' This leads to incomplete outputs.",
    output: {
      proposals: [
        {
          type: "ANTIPATTERN",
          rationale: "Tek prompt'ta çok fazla görev verilmesi kaliteyi düşürür; bu bir anti-pattern.",
          sourceQuotes: [{ text: "asking the model to do too many things in a single turn" }],
          payload: {
            domainSlug: null,
            pattern: "tek prompt'ta 3'ten fazla birbirinden bağımsız görev",
            isRegex: false,
            severity: "warn",
            rationale:
              "Tek turda aşırı yük verilmesi çıktı kalitesini düşürür; görevler ayrı prompt'lara bölünmeli.",
          },
        },
      ],
    },
  },
  {
    input:
      "ReAct combines reasoning traces and actions: the model alternates between 'Thought: ...', 'Action: ...', 'Observation: ...' steps to solve tasks requiring external tool use.",
    output: {
      proposals: [
        {
          type: "EXEMPLAR",
          rationale: "ReAct pattern agent görevleri için iyi bir exemplar oluşturur.",
          sourceQuotes: [{ text: "combines reasoning traces and actions" }],
          payload: {
            domainSlug: "developer",
            modality: "text",
            title: "ReAct — Düşün-Hareket Et-Gözlemle",
            promptText:
              "Görevi çözmek için şu adımları izle:\nDüşünce: [ne yapacağını açıkla]\nAksiyon: [hangi aracı/adımı kullanacaksın]\nGözlem: [sonucu değerlendir]\n[Hedefe ulaşana kadar tekrarla]",
            notes: "ReAct (Reasoning+Acting) — ICLR 2023",
          },
        },
      ],
    },
  },
  // === FAZ 3B: Domain Layer ===
  {
    input:
      "Developers use prompts for code generation, debugging, architecture review, and documentation. Common frameworks: SOLID principles, DRY, design patterns. Key jargon: refactoring, CI/CD, API contract, unit test, dependency injection.",
    output: {
      proposals: [
        {
          type: "PERSONA_UPDATE",
          targetSlug: "developer",
          rationale:
            "Bu metin yazılım geliştirici domain'ine özgü jargon ve framework listesi içeriyor; persona body ve jargon alanları zenginleştirilebilir.",
          sourceQuotes: [
            {
              text: "Developers use prompts for code generation, debugging, architecture review",
            },
          ],
          payload: {
            domainSlug: "developer",
            name: "Yazılım Geliştirici",
            body: "Yazılım geliştiriciler prompts kullanarak kod üretimi, hata ayıklama, mimari inceleme ve dokümantasyon yapar. SOLID, DRY prensiplerini ve tasarım kalıplarını referans alır.",
            jargon: ["refactoring", "CI/CD", "API contract", "unit test", "dependency injection", "code review"],
            frameworks: ["SOLID", "DRY", "YAGNI", "Clean Architecture", "Design Patterns"],
            antiPatterns: ["Vague problem description", "Missing error context", "No example input/output"],
          },
        },
      ],
    },
  },
  {
    input:
      "Marketing professionals use AI for copywriting, campaign ideation, A/B test variants, SEO content, and audience segmentation. Key metrics: CTR, conversion rate, ROAS, CAC, LTV.",
    output: {
      proposals: [
        {
          type: "PERSONA_UPDATE",
          targetSlug: "marketer",
          rationale:
            "Pazarlama profesyoneli domain jargonu ve framework'leri bu metinden çıkarılabilir.",
          sourceQuotes: [
            {
              text: "Marketing professionals use AI for copywriting, campaign ideation, A/B test variants",
            },
          ],
          payload: {
            domainSlug: "marketer",
            name: "Pazarlama Uzmanı",
            body: "Pazarlama uzmanları AI'ı reklam metni yazımı, kampanya fikirleri, A/B test varyantları ve SEO içerik üretimi için kullanır.",
            jargon: ["CTR", "conversion rate", "ROAS", "CAC", "LTV", "funnel", "CTA", "segmentation"],
            frameworks: ["AIDA", "PAS (Problem-Agitate-Solution)", "4P's", "Jobs-to-be-Done"],
            antiPatterns: [
              "Generic copy without target audience",
              "Missing CTA",
              "No brand voice specification",
            ],
          },
        },
      ],
    },
  },
  {
    input:
      "For legal professionals, prompt engineering requires precision: specify jurisdiction, case type, and desired output format (memo, brief, analysis). Ambiguity is a professional liability.",
    output: {
      proposals: [
        {
          type: "EXEMPLAR",
          rationale: "Hukuk domain'i için spesifik bir prompt template örneği library'e eklenebilir.",
          sourceQuotes: [{ text: "specify jurisdiction, case type, and desired output format" }],
          payload: {
            domainSlug: "legal",
            modality: "text",
            title: "Hukuki Analiz Talebi",
            promptText:
              "Yargı bölgesi: [ÜLKE/BÖLGE]\nDava türü: [KONU]\nTalep: Aşağıdaki durumu [MEMO/ÖZET/ANALİZ] formatında değerlendir.\nSomut durum: [AÇIKLAMA]\nÇıktıda belirt: ilgili mevzuat, emsal kararlar, risk analizi.",
            notes: "Hukuki disclaimer: Bu çıktı danışmanlık değildir.",
          },
        },
      ],
    },
  },
  // === FAZ 3C: Model Layer (Provider Quirks) ===
  {
    input:
      "When using Claude, avoid markdown inside XML tags — nested formatting breaks the parser. Instead, use plain text within <tag> blocks and reserve markdown for the outer response.",
    output: {
      proposals: [
        {
          type: "ANTIPATTERN",
          rationale: "Claude XML tag içinde markdown kullanımı parse hatasına yol açar — bu provider-spesifik bir anti-pattern.",
          sourceQuotes: [{ text: "avoid markdown inside XML tags — nested formatting breaks the parser" }],
          payload: {
            domainSlug: null,
            pattern: "XML tag içinde markdown başlık veya liste",
            isRegex: false,
            severity: "warn",
            rationale:
              "Claude XML tag'lerini strict parse eder; içinde nested markdown kullanımı beklenmedik çıktıya yol açar.",
          },
        },
      ],
    },
  },
  {
    input:
      "Structured outputs — JSON mode, XML blocks, markdown headers — consistently outperform unstructured prose when the downstream task involves parsing, code generation, or data extraction.",
    output: {
      proposals: [
        {
          type: "CONSTITUTION_UPDATE",
          rationale: "Yapılandırılmış çıktı formatları downstream işleme için kritik; Constitution bu kuralı içermeli.",
          sourceQuotes: [
            {
              text: "Structured outputs — JSON mode, XML blocks, markdown headers — consistently outperform unstructured prose",
            },
          ],
          payload: {
            versionLabel: "v-structured-output",
            bodyMarkdown:
              "## Yapılandırılmış Çıktı İlkesi\nParsing, kod üretimi veya veri çıkarımı gerektiren görevlerde her zaman yapılandırılmış format talep et (JSON, XML, markdown tablo). Prose tercih etme.",
            changelogNote: "Structured output ilkesi eklendi",
          },
        },
      ],
    },
  },
  // === FAZ 3D: Quality Layer (Rubric + AntiPattern) ===
  {
    input:
      "The most effective prompts share five qualities: they are clear about the task, specific in constraints, provide sufficient context, define the expected output format, and use template variables for reusability.",
    output: {
      proposals: [
        {
          type: "CONSTITUTION_UPDATE",
          rationale: "5 kalite kriteri Constitution'a eklenmeli; synthesizer her üretimde bu kriterleri kontrol etmeli.",
          sourceQuotes: [
            {
              text: "clear about the task, specific in constraints, provide sufficient context, define the expected output format, and use template variables",
            },
          ],
          payload: {
            versionLabel: "v-quality-rubric",
            bodyMarkdown:
              "## Kalite Kriterleri\n1. Netlik: Görev açık mı?\n2. Spesifiklik: Kısıtlar belirtilmiş mi?\n3. Bağlam: Yeterli background var mı?\n4. Çıktı Tanımı: Format/uzunluk/ton net mi?\n5. Yeniden Kullanılabilirlik: Template değişkenler var mı?",
            changelogNote: "5-kriter kalite rubric eklendi",
          },
        },
      ],
    },
  },
  {
    input:
      "Phrases like 'write it well', 'make it good', or 'do your best' without concrete criteria leave the model guessing. Provide measurable quality indicators: word count, tone (formal/casual), target audience, format.",
    output: {
      proposals: [
        {
          type: "ANTIPATTERN",
          rationale: "Ölçüsüz kalite talepleri modeli belirsizliğe iter; bu yaygın bir anti-pattern.",
          sourceQuotes: [
            { text: "write it well', 'make it good', or 'do your best' without concrete criteria" },
          ],
          payload: {
            domainSlug: null,
            pattern: "(yaz|write).{0,30}(iyi|güzel|en iyi|well|good|best)",
            isRegex: true,
            severity: "warn",
            rationale:
              "Soyut kalite talepleri yerine ölçülebilir kriterler ver: kelime sayısı, ton, hedef kitle, format.",
          },
        },
      ],
    },
  },
];

async function main() {
  const existing = await db.roleBrief.findFirst({ where: { roleSlug: "DISTILLER" } });

  if (existing) {
    await db.roleBrief.update({
      where: { id: existing.id },
      data: {
        version: "v6",
        systemPrompt: DISTILLER_SYSTEM_PROMPT_V1,
        outputSchema: DISTILLER_OUTPUT_SCHEMA,
        exemplars: DISTILLER_EXEMPLARS,
        isActive: true,
        updatedBy: "seed-distiller-rolebrief-v6",
      },
    });
    console.log("DISTILLER RoleBrief updated to v6 (id:", existing.id + ")");
  } else {
    const created = await db.roleBrief.create({
      data: {
        roleSlug: "DISTILLER",
        version: "v6",
        systemPrompt: DISTILLER_SYSTEM_PROMPT_V1,
        outputSchema: DISTILLER_OUTPUT_SCHEMA,
        exemplars: DISTILLER_EXEMPLARS,
        isActive: true,
        updatedBy: "seed-distiller-rolebrief-v6",
      },
    });
    console.log("DISTILLER RoleBrief created at v6 (id:", created.id + ")");
  }

  await db.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
