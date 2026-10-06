/**
 * Common interface for AI engine providers.
 *
 * Adapters live next to this file (anthropic.ts, openai.ts, google.ts).
 * The registry (registry.ts) maps a DB AiEngine row to the right adapter.
 */

export interface GenerateInput {
  /** The system prompt assembled from a template + user variables */
  systemPrompt: string;
  /** The user-facing intent text */
  userMessage: string;
  /** Hard upper bound on output length (model-specific units) */
  maxTokens?: number;
  /** 0-1; lower = more deterministic */
  temperature?: number;
  /** Free-form metadata for the adapter (modelId override etc.) */
  modelId?: string;
  /**
   * Structured output zorlaması.
   * - "json"   → provider'ın yerel JSON modu / tool-use kullanılır; çıktı .text alanına stringify edilmiş JSON yazılır.
   * - undefined → serbest metin (default).
   * Provider model JSON modu desteklemiyorsa adapter graceful fallback yapar (text mode + sıkı prompt).
   */
  responseFormat?: "json";
  /**
   * Direktif #10 — Motor-bağımsız dinamik schema enforcement.
   * Caller (synthesizer/distiller/intent-analyzer/safety-checker) `RoleBrief.outputSchema`'yı
   * buraya geçirir. Adapter, provider'ın native şema enforcement'ını kullanır:
   *   - Anthropic: tool-use `input_schema`
   *   - OpenAI:    `response_format: { type: "json_schema", json_schema: { name, schema, strict: true } }`
   *   - Google:    `responseSchema`
   *   - DeepSeek/OpenRouter: response_format json_object (schema instruction prompt'ta)
   * Yoksa adapter `responseFormat: "json"` ile permisif moda düşer.
   * KESİN: Adapter'larda hardcoded schema YASAK — schema her zaman buradan gelir.
   */
  outputSchema?: Record<string, unknown>;
  /**
   * 2026-05-12 (Garantili Teslimat v2) — abort signal threading.
   * Adapters MUST forward this to the underlying SDK/fetch so a per-engine
   * timeout in `runWithEngineFallback` actually cancels the in-flight HTTP
   * request. Without it, the chain wall-clock budget is unenforceable and
   * the outer Promise.race timeout fires (the bug this contract solves).
   *
   * SDK paths verified (package.json — sürümler):
   *   - openai@^6.x:                client.*.create({ ..., signal })
   *   - @anthropic-ai/sdk@^0.91.x:  client.messages.create({ ..., signal })
   *   - @google/generative-ai@^0.24:model.generateContent(req, { signal })
   *   - deepseek (OpenAI-compatible): same as openai
   *   - openrouter (fetch-based):   fetch(url, { signal })
   *
   * When aborted, adapters MUST throw an Error (typically AbortError) so the
   * caller can move to the next engine. They MUST NOT swallow the abort.
   */
  signal?: AbortSignal;
}

export interface GenerateOutput {
  /** Generated text (single completion) */
  text: string;
  /** Tokens consumed for billing & analytics */
  usage: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
  /** ms wall-clock for the upstream call */
  latencyMs: number;
  /** Provider-side request id for debugging, if available */
  providerRequestId?: string;
  /**
   * True when the adapter ran a provider-specific self-repair pass to fulfill
   * the JSON contract (e.g. reasoning model returned empty content; adapter
   * issued a fresh strict-JSON call). Diagnostic only.
   */
  selfRepairUsed?: boolean;
}

export interface EngineAdapter {
  /** Provider name; matches AiEngine.provider in DB */
  readonly provider: string;
  generate(input: GenerateInput): Promise<GenerateOutput>;
}

/**
 * Thrown for any upstream failure. Pipeline catches this and refunds credits.
 * The original error is on .cause for debugging.
 */
export class EngineError extends Error {
  constructor(
    message: string,
    public readonly provider: string,
    public readonly statusCode?: number,
    options?: { cause?: unknown },
  ) {
    super(message, options);
    this.name = "EngineError";
  }
}
