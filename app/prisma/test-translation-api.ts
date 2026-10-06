/**
 * Compare deepseek-v4-flash vs deepseek-v4-pro on:
 *  - short English (must be returned verbatim)
 *  - short Spanish (must be translated)
 *  - long English (must be returned verbatim, length-preserving)
 *  - long Spanish (must be translated, length-preserving)
 *
 * Reports usage tokens (reasoning_tokens included if present) and whether
 * the response was empty / matched verbatim / changed length materially.
 */
import { PrismaClient } from "@prisma/client";
import { decrypt } from "../src/lib/crypto";

const db = new PrismaClient();

const SYSTEM = [
  "You are a translation pass-through service.",
  "Rule 1: If the input text is already in English, output the EXACT same text, character-for-character. Do not paraphrase, expand, summarise, or improve.",
  "Rule 2: If the input text is in any other language, translate it into natural English while preserving meaning, structure, length, and style. Do not add or remove information.",
  "Rule 3: Output ONLY the result text. No explanations, no prefixes, no quotes, no language tags, no notes.",
].join(" ");

async function call(apiKey: string, model: string, user: string, maxTokens: number) {
  const t0 = Date.now();
  const res = await fetch("https://api.deepseek.com/v1/chat/completions", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({
      model,
      max_tokens: maxTokens,
      messages: [
        { role: "system", content: SYSTEM },
        { role: "user", content: user },
      ],
    }),
  });
  const ms = Date.now() - t0;
  const text = await res.text();
  let json: Record<string, unknown> = {};
  try {
    json = JSON.parse(text) as Record<string, unknown>;
  } catch {
    return { ms, status: res.status, content: "", reasoning: "", usage: undefined, raw: text.slice(0, 300) };
  }
  const choice = (json.choices as Array<{ message: { content: string; reasoning_content?: string } }>)?.[0];
  return {
    ms,
    status: res.status,
    content: choice?.message?.content ?? "",
    reasoning: choice?.message?.reasoning_content ?? "",
    usage: json.usage as Record<string, number> | undefined,
    raw: "",
  };
}

const SAMPLES = {
  shortEn: "I want you to act as an advertiser. Create a campaign for a new energy drink targeting young adults aged 18-30.",
  shortEs: "Hola, ¿cómo estás? Quiero que actúes como un asesor de marketing y me ayudes a crear una campaña.",
  longEn:
    "I want you to act as an advertiser. You will create a campaign to promote a product or service of your choice. You will choose a target audience, develop key messages and slogans, select the media channels for promotion, and decide on any additional activities needed to reach your goals. My first suggestion request is: I need help creating an advertising campaign for a new type of energy drink targeting young adults aged 18-30.",
  longEs:
    "Quiero que actúes como un publicista experto. Crearás una campaña para promocionar un producto o servicio de tu elección. Elegirás un público objetivo, desarrollarás mensajes clave y eslóganes, seleccionarás los canales de medios para la promoción y decidirás cualquier actividad adicional necesaria para alcanzar tus metas. Mi primera solicitud es: Necesito ayuda creando una campaña publicitaria para un nuevo tipo de bebida energética dirigida a adultos jóvenes de 18 a 30 años.",
};

async function runMatrix(apiKey: string, model: string) {
  console.log(`\n========== MODEL: ${model} ==========`);
  for (const [label, text] of Object.entries(SAMPLES)) {
    const max = Math.min(8192, Math.max(1024, Math.ceil(text.length * 1.5)));
    const r = await call(apiKey, model, text, max);
    const lengthRatio = r.content.length / text.length;
    const verdict =
      r.status !== 200
        ? `❌ HTTP ${r.status}`
        : r.content === ""
        ? "❌ EMPTY"
        : label.endsWith("En")
        ? r.content.trim() === text.trim()
          ? "✅ verbatim"
          : `⚠️  English changed (ratio ${lengthRatio.toFixed(2)})`
        : r.content.trim() === text.trim()
        ? "❌ NOT translated (returned verbatim)"
        : `✅ translated (ratio ${lengthRatio.toFixed(2)})`;
    console.log(`\n${label} [maxTokens=${max}, in=${text.length} chars]`);
    console.log(`  HTTP=${r.status} time=${r.ms}ms  verdict: ${verdict}`);
    if (r.usage) console.log(`  usage: ${JSON.stringify(r.usage)}`);
    console.log(`  output (${r.content.length} chars): ${r.content.slice(0, 160).replace(/\s+/g, " ")}${r.content.length > 160 ? "…" : ""}`);
    if (r.reasoning) console.log(`  reasoning preview: ${r.reasoning.slice(0, 120).replace(/\s+/g, " ")}…`);
    if (r.raw) console.log(`  raw: ${r.raw}`);
  }
}

async function main() {
  const setting = await db.appSetting.findUnique({
    where: { key: "translation_engine_id" },
  });
  if (!setting?.value) throw new Error("translation_engine_id not set");
  const engine = await db.aiEngine.findUnique({ where: { id: setting.value } });
  if (!engine) throw new Error("Engine not found");
  if (!engine.encryptedKey) throw new Error("Engine has no key");
  const apiKey = decrypt(engine.encryptedKey);

  console.log("Configured engine:", engine.name, `(${engine.modelId})`);

  await runMatrix(apiKey, "deepseek-v4-flash");
  await runMatrix(apiKey, "deepseek-v4-pro");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
