import Anthropic from "@anthropic-ai/sdk";
import { EngineAdapter, EngineError, GenerateInput, GenerateOutput } from "./types";

/**
 * Anthropic adapter.
 *
 * Direktif #10 — Schema-agnostic. Caller `outputSchema` geçtiğinde tool-use ile
 * o şema zorlanır. Geçmediğinde response_format=json talep edilirse permisif
 * generic obje şeması ile tool-use yapılır (prompt-driven JSON discipline).
 *
 * Tool-use, Anthropic'te JSON çıktısının en güvenilir yoludur — `tool_choice`
 * model adına `tool_use` block'unu zorlar.
 */
export class AnthropicAdapter implements EngineAdapter {
  readonly provider = "anthropic";

  constructor(
    private readonly apiKey: string,
    private readonly defaultModel: string = "claude-sonnet-4-20250514",
  ) {}

  async generate(input: GenerateInput): Promise<GenerateOutput> {
    const client = new Anthropic({ apiKey: this.apiKey });
    const start = Date.now();

    const baseRequest = {
      model: input.modelId ?? this.defaultModel,
      max_tokens: input.maxTokens ?? 1024,
      temperature: input.temperature ?? 0.7,
      system: input.systemPrompt,
      messages: [{ role: "user" as const, content: input.userMessage }],
    };

    // responseFormat="json" → tool-use ile JSON çıktı zorla.
    // Schema kaynağı (öncelik sırası):
    //   1. input.outputSchema (caller'dan geliyorsa) — Direktif #10
    //   2. permisif generic ({ type: "object" }) — caller schema vermediyse
    let requestParams: Anthropic.MessageCreateParamsNonStreaming;
    if (input.responseFormat === "json") {
      const schema = (input.outputSchema ?? { type: "object" as const }) as Record<string, unknown>;
      requestParams = {
        ...baseRequest,
        tools: [
          {
            name: "emit_json",
            description: "Emit the structured JSON response per the role's outputSchema.",
            input_schema: schema as unknown as Anthropic.Tool["input_schema"],
          },
        ],
        tool_choice: { type: "tool", name: "emit_json" },
      };
    } else {
      requestParams = baseRequest;
    }

    try {
      // 2026-05-12 (Garantili Teslimat v2) — thread abort signal.
      // Anthropic SDK 0.x honors `signal` via the request options second arg.
      const response = await client.messages.create(
        requestParams,
        input.signal ? { signal: input.signal } : undefined,
      );

      let text = "";
      if (input.responseFormat === "json") {
        const toolBlock = response.content.find(
          (b): b is Anthropic.ToolUseBlock => b.type === "tool_use" && b.name === "emit_json",
        );
        if (toolBlock) {
          text = JSON.stringify(toolBlock.input);
        } else {
          // Fallback: text bloklarından topla (tool seçimi başarısızsa)
          text = response.content
            .filter((b): b is Anthropic.TextBlock => b.type === "text")
            .map((b) => b.text)
            .join("");
        }
      } else {
        text = response.content
          .filter((b): b is Anthropic.TextBlock => b.type === "text")
          .map((b) => b.text)
          .join("");
      }

      if (input.responseFormat === "json" && text.trim().length === 0) {
        console.error("[anthropic] empty output in JSON mode (no tool_use, no text)", {
          modelId: input.modelId ?? this.defaultModel,
          stopReason: response.stop_reason,
          contentBlocks: response.content.length,
        });
      }

      return {
        text,
        usage: {
          promptTokens: response.usage.input_tokens,
          completionTokens: response.usage.output_tokens,
          totalTokens: response.usage.input_tokens + response.usage.output_tokens,
        },
        latencyMs: Date.now() - start,
        providerRequestId: response.id,
        selfRepairUsed: false,
      };
    } catch (err) {
      throw new EngineError(
        err instanceof Error ? err.message : "Anthropic upstream error",
        this.provider,
        err instanceof Anthropic.APIError ? err.status : undefined,
        { cause: err },
      );
    }
  }
}
