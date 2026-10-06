import OpenAI from "openai";
import { EngineAdapter, EngineError, GenerateInput, GenerateOutput } from "./types";

/**
 * OpenAI adapter.
 *
 * Direktif #10 — Schema-agnostic.
 *   - input.outputSchema varsa  → response_format: { type: "json_schema", json_schema: { ..., strict: true } }
 *   - yoksa input.responseFormat="json" → response_format: { type: "json_object" } (permisif)
 *   - hiçbiri yoksa             → düz metin
 *
 * `json_schema` strict mode (gpt-4o, gpt-4.1+) modelin tam olarak şemaya
 * uygun JSON üretmesini garanti eder. Eski modeller json_schema desteklemezse
 * upstream 400 atar; bu durumda caller (synth/distill) retry chain'inde
 * permisif moda düşer (mevcut davranış).
 */
export class OpenAIAdapter implements EngineAdapter {
  readonly provider = "openai";

  constructor(
    private readonly apiKey: string,
    private readonly defaultModel: string = "gpt-4o-2024-11-20",
  ) {}

  async generate(input: GenerateInput): Promise<GenerateOutput> {
    const client = new OpenAI({ apiKey: this.apiKey });
    const start = Date.now();

    let responseFormat: OpenAI.ResponseFormatJSONSchema | OpenAI.ResponseFormatJSONObject | undefined;
    if (input.responseFormat === "json") {
      if (input.outputSchema) {
        responseFormat = {
          type: "json_schema" as const,
          json_schema: {
            name: "structured_output",
            schema: input.outputSchema as Record<string, unknown>,
            strict: true,
          },
        };
      } else {
        responseFormat = { type: "json_object" as const };
      }
    }

    try {
      const response = await client.chat.completions.create(
        {
          model: input.modelId ?? this.defaultModel,
          max_tokens: input.maxTokens ?? 1024,
          temperature: input.temperature ?? 0.7,
          messages: [
            { role: "system", content: input.systemPrompt },
            { role: "user", content: input.userMessage },
          ],
          ...(responseFormat ? { response_format: responseFormat } : {}),
        },
        // 2026-05-12 (Garantili Teslimat v2) — thread abort signal through.
        // OpenAI SDK 4.x+ honors `signal` as the second argument's request option.
        input.signal ? { signal: input.signal } : undefined,
      );

      const text = response.choices[0]?.message?.content ?? "";

      if (input.responseFormat === "json" && text.trim().length === 0) {
        console.error("[openai] empty content in JSON mode", {
          modelId: input.modelId ?? this.defaultModel,
          finishReason: response.choices[0]?.finish_reason,
        });
      }

      return {
        text,
        usage: {
          promptTokens: response.usage?.prompt_tokens ?? 0,
          completionTokens: response.usage?.completion_tokens ?? 0,
          totalTokens: response.usage?.total_tokens ?? 0,
        },
        latencyMs: Date.now() - start,
        providerRequestId: response.id,
        selfRepairUsed: false,
      };
    } catch (err) {
      throw new EngineError(
        err instanceof Error ? err.message : "OpenAI upstream error",
        this.provider,
        err instanceof OpenAI.APIError ? err.status : undefined,
        { cause: err },
      );
    }
  }
}
