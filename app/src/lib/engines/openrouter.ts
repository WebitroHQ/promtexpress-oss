import OpenAI from "openai";
import { EngineAdapter, EngineError, GenerateInput, GenerateOutput } from "./types";

export class OpenRouterAdapter implements EngineAdapter {
  readonly provider = "openrouter";

  constructor(
    private readonly apiKey: string,
    private readonly defaultModel: string,
  ) {}

  async generate(input: GenerateInput): Promise<GenerateOutput> {
    const client = new OpenAI({
      apiKey: this.apiKey,
      baseURL: "https://openrouter.ai/api/v1",
      defaultHeaders: {
        "HTTP-Referer": "https://promtexpress.com",
        "X-Title": "PromptExpress",
      },
    });
    const start = Date.now();

    const baseParams = {
      model: input.modelId ?? this.defaultModel,
      max_tokens: input.maxTokens ?? 1024,
      temperature: input.temperature ?? 0.7,
      messages: [
        { role: "system" as const, content: input.systemPrompt },
        { role: "user" as const, content: input.userMessage },
      ],
    };

    // OpenRouter'ın model evreni geniş; bazı modellerde response_format desteği yok.
    // Direktif #10 — outputSchema varsa json_schema strict mode dene; underlying
    // model desteklemiyorsa permisif json_object'e düş; o da olmazsa text mode.
    const wantsJson = input.responseFormat === "json";
    const primaryResponseFormat = wantsJson
      ? input.outputSchema
        ? {
            type: "json_schema" as const,
            json_schema: {
              name: "structured_output",
              schema: input.outputSchema as Record<string, unknown>,
              strict: true,
            },
          }
        : { type: "json_object" as const }
      : undefined;

    // 2026-05-12 (Garantili Teslimat v2) — abort signal threading.
    // OpenRouter uses OpenAI-compatible SDK over fetch; `signal` is honored
    // by the underlying fetch implementation.
    const requestOptions = input.signal ? { signal: input.signal } : undefined;

    try {
      const response = await client.chat.completions.create(
        {
          ...baseParams,
          ...(primaryResponseFormat ? { response_format: primaryResponseFormat } : {}),
        },
        requestOptions,
      );

      const text = response.choices[0]?.message?.content ?? "";

      if (wantsJson && text.trim().length === 0) {
        console.error("[openrouter] empty content in JSON mode", {
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
      // 4xx unsupported response_format hatasında text mode'a düş.
      const status = err instanceof OpenAI.APIError ? err.status : undefined;
      const msg = err instanceof Error ? err.message : "";
      const looksUnsupported =
        wantsJson &&
        ((status !== undefined && status >= 400 && status < 500) ||
          /response[_ ]format|json|tool|schema/i.test(msg));

      if (looksUnsupported) {
        try {
          const fallback = await client.chat.completions.create(baseParams, requestOptions);
          const text = fallback.choices[0]?.message?.content ?? "";
          return {
            text,
            usage: {
              promptTokens: fallback.usage?.prompt_tokens ?? 0,
              completionTokens: fallback.usage?.completion_tokens ?? 0,
              totalTokens: fallback.usage?.total_tokens ?? 0,
            },
            latencyMs: Date.now() - start,
            providerRequestId: fallback.id,
            selfRepairUsed: true,
          };
        } catch (fallbackErr) {
          throw new EngineError(
            fallbackErr instanceof Error ? fallbackErr.message : "OpenRouter fallback error",
            this.provider,
            fallbackErr instanceof OpenAI.APIError ? fallbackErr.status : undefined,
            { cause: fallbackErr },
          );
        }
      }

      throw new EngineError(
        err instanceof Error ? err.message : "OpenRouter upstream error",
        this.provider,
        status,
        { cause: err },
      );
    }
  }
}
