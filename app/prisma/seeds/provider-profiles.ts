/**
 * ProviderProfile seed — provider başına stil hint + hyperparam.
 *
 * Synthesizer'ın system prompt'una atanan motorun provider'ına göre enjekte
 * edilir (Layer 3 context-assembly). Encrypted API key AiEngine'de kalır;
 * ProviderProfile sadece davranış kalibrasyonu içerir.
 *
 * Direktif #1: Bu seed sadece provider TAG'leri içerir (anthropic/openai/...).
 * Hangi modelin atanacağı admin kararı (AgentRoleAssignment).
 */

export const PROVIDER_PROFILES = [
  {
    provider: "anthropic",
    styleHint: `Anthropic models (Claude family) excel at nuanced instruction following and structured output. Stick to:
- Be terse but complete; Claude is verbose by default — your prompt should counter that with explicit length constraints.
- Use XML-style tags (<example>, <output_format>) for sections; Claude is trained on these.
- For structured output: enumerate sections inside XML tags (<role>, <task>, <format>); Claude follows the hierarchy precisely.
- Constitutional AI training means Claude refuses brand-defamation requests; phrase with positive intent.`,
    hyperparams: { temperature: 0.7, topP: 1.0, maxTokens: 2048 },
  },
  {
    provider: "openai",
    styleHint: `OpenAI models (GPT-4 family, o1, o3) are highly steerable but less verbose than Claude. Stick to:
- System prompts can be aggressive ("You MUST...", "ONLY return..."); GPT obeys strict directives.
- For structured output: enumerate sections explicitly ("First...", "Second...", "Then...") or use numbered headers; GPT obeys numbered structure.
- o1/o3 reasoning models are slow + expensive; use only for complex synthesis, not classification.
- GPT-4o is the workhorse — fast, cheap, multimodal-ready.`,
    hyperparams: { temperature: 0.7, topP: 1.0, maxTokens: 2048 },
  },
  {
    provider: "google",
    styleHint: `Google models (Gemini family) are strong at structured tasks + multimodal. Stick to:
- Gemini follows instructions but tends to add explanatory preamble; suppress with "Output ONLY the requested format."
- For structured output: lead with explicit section headers (## Section, ### Subsection); Gemini follows the hierarchy well.
- Flash variants are extremely fast and cheap — prefer for intent analysis / routing.
- Pro variants are competitive with GPT-4 for complex reasoning.`,
    hyperparams: { temperature: 0.7, topP: 0.95, maxTokens: 2048 },
  },
  {
    provider: "deepseek",
    styleHint: `DeepSeek models are OpenAI-API-compatible. V3 (deepseek-chat) is fast non-thinking. R1 + V4 are
thinking-mode models that emit "reasoning_content" before "content"; budget extra tokens (≥1500) and accept higher latency.
- For structured output: explicit numbered/bulleted lists work well; thinking models also benefit from a clear "Output sections:" preamble.
- Thinking models are excellent for multi-step synthesis but slow (10-30s).
- Non-thinking V3 is the fast workhorse — prefer for INTENT_ANALYZER role.
- Coding tasks: deepseek-coder variants outperform general models.`,
    hyperparams: { temperature: 0.7, topP: 0.95, maxTokens: 2048 },
  },
  {
    provider: "openrouter",
    styleHint: `OpenRouter is a routing layer over many providers. Same prompt may be served by different underlying
models depending on routing config. Stick to:
- Don't assume a specific provider's prompt-format quirks; write neutral prompts.
- Latency varies widely; rely on application-level timeouts, not provider SLAs.
- Some routes use prompt-caching automatically; structure prompts with stable system + variable user.`,
    hyperparams: { temperature: 0.7, topP: 1.0, maxTokens: 2048 },
  },
];

export type ProviderProfileSeed = (typeof PROVIDER_PROFILES)[number];
