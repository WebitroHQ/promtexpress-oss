import OpenAI from "openai";
import { EngineAdapter, EngineError, GenerateInput, GenerateOutput } from "./types";

/**
 * Verilen metinde ilk balanced { ... } veya [ ... ] bloğunu bulup string olarak
 * döndürür. JSON.parse ile doğrulanır; geçerli değilse null. String literali ve
 * escape karakterlerini dikkate alır.
 */
function extractFirstJsonBlock(s: string): string | null {
  for (let i = 0; i < s.length; i++) {
    const ch = s[i];
    if (ch !== "{" && ch !== "[") continue;
    const close = ch === "{" ? "}" : "]";
    let depth = 0;
    let inString = false;
    let escape = false;
    for (let j = i; j < s.length; j++) {
      const c = s[j];
      if (escape) {
        escape = false;
        continue;
      }
      if (inString) {
        if (c === "\\") escape = true;
        else if (c === '"') inString = false;
        continue;
      }
      if (c === '"') {
        inString = true;
        continue;
      }
      if (c === ch) depth++;
      else if (c === close) {
        depth--;
        if (depth === 0) {
          const candidate = s.slice(i, j + 1);
          try {
            JSON.parse(candidate);
            return candidate;
          } catch {
            break;
          }
        }
      }
    }
  }
  return null;
}

/**
 * Deepseek adapter.
 *
 * Deepseek exposes an OpenAI-compatible wire format for /chat/completions,
 * so we re-use the `openai` npm package as a thin HTTP client by overriding
 * `baseURL`. The API key here is the user's Deepseek account key (sk-...),
 * NOT an OpenAI key. Keys are stored per-engine in AiEngine.encryptedKey.
 *
 * Base URL: https://api.deepseek.com
 * Models:
 *   - deepseek-chat       → V3 (general)
 *   - deepseek-reasoner   → R1 (reasoning, returns reasoning_content)
 *   - deepseek-v4-flash   → V4 hybrid (small + reasoning)
 *   - deepseek-v4-pro     → V4 hybrid (large + reasoning)
 *
 * REASONING NOTE:
 *   V4 + R1 modelleri `message.content` boş bırakıp `message.reasoning_content`'a
 *   uzun bir düşünce zinciri yazabilir. content boşsa reasoning_content'tan
 *   ilk JSON bloğunu çıkarmaya düşeriz; bu da boşsa raw reasoning'i döneriz
 *   (downstream JSON parser ondan çıkarır).
 *
 * Docs: https://api-docs.deepseek.com
 */
export class DeepseekAdapter implements EngineAdapter {
  readonly provider = "deepseek";

  constructor(
    private readonly apiKey: string,
    private readonly defaultModel: string = "deepseek-chat",
  ) {}

