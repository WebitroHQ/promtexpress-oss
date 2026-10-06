import { GoogleGenerativeAI } from "@google/generative-ai";
import { EngineAdapter, EngineError, GenerateInput, GenerateOutput } from "./types";

export class GoogleAdapter implements EngineAdapter {
  readonly provider = "google";

  constructor(
    private readonly apiKey: string,
    private readonly defaultModel: string = "gemini-2.0-pro-exp",
  ) {}

  async generate(input: GenerateInput): Promise<GenerateOutput> {
    // Direktif #10 — Schema-agnostic.
    //   - outputSchema varsa → responseMimeType + responseSchema
    //   - yoksa responseFormat=json → responseMimeType only (permisif)
    //   - hiçbiri yoksa → free-text
    const wantsJson = input.responseFormat === "json";
    const jsonConfig = wantsJson
      ? {
          responseMimeType: "application/json",
          ...(input.outputSchema ? { responseSchema: input.outputSchema as object } : {}),
        }
      : {};

    const client = new GoogleGenerativeAI(this.apiKey);
    const model = client.getGenerativeModel({
      model: input.modelId ?? this.defaultModel,
      systemInstruction: input.systemPrompt,
      generationConfig: {
        maxOutputTokens: input.maxTokens ?? 1024,
        temperature: input.temperature ?? 0.7,
        ...jsonConfig,
      },
    });
    const start = Date.now();

    try {
      // 2026-05-12 (Garantili Teslimat v2) — abort signal race wrapper.
      // @google/generative-ai@^0.24 RequestOptions does NOT expose `signal`
      // (it supports only timeout/baseUrl/customHeaders/apiVersion). We
      // implement abort via Promise.race: when signal fires, the caller
      // (engine fallback) moves on; the underlying fetch leaks until it
      // completes naturally — acceptable trade-off since the response is
      // discarded anyway.
      if (input.signal?.aborted) {
        throw new EngineError("Aborted before request", this.provider, undefined);
      }
      const genPromise = model.generateContent(input.userMessage);
      const result = input.signal
        ? await Promise.race([
            genPromise,
            new Promise<never>((_, rej) => {
              input.signal!.addEventListener(
                "abort",
                () => rej(new EngineError("Aborted by per-engine timeout", "google", undefined)),
                { once: true },
              );
            }),
          ])
        : await genPromise;
      const response = result.response;
      const text = response.text();
      const usage = response.usageMetadata;

      if (input.responseFormat === "json" && text.trim().length === 0) {
        console.error("[google] empty text in JSON mode", {
          modelId: input.modelId ?? this.defaultModel,
          finishReason: response.candidates?.[0]?.finishReason,
        });
      }

      return {
        text,
        usage: {
          promptTokens: usage?.promptTokenCount ?? 0,
          completionTokens: usage?.candidatesTokenCount ?? 0,
          totalTokens: usage?.totalTokenCount ?? 0,
        },
        latencyMs: Date.now() - start,
        selfRepairUsed: false,
      };
    } catch (err) {
      throw new EngineError(
        err instanceof Error ? err.message : "Google upstream error",
        this.provider,
        undefined,
        { cause: err },
      );
    }
  }
}
