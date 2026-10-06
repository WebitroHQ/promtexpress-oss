/**
 * Pipeline JSON-repair layer (engine-agnostic).
 *
 * Purpose: when a layer's first-pass output (intent/synth/safety) cannot be
 * parsed into the required schema, we run ONE more call to the SAME adapter
 * with a strict, generic instruction asking for JSON only. This is provider-
 * agnostic: the prompt does not name any model or rely on provider quirks.
 *
 * Token cost: zero on the healthy path. On parse failure, ~200-500 extra
 * tokens (one short repair turn). Mission §1 accepts this cost in exchange
 * for "%100 doğruluk" — engine-agnostic guarantee.
 *
 * NOT a retry-on-error wrapper: if the adapter throws (network/auth),
 * propagate. Repair only triggers on parse-failure of a successful response.
 */
import type { EngineAdapter } from "@/lib/engines/types";
import { extractJson } from "./json-extract";

export interface RepairArgs {
  adapter: EngineAdapter;
  modelId: string;
  /** Schema the output must conform to (JSON Schema or generic shape). Stringified into prompt. */
  schema: Record<string, unknown> | undefined;
  /** Original system prompt sent in the failing call (preserved for context). */
  originalSystemPrompt: string;
  /** Original user message. */
  originalUserMessage: string;
  /** The text we couldn't parse (truncated and shown back to the model). */
  failedOutput: string;
  /** Layer label for logging. */
  layer: 2 | 4 | 5;
  /** Output token budget for the repair call. */
  maxTokens?: number;
}

/**
 * Returns parsed JSON of type T on success, or null if even the repair pass
 * fails. Caller decides whether to throw PipelineError or accept null.
 */
export async function repairJson<T = unknown>(args: RepairArgs): Promise<T | null> {
  const start = Date.now();
  const truncated = args.failedOutput.slice(0, 800);
  const schemaText = args.schema ? JSON.stringify(args.schema) : "(no schema; emit a single JSON object)";

  const repairUserMessage =
    args.originalUserMessage +
    "\n\n---\n" +
    "SYSTEM REPAIR REQUEST: Your previous response failed JSON parsing.\n" +
    "Required JSON Schema:\n" +
    schemaText +
    "\n\nYour previous (invalid) output (truncated):\n" +
    truncated +
    "\n\nOutput ONLY a valid JSON object that satisfies the schema above. " +
    "No markdown fences, no prose, no thinking. Start with { and end with }.";

  try {
    const out = await args.adapter.generate({
      systemPrompt: args.originalSystemPrompt,
      userMessage: repairUserMessage,
      maxTokens: args.maxTokens ?? 1024,
      temperature: 0.1,
      modelId: args.modelId,
      responseFormat: "json",
      outputSchema: args.schema,
    });
    const parsed = extractJson<T>(out.text);
    const elapsed = Date.now() - start;
    if (parsed !== null) {
      console.error("[json-repair] success", {
        layer: args.layer,
        provider: args.adapter.provider,
        modelId: args.modelId,
        elapsed,
        completionTokens: out.usage.completionTokens,
        adapterSelfRepairUsed: out.selfRepairUsed === true,
      });
      return parsed;
    }
    console.error("[json-repair] still unparseable after repair pass", {
      layer: args.layer,
      provider: args.adapter.provider,
      modelId: args.modelId,
      elapsed,
      outputLen: out.text.length,
      preview: out.text.slice(0, 300),
    });
    return null;
  } catch (err) {
    console.error("[json-repair] adapter threw during repair", {
      layer: args.layer,
      provider: args.adapter.provider,
      modelId: args.modelId,
      elapsed: Date.now() - start,
      message: err instanceof Error ? err.message : String(err),
    });
    return null;
  }
}