  async generate(input: GenerateInput): Promise<GenerateOutput> {
    const client = new OpenAI({
      apiKey: this.apiKey,
      baseURL: "https://api.deepseek.com",
      timeout: 60_000,
      maxRetries: 1,
    });
    const start = Date.now();

    try {
      // Direktif #10 — DeepSeek API'si şu an json_schema strict mode'u resmi
      // dokümantasyonda garanti etmiyor; en güvenli motor-bağımsız yol:
      // response_format=json_object + system prompt'a outputSchema'yı ekle.
      // (Caller `composeSystemPromptWithExemplars` üzerinden few-shot da geçirir;
      // schema enforcement böylece prompt-driven olur.)
      const wantsJson = input.responseFormat === "json";
      const response = await client.chat.completions.create(
        {
          model: input.modelId ?? this.defaultModel,
          max_tokens: input.maxTokens ?? 1024,
          temperature: input.temperature ?? 0.7,
          messages: [
            { role: "system", content: input.systemPrompt },
            { role: "user", content: input.userMessage },
          ],
          ...(wantsJson ? { response_format: { type: "json_object" as const } } : {}),
        },
        // 2026-05-12 (Garantili Teslimat v2) — abort signal threading.
        // DeepSeek uses OpenAI-compatible SDK; same `signal` option.
        input.signal ? { signal: input.signal } : undefined,
      );

      const msg = response.choices[0]?.message as
        | { content?: string | null; reasoning_content?: string | null }
        | undefined;
      const content = (msg?.content ?? "").trim();
      const reasoning = (msg?.reasoning_content ?? "").trim();

      // V4 hybrid + R1 modelleri thinking'i `reasoning_content`'a, nihai cevabı
      // `content`'e yazar. JSON mode'da response_format=json_object content'in
      // valid JSON olmasını garanti eder.
      //
      // KESİN: reasoning_content asla "cevap" değildir; thinking metnidir. Eğer
      // content boş ve reasoning'de düzenli bir JSON bloğu varsa onu çıkarırız;
      // yoksa upstream hatası fırlatırız (downstream JSON parser thinking metni
      // üzerinde başarılı olamaz, "non-JSON output" log spam'ı yaratır).
      let text: string;
      let selfRepairUsed = false;
      let usage = response.usage;
      let providerRequestId = response.id;

      if (input.responseFormat === "json") {
        if (content.length > 0) {
          text = content;
        } else {
          // V4 / reasoner: content empty, reasoning_content holds prose thinking.
          // 1) try direct JSON in reasoning (some models actually emit it there)
          // 2) try first balanced JSON block in reasoning
          // 3) self-repair: fresh strict call asking for JSON only
          let candidate: string | null = null;
          if (reasoning.length > 0) {
            try {
              JSON.parse(reasoning);
              candidate = reasoning;
            } catch {
              candidate = extractFirstJsonBlock(reasoning);
            }
          }

          if (candidate) {
            text = candidate;
          } else {
            // Self-repair: strict-JSON fresh call. Adapter contract requires
            // returning best-effort parseable text in JSON mode regardless of
            // whether the underlying model is reasoning-style or chat-style.
            console.error("[deepseek] empty content in JSON mode — running self-repair", {
              modelId: input.modelId ?? this.defaultModel,
              reasoningLen: reasoning.length,
              reasoningPreview: reasoning.slice(0, 200),
            });

            const repairUserMessage =
              input.userMessage +
              "\n\nIMPORTANT: Output ONLY a single JSON object that satisfies the schema. " +
              "Do not include any thinking, preamble, or commentary. " +
              "Start your response with { and end with }.";
            const repairMaxTokens = Math.max(512, Math.floor((input.maxTokens ?? 1024) / 2));

            const repair = await client.chat.completions.create(
              {
                model: input.modelId ?? this.defaultModel,
                max_tokens: repairMaxTokens,
                temperature: 0.1,
                messages: [
                  { role: "system", content: input.systemPrompt },
                  { role: "user", content: repairUserMessage },
                ],
                response_format: { type: "json_object" as const },
              },
              input.signal ? { signal: input.signal } : undefined,
            );
            selfRepairUsed = true;
            usage = repair.usage;
            providerRequestId = repair.id;

            const repairMsg = repair.choices[0]?.message as
              | { content?: string | null; reasoning_content?: string | null }
              | undefined;
            const repairContent = (repairMsg?.content ?? "").trim();
            const repairReasoning = (repairMsg?.reasoning_content ?? "").trim();

            if (repairContent.length > 0) {
              text = repairContent;
            } else if (repairReasoning.length > 0) {
              // INVARIANT: reasoning_content is the model's private chain-of-thought
              // and MUST NEVER be served as `text` to downstream stages or the user.
              // If a parseable JSON block lives inside the reasoning, accept it;
              // otherwise return empty string so the upstream pipeline (json-repair
              // + engine-fallback chain in modality-engine.ts) can try the next
              // engine. Returning the raw reasoning here was the leak channel that
              // surfaced the model's monologue ("We are the Synthesizer...") as a
              // user-facing prompt (incident: 2026-05-05 Suno/Semicenk).
              const extracted = extractFirstJsonBlock(repairReasoning);
              text = extracted ?? "";
            } else {
              text = ""; // pipeline json-repair will catch the empty contract
            }

            console.error("[deepseek] self-repair complete", {
              modelId: input.modelId ?? this.defaultModel,
              gotContent: repairContent.length,
              gotReasoning: repairReasoning.length,
              outLen: text.length,
            });
          }
        }
      } else {
        // Free-text mode.
        //
        // INVARIANT: reasoning_content is the model's private chain-of-thought
        // and MUST NEVER be served as `text`. This protects against the
        // 2026-05-05 Suno leak (the model's monologue "We are the Synthesizer…"
        // surfaced as a user-facing prompt) and is enforced for ALL response
        // formats, not only JSON mode.
        //
        // 2026-05-11 — When content is empty but reasoning_content is dense,
        // the model burned its budget on hidden thinking before reaching the
        // emit step. JSON mode already runs a self-repair pass for this
        // exact failure (see the if-branch above); mirror it here so that the
        // synthesizer plain-text path (4-synthesizer.ts) gets the same
        // treatment instead of falling straight to the engine-fallback chain.
        // The repair call asks the model to skip thinking and double the
        // token budget so emission has room to land.
        if (content.length > 0) {
          text = content;
        } else if (reasoning.length > 0) {
          console.error("[deepseek] empty content in free-text mode — running self-repair", {
            modelId: input.modelId ?? this.defaultModel,
            reasoningLen: reasoning.length,
            reasoningPreview: reasoning.slice(0, 200),
          });

          const repairUserMessage =
            input.userMessage +
            "\n\nIMPORTANT: Output ONLY your final answer. " +
            "Do not include any thinking, preamble, analysis, or commentary.";
          const repairMaxTokens = Math.max(512, Math.ceil((input.maxTokens ?? 1024) * 2));

          const repair = await client.chat.completions.create(
            {
              model: input.modelId ?? this.defaultModel,
              max_tokens: repairMaxTokens,
              temperature: 0.1,
              messages: [
                { role: "system", content: input.systemPrompt },
                { role: "user", content: repairUserMessage },
              ],
            },
            input.signal ? { signal: input.signal } : undefined,
          );
          selfRepairUsed = true;
          usage = repair.usage;
          providerRequestId = repair.id;

          const repairMsg = repair.choices[0]?.message as
            | { content?: string | null; reasoning_content?: string | null }
            | undefined;
          const repairContent = (repairMsg?.content ?? "").trim();
          const repairReasoning = (repairMsg?.reasoning_content ?? "").trim();

          // INVARIANT: do NOT extract or return reasoning_content in free-text
          // mode — there is no JSON envelope to unwrap, so any return of
          // repairReasoning would be a direct leak of the model's monologue.
          // If repair also produced empty content, return "" so the upstream
          // pipeline (synthesizer empty/too-short gate) triggers the engine
          // fallback chain on the next engine in the admin's mapping.
          text = repairContent;

          console.error("[deepseek] free-text self-repair complete", {
            modelId: input.modelId ?? this.defaultModel,
            gotContent: repairContent.length,
            gotReasoning: repairReasoning.length,
            outLen: text.length,
          });
        } else {
          text = "";
        }
      }

      return {
        text,
        usage: {
          promptTokens: usage?.prompt_tokens ?? 0,
          completionTokens: usage?.completion_tokens ?? 0,
          totalTokens: usage?.total_tokens ?? 0,
        },
        latencyMs: Date.now() - start,
        providerRequestId,
        selfRepairUsed,
      };
    } catch (err) {
      throw new EngineError(
        err instanceof Error ? err.message : "Deepseek upstream error",
        this.provider,
        err instanceof OpenAI.APIError ? err.status : undefined,
        { cause: err },
      );
    }
  }
}
