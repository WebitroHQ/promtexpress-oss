-- promtexpress seed (raw SQL — runs via `psql -f`)
-- Idempotent: ON CONFLICT updates instead of insert duplication.
--
-- Apply on server with:
--   docker exec -i promtexpress-postgres psql -U $POSTGRES_USER -d $POSTGRES_DB < prisma/seed.sql
--
-- Mirrors prisma/seed.ts (used in dev with `pnpm db:seed`).

-- ─── Plans + Extra Credit Packs (REMOVED 2026-05-08) ────────
-- Plan ve ExtraCreditPack satırları yalnızca /pr/yonet/plans admin paneli
-- üzerinden yönetilir. seed.sql artık bu tablolara dokunmaz.
-- (Tek gerçek kaynak: Plan / ExtraCreditPack tabloları, admin UI üzerinden.)

-- ─── AI Engines ──────────────────────────────────────────
-- All start with isActive=FALSE; admin sets API keys via /pr/yonet/engines.
INSERT INTO "AiEngine" (id, name, provider, "modelId", "encryptedKey", "costPerUnit", "unitType", "isActive", "sortOrder", "createdAt", "updatedAt")
VALUES
  (gen_random_uuid()::text, 'Claude Sonnet 4', 'anthropic', 'claude-sonnet-4-20250514', '', 0.012, '1k_tokens', FALSE, 1, NOW(), NOW()),
  (gen_random_uuid()::text, 'GPT-4o',          'openai',    'gpt-4o-2024-11-20',         '', 0.014, '1k_tokens', FALSE, 2, NOW(), NOW()),
  (gen_random_uuid()::text, 'Gemini 2.0 Pro',  'google',    'gemini-2.0-pro-exp',        '', 0.009, '1k_tokens', FALSE, 3, NOW(), NOW()),
  (gen_random_uuid()::text, 'Deepseek V3',     'deepseek',  'deepseek-chat',             '', 0.0003, '1k_tokens', FALSE, 4, NOW(), NOW()),
  (gen_random_uuid()::text, 'Deepseek R1',     'deepseek',  'deepseek-reasoner',         '', 0.0014, '1k_tokens', FALSE, 5, NOW(), NOW()),
  (gen_random_uuid()::text, 'Deepseek V4',     'deepseek',  'deepseek-v4',               '', 0.0005, '1k_tokens', FALSE, 6, NOW(), NOW()),
  (gen_random_uuid()::text, 'Midjourney v6',   'midjourney','v6',                        '', 0.06,   'image',     FALSE, 7, NOW(), NOW()),
  (gen_random_uuid()::text, 'DALL·E 3',        'openai',    'dall-e-3',                  '', 0.04,   'image',     FALSE, 8, NOW(), NOW()),
  (gen_random_uuid()::text, 'ElevenLabs v2',   'elevenlabs','eleven_multilingual_v2',    '', 0.03,   'minute',    FALSE, 9, NOW(), NOW()),
  (gen_random_uuid()::text, 'Runway Gen-3',    'runway',    'gen3',                      '', 0.18,   'clip',      FALSE, 10, NOW(), NOW())
ON CONFLICT (name) DO UPDATE SET
  provider = EXCLUDED.provider,
  "modelId" = EXCLUDED."modelId",
  "costPerUnit" = EXCLUDED."costPerUnit",
  "unitType" = EXCLUDED."unitType",
  "sortOrder" = EXCLUDED."sortOrder",
  "updatedAt" = NOW();

-- ─── Prompt Templates ────────────────────────────────────
-- No unique constraint on title; use NOT EXISTS guard for idempotency.
INSERT INTO "PromptTemplate" (id, category, modality, engine, title, template, variables, "isActive", "sortOrder", "createdAt", "updatedAt")
SELECT gen_random_uuid()::text, 'Social', 'text', 'Claude Sonnet 4', 'LinkedIn launch post — series B',
  E'# Role: Senior brand writer\n# Audience: {{audience}}\n# Tone: {{tone}}\n# Constraints:\n  - {{word_count}} words\n  - Open with a single line of context\n  - Close with a soft CTA referencing {{cta_link}}\n# Output: Plain text post',
  '["audience","tone","word_count","cta_link"]'::jsonb, TRUE,1, NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM "PromptTemplate" WHERE title='LinkedIn launch post — series B' AND modality='text');

INSERT INTO "PromptTemplate" (id, category, modality, engine, title, template, variables, "isActive", "sortOrder", "createdAt", "updatedAt")
SELECT gen_random_uuid()::text, 'Image', 'image', 'Midjourney v6', 'Hero image — sustainable fashion',
  'Editorial product still: {{product_name}}, {{lighting}} lighting, {{mood}} mood, no text overlay. {{style_notes}}',
  '["product_name","lighting","mood","style_notes"]'::jsonb, TRUE,2, NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM "PromptTemplate" WHERE title='Hero image — sustainable fashion' AND modality='image');

INSERT INTO "PromptTemplate" (id, category, modality, engine, title, template, variables, "isActive", "sortOrder", "createdAt", "updatedAt")
SELECT gen_random_uuid()::text, 'Code', 'code', 'GPT-4o', 'Spec → Jest tests',
  E'# Task: Generate failing Jest tests from this spec, then minimum implementation.\n# Spec:\n{{spec}}\n# Output: Two code blocks: 1) tests.spec.ts, 2) implementation.ts',
  '["spec"]'::jsonb, TRUE,3, NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM "PromptTemplate" WHERE title='Spec → Jest tests' AND modality='code');

INSERT INTO "PromptTemplate" (id, category, modality, engine, title, template, variables, "isActive", "sortOrder", "createdAt", "updatedAt")
SELECT gen_random_uuid()::text, 'Audio', 'audio', 'ElevenLabs v2', '30s product VO',
  E'Voice: {{voice_id}}. Style: {{style}}. Speed: ~150 wpm. Script:\n{{script}}',
  '["voice_id","style","script"]'::jsonb, TRUE,4, NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM "PromptTemplate" WHERE title='30s product VO' AND modality='audio');

INSERT INTO "PromptTemplate" (id, category, modality, engine, title, template, variables, "isActive", "sortOrder", "createdAt", "updatedAt")
SELECT gen_random_uuid()::text, 'Lifecycle', 'text', 'Claude Sonnet 4', 'Onboarding email — day 3',
  E'# Role: Lifecycle email writer\n# Audience: New user, day 3 since signup\n# Goal: Re-engagement; reference one feature ({{feature}}) and one CTA ({{cta}})\n# Tone: Warm, brief\n# Length: 80–120 words\n# Output: Subject line + body',
  '["feature","cta"]'::jsonb, TRUE,5, NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM "PromptTemplate" WHERE title='Onboarding email — day 3' AND modality='text');

INSERT INTO "PromptTemplate" (id, category, modality, engine, title, template, variables, "isActive", "sortOrder", "createdAt", "updatedAt")
SELECT gen_random_uuid()::text, 'Video', 'video', 'Runway Gen-3', 'Ad storyboard',
  E'Storyboard for {{duration}}s ad: {{product_name}}.\nFrame-by-frame description (5 frames). Audience: {{audience}}. Style: {{style}}.',
  '["duration","product_name","audience","style"]'::jsonb, TRUE,6, NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM "PromptTemplate" WHERE title='Ad storyboard' AND modality='video');

INSERT INTO "PromptTemplate" (id, category, modality, engine, title, template, variables, "isActive", "sortOrder", "createdAt", "updatedAt")
SELECT gen_random_uuid()::text, 'Social', 'text', 'Claude Sonnet 4', 'Twitter thread — AI ethics',
  E'# Format: Twitter thread, {{tweet_count}} tweets, ≤280 chars each\n# Topic: {{topic}}\n# Stance: {{stance}}\n# Output: JSON {tweets: [{n, text, chars}]}',
  '["tweet_count","topic","stance"]'::jsonb, TRUE,7, NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM "PromptTemplate" WHERE title='Twitter thread — AI ethics' AND modality='text');

-- Yeni status/version sütunlarını seed satırlarına yansıt (idempotent — migration sonrası çalışır).
-- isActive=TRUE olan tüm satırlar PUBLISHED kabul edilir; version default 'v1.0' migration tarafından konuldu.
UPDATE "PromptTemplate" SET status = 'PUBLISHED'::"TemplateStatus" WHERE "isActive" = TRUE AND status = 'DRAFT';

-- ─── Admin user ──────────────────────────────────────────
INSERT INTO "User" (id, email, name, role, locale, "createdAt", "updatedAt")
VALUES (gen_random_uuid()::text, 'admin@example.com', 'Admin', 'ADMIN', 'en', NOW(), NOW())
ON CONFLICT (email) DO UPDATE SET
  role = 'ADMIN',
  "updatedAt" = NOW();

-- ─── Target Engines ──────────────────────────────────────
-- Kullanıcının prompt'u kullanacağı AI'lar (API key gerektirmez, sadece bilgi).
-- promptStyleHint, prompt üretiminde sistem mesajına inject edilir.
-- provider alanı UI'da iki adımlı seçim (önce sağlayıcı, sonra model) için kullanılır.
-- 306 model; her deploy idempotent (ON CONFLICT slug DO UPDATE).
INSERT INTO "TargetEngine" (id, slug, name, provider, modality, "promptStyleHint", "isActive", "sortOrder", "iconUrl", "createdAt", "updatedAt")
VALUES
  -- ── TEXT ──
  (gen_random_uuid()::text, 'yi-large', 'Yi-Large', '01.ai', 'text', 'Markdown; bilingual.', TRUE, 1, NULL, NOW(), NOW()),
  (gen_random_uuid()::text, 'jamba-1-5-large', 'Jamba 1.5 Large', 'AI21', 'text', 'SSM+Transformer hybrid. Long-context summarization shines (256k+). Markdown.', TRUE, 2, NULL, NOW(), NOW()),
  (gen_random_uuid()::text, 'jamba-1-5-mini', 'Jamba 1.5 Mini', 'AI21', 'text', 'Smaller Jamba; same long-context strengths.', TRUE, 3, NULL, NOW(), NOW()),
  (gen_random_uuid()::text, 'qwen-2-5', 'Qwen 2.5', 'Alibaba', 'text', 'Predecessor family (text + coder + math + VL variants). Markdown; multilingual.', TRUE, 4, NULL, NOW(), NOW()),
  (gen_random_uuid()::text, 'qwen-3-5-vl', 'Qwen 3.5 VL', 'Alibaba', 'text', 'Vision-language; 2D/3D image understanding, complex documents, video. Describe target of inspection; markdown.', TRUE, 5, NULL, NOW(), NOW()),
  (gen_random_uuid()::text, 'qwen-3-6-max', 'Qwen 3.6 Max-Preview', 'Alibaba', 'text', 'Proprietary frontier. Markdown + JSON mode; multilingual (CN/EN strongest). Use system to set role.', TRUE, 6, NULL, NOW(), NOW()),
  (gen_random_uuid()::text, 'qwen-3-6-plus', 'Qwen 3.6 Plus', 'Alibaba', 'text', 'General-purpose flagship. Markdown; multilingual.', TRUE, 7, NULL, NOW(), NOW()),
  (gen_random_uuid()::text, 'qwen-3-6-35b-a3b', 'Qwen 3.6-35B-A3B', 'Alibaba', 'text', 'Open-weight MoE (3B active per token). Great for self-host; markdown.', TRUE, 8, NULL, NOW(), NOW()),
  (gen_random_uuid()::text, 'claude', 'Claude (claude.ai)', 'Anthropic', 'text', 'Consumer product wrapping latest Claude. XML tags work; 200k+ context; strong reasoning. Use natural prose; reference attachments by name.', TRUE, 9, NULL, NOW(), NOW()),
  (gen_random_uuid()::text, 'claude-haiku-4-5', 'Claude Haiku 4.5', 'Anthropic', 'text', 'Fastest near-frontier. Concise prompts; XML tags optional but help. 200k context. Extended thinking available. Use for high-volume chat / classification.', TRUE, 10, NULL, NOW(), NOW()),
  (gen_random_uuid()::text, 'claude-opus-4', 'Claude Opus 4', 'Anthropic', 'text', 'Deprecated 2026-06-15. Migrate to Opus 4.7.', TRUE, 11, NULL, NOW(), NOW()),
  (gen_random_uuid()::text, 'claude-opus-4-1', 'Claude Opus 4.1', 'Anthropic', 'text', 'Legacy. XML tags + extended thinking. Migrate to 4.7.', TRUE, 12, NULL, NOW(), NOW()),
  (gen_random_uuid()::text, 'claude-opus-4-5', 'Claude Opus 4.5', 'Anthropic', 'text', 'Legacy high-end. XML tags; extended thinking; 200k context. Migrate to 4.7 when possible.', TRUE, 13, NULL, NOW(), NOW()),
  (gen_random_uuid()::text, 'claude-opus-4-6', 'Claude Opus 4.6', 'Anthropic', 'text', 'Legacy flagship. XML tags + extended thinking; 1M context, 128k output. Migrate to 4.7 when possible.', TRUE, 14, NULL, NOW(), NOW()),
  (gen_random_uuid()::text, 'claude-opus-4-7', 'Claude Opus 4.7', 'Anthropic', 'text', 'Top-tier reasoning + agentic coding. Use XML tags for structure: <task>, <context>, <constraints>, <output_format>. 1M context. Adaptive thinking auto-engages; for hard problems allow long step budgets. Knowledge cutoff Jan 2026.', TRUE, 15, NULL, NOW(), NOW()),
  (gen_random_uuid()::text, 'claude-sonnet-4', 'Claude Sonnet 4', 'Anthropic', 'text', 'Deprecated 2026-06-15. Migrate to Sonnet 4.6.', TRUE, 16, NULL, NOW(), NOW()),
  (gen_random_uuid()::text, 'claude-sonnet-4-5', 'Claude Sonnet 4.5', 'Anthropic', 'text', 'Reliable workhorse. XML tags; strong tool-use behavior. 200k context. Good default for production agents.', TRUE, 17, NULL, NOW(), NOW()),
  (gen_random_uuid()::text, 'claude-sonnet-4-6', 'Claude Sonnet 4.6', 'Anthropic', 'text', 'Best speed/intelligence balance. XML tags work well. Extended thinking + adaptive thinking available. 1M context, 64k max output. Great for long-form writing and structured output.', TRUE, 18, NULL, NOW(), NOW()),
  (gen_random_uuid()::text, 'ernie-4', 'ERNIE 4', 'Baidu', 'text', 'Predecessor. Markdown; CN-strong.', TRUE, 19, NULL, NOW(), NOW()),
  (gen_random_uuid()::text, 'ernie-4-5', 'ERNIE 4.5', 'Baidu', 'text', 'Markdown; CN-strong; tool-calling.', TRUE, 20, NULL, NOW(), NOW()),
  (gen_random_uuid()::text, 'doubao-2', 'Doubao 2.0', 'ByteDance', 'text', 'TikTok-China integrated. Markdown; multilingual (CN/EN).', TRUE, 21, NULL, NOW(), NOW()),
  (gen_random_uuid()::text, 'character-ai', 'Character.AI', 'Character.AI', 'text', 'Persona-driven roleplay chat. Describe character traits + scene + tone in opening message. Use [OOC: ...] for out-of-character notes. Conversational not instructional. Respect content filters; no system-prompt; the persona is fixed by the character card.', TRUE, 22, NULL, NOW(), NOW()),
  (gen_random_uuid()::text, 'character-ai-plus', 'Character.AI+', 'Character.AI', 'text', 'Same persona-driven style as base Character.AI; longer context; supports /image and Voice. Use [OOC] tags for meta directions. Avoid breaking immersion.', TRUE, 23, NULL, NOW(), NOW()),
  (gen_random_uuid()::text, 'command-r', 'Command R', 'Cohere', 'text', 'RAG-tuned smaller. Same documents pattern.', TRUE, 24, NULL, NOW(), NOW()),
  (gen_random_uuid()::text, 'command-r-plus', 'Command R+', 'Cohere', 'text', 'RAG-tuned. Pass evidence in `documents` field (Cohere API); concise system; expect citation-style output.', TRUE, 25, NULL, NOW(), NOW()),
  (gen_random_uuid()::text, 'command-r7b', 'Command R7B', 'Cohere', 'text', 'Edge tier. Same RAG pattern; concise.', TRUE, 26, NULL, NOW(), NOW()),
  (gen_random_uuid()::text, 'deepseek-r1', 'DeepSeek R1', 'DeepSeek', 'text', 'Reasoning model. MINIMIZE system prompt; give complete problem; expect long chain-of-thought. Excellent for reasoning-heavy coding.', TRUE, 27, NULL, NOW(), NOW()),
  (gen_random_uuid()::text, 'deepseek-v3', 'DeepSeek V3', 'DeepSeek', 'text', 'Predecessor. Markdown; system+user; great cost/perf.', TRUE, 28, NULL, NOW(), NOW()),
  (gen_random_uuid()::text, 'deepseek-v3-2', 'DeepSeek V3.2', 'DeepSeek', 'text', 'Strong general + coding. Markdown; system+user.', TRUE, 29, NULL, NOW(), NOW()),
  (gen_random_uuid()::text, 'gemini', 'Gemini', 'Google', 'text', 'Consumer Gemini product. Markdown; JSON mode; multimodal. Natural conversational prompts.', TRUE, 30, NULL, NOW(), NOW()),
  (gen_random_uuid()::text, 'gemini-2-0-flash', 'Gemini 2.0 Flash', 'Google', 'text', 'Deprecated. Migrate to 2.5 Flash.', TRUE, 31, NULL, NOW(), NOW()),
  (gen_random_uuid()::text, 'gemini-2-0-pro', 'Gemini 2.0 Pro', 'Google', 'text', 'Deprecated. Migrate to 2.5 Pro.', TRUE, 32, NULL, NOW(), NOW()),
  (gen_random_uuid()::text, 'gemini-2-5-flash', 'Gemini 2.5 Flash', 'Google', 'text', 'Best price/perf flash. Concise prompts; structured-output friendly; high-volume.', TRUE, 33, NULL, NOW(), NOW()),
  (gen_random_uuid()::text, 'gemini-2-5-flash-lite', 'Gemini 2.5 Flash-Lite', 'Google', 'text', 'Fastest, cheapest multimodal. Ultra-concise prompts; classification/extraction.', TRUE, 34, NULL, NOW(), NOW()),
  (gen_random_uuid()::text, 'gemini-2-5-pro', 'Gemini 2.5 Pro', 'Google', 'text', 'Deep reasoning + coding. Markdown + structured output; multimodal-aware. Use system instruction to set persona; user turn for task.', TRUE, 35, NULL, NOW(), NOW()),
  (gen_random_uuid()::text, 'gemini-3-flash', 'Gemini 3 Flash', 'Google', 'text', 'Frontier perf at flash cost. Concise prompts; markdown; multimodal.', TRUE, 36, NULL, NOW(), NOW()),
  (gen_random_uuid()::text, 'gemini-3-1-flash-lite', 'Gemini 3.1 Flash Lite', 'Google', 'text', '1M context, ultra-cheap. Concise prompts; great for retrieval/summarization at scale.', TRUE, 37, NULL, NOW(), NOW()),
  (gen_random_uuid()::text, 'gemini-3-1-pro', 'Gemini 3.1 Pro', 'Google', 'text', 'Frontier reasoning + agentic + ''vibe coding''. Markdown + JSON-mode; multimodal-aware. Be explicit about output schema for structured tasks.', TRUE, 38, NULL, NOW(), NOW()),
  (gen_random_uuid()::text, 'gemma-3-12b', 'Gemma 3 12B', 'Google', 'text', 'Open-weight 12B. Concise prompts; markdown; good for laptops/edge.', TRUE, 39, NULL, NOW(), NOW()),
  (gen_random_uuid()::text, 'gemma-3-27b', 'Gemma 3 27B', 'Google', 'text', 'Open-weight 27B. Standard system+user format; markdown. Good for self-host inference.', TRUE, 40, NULL, NOW(), NOW()),
  (gen_random_uuid()::text, 'gemma-3-4b', 'Gemma 3 4B', 'Google', 'text', 'Open-weight 4B. Ultra-concise; on-device.', TRUE, 41, NULL, NOW(), NOW()),
  (gen_random_uuid()::text, 'gemma-3n', 'Gemma 3n', 'Google', 'text', 'Mobile-optimized open-weight. Concise prompts; on-device.', TRUE, 42, NULL, NOW(), NOW()),
  (gen_random_uuid()::text, 'pi', 'Pi', 'Inflection', 'text', 'Conversational only. No system prompt; consumer chat; warm, empathic.', TRUE, 43, NULL, NOW(), NOW()),
  (gen_random_uuid()::text, 'llama-3', 'Llama 3 / 3.1', 'Meta', 'text', 'Generic Llama 3 family. Markdown; system+role+task.', TRUE, 44, NULL, NOW(), NOW()),
  (gen_random_uuid()::text, 'llama-3-1-405b', 'Llama 3.1 405B', 'Meta', 'text', 'Largest open-weight. Markdown; system+task; for hard problems where 70B falls short.', TRUE, 45, NULL, NOW(), NOW()),
  (gen_random_uuid()::text, 'llama-3-1-70b', 'Llama 3.1 70B', 'Meta', 'text', 'Open-weight 70B. Markdown; system+task.', TRUE, 46, NULL, NOW(), NOW()),
  (gen_random_uuid()::text, 'llama-3-1-8b', 'Llama 3.1 8B', 'Meta', 'text', 'Edge open-weight. Concise prompts; on-device viable.', TRUE, 47, NULL, NOW(), NOW()),
  (gen_random_uuid()::text, 'llama-3-2-11b-vision', 'Llama 3.2 11B Vision', 'Meta', 'text', 'Smaller vision; same usage.', TRUE, 48, NULL, NOW(), NOW()),
  (gen_random_uuid()::text, 'llama-3-2-90b-vision', 'Llama 3.2 90B Vision', 'Meta', 'text', 'Vision-capable open-weight. Describe what to inspect; markdown.', TRUE, 49, NULL, NOW(), NOW()),
  (gen_random_uuid()::text, 'llama-3-3-70b', 'Llama 3.3 70B', 'Meta', 'text', 'Open-weight workhorse. Markdown; system+user; good for long-form generation and structured output.', TRUE, 50, NULL, NOW(), NOW()),
  (gen_random_uuid()::text, 'copilot-365', 'Microsoft 365 Copilot', 'Microsoft', 'text', 'Document-context grounded (Word/Excel/Teams/Outlook). Reference selections via /-commands. Ask for transformations on document content (summarize, rewrite, draft). Defaults to corporate professional tone; specify casual/marketing tone if needed.', TRUE, 51, NULL, NOW(), NOW()),
  (gen_random_uuid()::text, 'microsoft-copilot', 'Microsoft Copilot', 'Microsoft', 'text', 'Bing-grounded consumer chat (copilot.microsoft.com). Web search baked in — ask for citations explicitly. Markdown OK. Supports modes: Quick / Think Deeper / Smart. Concise prompts work best; specify when you want recent web sources.', TRUE, 52, NULL, NOW(), NOW()),
  (gen_random_uuid()::text, 'microsoft-copilot-think-deeper', 'Microsoft Copilot — Think Deeper', 'Microsoft', 'text', 'Reasoning mode (o1-class backend). Minimize system framing; give the full problem statement up-front. Expect long latency. No roleplay — strict task-first prompts. Markdown allowed.', TRUE, 53, NULL, NOW(), NOW()),
  (gen_random_uuid()::text, 'hailuo-text', 'Hailuo (MiniMax abab)', 'MiniMax', 'text', 'abab-7-chat / abab-6.5s. Markdown; multilingual; long context.', TRUE, 54, NULL, NOW(), NOW()),
  (gen_random_uuid()::text, 'ministral-3b', 'Ministral 3B', 'Mistral', 'text', 'On-device. Ultra-concise.', TRUE, 55, NULL, NOW(), NOW()),
  (gen_random_uuid()::text, 'ministral-8b', 'Ministral 8B', 'Mistral', 'text', 'Edge model. Ultra-concise prompts.', TRUE, 56, NULL, NOW(), NOW()),
  (gen_random_uuid()::text, 'mistral-large-2', 'Mistral Large 2', 'Mistral', 'text', 'European LLM. Markdown; multilingual; concise instructions; tool-use friendly.', TRUE, 57, NULL, NOW(), NOW()),
  (gen_random_uuid()::text, 'mistral-medium-3', 'Mistral Medium 3', 'Mistral', 'text', 'Mid-tier. Same as Large but faster; markdown.', TRUE, 58, NULL, NOW(), NOW()),
  (gen_random_uuid()::text, 'mistral-small-3', 'Mistral Small 3', 'Mistral', 'text', 'Fast small model. Concise; markdown.', TRUE, 59, NULL, NOW(), NOW()),
  (gen_random_uuid()::text, 'pixtral-12b', 'Pixtral 12B', 'Mistral', 'text', 'Smaller vision; same style.', TRUE, 60, NULL, NOW(), NOW()),
  (gen_random_uuid()::text, 'pixtral-large', 'Pixtral Large', 'Mistral', 'text', 'Vision LLM. Describe what to look at first; markdown.', TRUE, 61, NULL, NOW(), NOW()),
  (gen_random_uuid()::text, 'kimi-k2-6', 'Kimi K2.6', 'Moonshot', 'text', '200k+ context. Markdown; CN/EN; long-doc strength.', TRUE, 62, NULL, NOW(), NOW()),
  (gen_random_uuid()::text, 'nemotron-3-nano-omni-vision', 'NVIDIA Nemotron 3 Nano Omni Vision', 'NVIDIA', 'text', 'Image+prompt reasoning. Describe target of analysis.', TRUE, 63, NULL, NOW(), NOW()),
  (gen_random_uuid()::text, 'chatgpt', 'ChatGPT', 'OpenAI', 'text', 'Conversational product wrapping GPT-5/4 family. Markdown; supports system instructions; large context. Use natural conversation; refer to attachments by filename.', TRUE, 64, NULL, NOW(), NOW()),
  (gen_random_uuid()::text, 'gpt-4-1', 'GPT-4.1', 'OpenAI', 'text', 'Strong instruction-following with 1M context. Markdown; great for long structured outputs and document analysis. Supports JSON mode.', TRUE, 65, NULL, NOW(), NOW()),
  (gen_random_uuid()::text, 'gpt-4-1-mini', 'GPT-4.1 mini', 'OpenAI', 'text', 'Fast, cheap GPT-4.1. Same prompt style; shorter context; ideal for high-volume structured tasks.', TRUE, 66, NULL, NOW(), NOW()),
  (gen_random_uuid()::text, 'gpt-4-1-nano', 'GPT-4.1 nano', 'OpenAI', 'text', 'Smallest 4.1 tier. Concise prompts; markdown; for classification/extraction at scale.', TRUE, 67, NULL, NOW(), NOW()),
  (gen_random_uuid()::text, 'gpt-4o', 'GPT-4o', 'OpenAI', 'text', 'Multimodal flagship of prior generation. Markdown + system prompt; concise, structured output; vision-aware.', TRUE, 68, NULL, NOW(), NOW()),
  (gen_random_uuid()::text, 'gpt-4o-mini', 'GPT-4o mini', 'OpenAI', 'text', 'Fast cheap multimodal. Markdown; vision-aware; great for high-volume chat.', TRUE, 69, NULL, NOW(), NOW()),
  (gen_random_uuid()::text, 'gpt-5-3-instant', 'GPT-5.3 Instant', 'OpenAI', 'text', 'ChatGPT-tuned for fast friendly tone. Don''t add ''be friendly'' redundantly; just give the task. Avoid teaser/leading phrases — the model already softens.', TRUE, 70, NULL, NOW(), NOW()),
  (gen_random_uuid()::text, 'gpt-5-4', 'GPT-5.4', 'OpenAI', 'text', '1M context, computer-use enabled. Markdown + structured output; allow tool calls. Be explicit about step budget and stop conditions for agent loops; otherwise concise problem-first prompt.', TRUE, 71, NULL, NOW(), NOW()),
  (gen_random_uuid()::text, 'gpt-5-4-mini', 'GPT-5.4 mini (Thinking mini)', 'OpenAI', 'text', 'Cheaper, faster sibling of GPT-5.4 with thinking. Markdown + JSON; same structure as 5.4 — concise, problem-first.', TRUE, 72, NULL, NOW(), NOW()),
  (gen_random_uuid()::text, 'gpt-5-4-pro', 'GPT-5.4 Pro', 'OpenAI', 'text', 'Long-horizon reasoning tier. Same prompt style as 5.4 but raise step budget; expect higher latency. Use for hard multi-step problems where 5.4 stalls.', TRUE, 73, NULL, NOW(), NOW()),
  (gen_random_uuid()::text, 'gpt-5-5', 'GPT-5.5', 'OpenAI', 'text', 'Frontier reasoning + agentic. Keep system prompt minimal — give the full problem in the user turn. Markdown allowed; structured output via JSON mode; supports tool calls. For agent loops, set explicit step budget and stop conditions.', TRUE, 74, NULL, NOW(), NOW()),
  (gen_random_uuid()::text, 'o1', 'o1', 'OpenAI', 'text', 'Reasoning model. MINIMIZE system prompt — give the complete problem in the user turn. No roleplay, no chain-of-thought instructions (it does its own). Expect long latency.', TRUE, 75, NULL, NOW(), NOW()),
  (gen_random_uuid()::text, 'o1-mini', 'o1-mini', 'OpenAI', 'text', 'Lighter reasoning. Same problem-first style; faster than o1.', TRUE, 76, NULL, NOW(), NOW()),
  (gen_random_uuid()::text, 'o1-pro', 'o1-pro', 'OpenAI', 'text', 'Premium reasoning tier. Same as o1 — minimal system, problem-first. Use for hardest math/coding/research problems.', TRUE, 77, NULL, NOW(), NOW()),
  (gen_random_uuid()::text, 'o3', 'o3', 'OpenAI', 'text', 'Reasoning model. Concise problem-first prompts; avoid roleplay; structured output via JSON mode. Expect chain-of-thought internally.', TRUE, 78, NULL, NOW(), NOW()),
  (gen_random_uuid()::text, 'o3-mini', 'o3-mini', 'OpenAI', 'text', 'Lighter o3. Same style; faster; use for tool-using reasoning loops on a budget.', TRUE, 79, NULL, NOW(), NOW()),
  (gen_random_uuid()::text, 'o3-pro', 'o3-pro', 'OpenAI', 'text', 'Premium o3 tier. Problem-first; long step budget; use for hardest reasoning where o3 stalls.', TRUE, 80, NULL, NOW(), NOW()),
  (gen_random_uuid()::text, 'o4-mini', 'o4-mini', 'OpenAI', 'text', 'Compact reasoner. Terse instructions; great for tool-use in cheap reasoning loops.', TRUE, 81, NULL, NOW(), NOW()),
  (gen_random_uuid()::text, 'perplexity', 'Perplexity', 'Perplexity', 'text', 'Generic Perplexity product; phrase as research question; citations expected.', TRUE, 82, NULL, NOW(), NOW()),
  (gen_random_uuid()::text, 'perplexity-sonar-large', 'Perplexity Sonar Large Online', 'Perplexity', 'text', 'Search-grounded LLM. Phrase as a research question; expect citations. Be specific about freshness window.', TRUE, 83, NULL, NOW(), NOW()),
  (gen_random_uuid()::text, 'perplexity-sonar-pro', 'Perplexity Sonar Pro', 'Perplexity', 'text', 'Pro tier with deeper search. Same research-question style.', TRUE, 84, NULL, NOW(), NOW()),
  (gen_random_uuid()::text, 'perplexity-sonar-reasoning', 'Perplexity Sonar Reasoning', 'Perplexity', 'text', 'Reasoning + search hybrid. Problem-first + ground-the-answer instruction.', TRUE, 85, NULL, NOW(), NOW()),
  (gen_random_uuid()::text, 'notebooklm', 'NotebookLM', 'Google', 'text', 'Source-grounded research assistant. Upload sources first, then ask questions about THEM specifically (cites with [n] markers). Phrase as: "based on the uploaded sources, …". For audio overviews: ask explicit length/tone. Never invents facts beyond sources — make this explicit if you want broader synthesis.', TRUE, 95, NULL, NOW(), NOW()),
  (gen_random_uuid()::text, 'hunyuan-large', 'Hunyuan-Large', 'Tencent', 'text', 'Open-weight. Markdown; CN/EN strong.', TRUE, 86, NULL, NOW(), NOW()),
  (gen_random_uuid()::text, 'grok', 'Grok', 'xAI', 'text', 'Generic Grok. Conversational + real-time context; humor allowed.', TRUE, 87, NULL, NOW(), NOW()),
  (gen_random_uuid()::text, 'grok-2', 'Grok 2', 'xAI', 'text', 'Legacy. Conversational; markdown.', TRUE, 88, NULL, NOW(), NOW()),
  (gen_random_uuid()::text, 'grok-3', 'Grok 3', 'xAI', 'text', 'Predecessor; same style.', TRUE, 89, NULL, NOW(), NOW()),
  (gen_random_uuid()::text, 'grok-4', 'Grok 4', 'xAI', 'text', 'X/xAI flagship. Conversational; humor allowed; markdown; supports real-time X data via tool. Be explicit if you want serious tone.', TRUE, 90, NULL, NOW(), NOW()),
  (gen_random_uuid()::text, 'grok-vision', 'Grok Vision', 'xAI', 'text', 'Vision-capable Grok. Describe what to inspect; markdown.', TRUE, 91, NULL, NOW(), NOW()),
  (gen_random_uuid()::text, 'glm-4', 'GLM-4', 'Zhipu', 'text', 'Markdown; bilingual CN/EN; tool-calling.', TRUE, 92, NULL, NOW(), NOW()),
  (gen_random_uuid()::text, 'glm-4v', 'GLM-4V', 'Zhipu', 'text', 'Vision variant; describe inspection target.', TRUE, 93, NULL, NOW(), NOW()),
  -- ── CODE ──
  (gen_random_uuid()::text, 'aider', 'Aider', 'Aider', 'code', 'CLI repo agent. Concise; uses git diffs as protocol; describe edit by file path + intent.', TRUE, 1, NULL, NOW(), NOW()),
  (gen_random_uuid()::text, 'qwen-3-coder-480b', 'Qwen 3 Coder 480B', 'Alibaba', 'code', 'Strongest free coding model on OpenRouter (262k context). Code fences; FIM-style supported; describe spec then ask for tests + impl.', TRUE, 2, NULL, NOW(), NOW()),
  (gen_random_uuid()::text, 'amazon-q-developer', 'Amazon Q Developer', 'Amazon', 'code', 'AWS-context-aware. Describe AWS resources/services in prompts; markdown fences.', TRUE, 3, NULL, NOW(), NOW()),
  (gen_random_uuid()::text, 'claude-code-cli', 'Claude Code (CLI)', 'Anthropic', 'code', 'Tool-using agent. Action-oriented prompts; allow Read/Edit/Bash/WebFetch; use XML tags for spec and acceptance criteria. Concise, imperative voice.', TRUE, 4, NULL, NOW(), NOW()),
  (gen_random_uuid()::text, 'augment', 'Augment', 'Augment', 'code', 'Codebase-aware. @-references; describe cross-file change.', TRUE, 5, NULL, NOW(), NOW()),
  (gen_random_uuid()::text, 'cline', 'Cline', 'Cline', 'code', 'VSCode autonomous agent. Task + acceptance + file scope; allow tool calls.', TRUE, 6, NULL, NOW(), NOW()),
  (gen_random_uuid()::text, 'devin', 'Devin', 'Cognition', 'code', 'Autonomous SWE agent. Hand a goal + repo + acceptance criteria; expect long unattended runs; check work via PR.', TRUE, 7, NULL, NOW(), NOW()),
  (gen_random_uuid()::text, 'windsurf', 'Windsurf', 'Cognition', 'code', 'Agent IDE (ex-Codeium, now Cognition). Multi-step task lists; allow tool calls; integrates Devin architecture — give goal + acceptance.', TRUE, 8, NULL, NOW(), NOW()),
  (gen_random_uuid()::text, 'continue-dev', 'Continue.dev', 'Continue', 'code', 'Open-source IDE assistant; pluggable model. Same patterns as Cursor; @-references.', TRUE, 9, NULL, NOW(), NOW()),
  (gen_random_uuid()::text, 'cursor', 'Cursor', 'Cursor', 'code', 'Multi-file IDE agent. Use @file and @codebase references; describe spec, then step-by-step changes. Allow tool calls.', TRUE, 10, NULL, NOW(), NOW()),
  (gen_random_uuid()::text, 'deepseek-coder-v2', 'DeepSeek Coder V2', 'DeepSeek', 'code', 'Code-specific. FIM + fences; describe spec, then tests + impl.', TRUE, 11, NULL, NOW(), NOW()),
  (gen_random_uuid()::text, 'github-copilot', 'GitHub Copilot', 'GitHub', 'code', 'Inline IDE assistant. Short docstring/intent comments work best; minimal prose; let it complete.', TRUE, 12, NULL, NOW(), NOW()),
  (gen_random_uuid()::text, 'gemini-code-assist', 'Gemini Code Assist', 'Google', 'code', 'Google IDE assistant. Markdown fences; multilingual + multimodal-friendly; @-style file references.', TRUE, 13, NULL, NOW(), NOW()),
  (gen_random_uuid()::text, 'jetbrains-ai', 'JetBrains AI', 'JetBrains', 'code', 'IDE assistant. Intent comments; markdown fences.', TRUE, 14, NULL, NOW(), NOW()),
  (gen_random_uuid()::text, 'lovable', 'Lovable', 'Lovable', 'code', 'Full-stack app builder. Product spec; iterate via natural language; describe data model up front.', TRUE, 15, NULL, NOW(), NOW()),
  (gen_random_uuid()::text, 'codestral', 'Codestral', 'Mistral', 'code', 'Code-specific Mistral. Few NL tokens; FIM-friendly; fences with language tag.', TRUE, 16, NULL, NOW(), NOW()),
  (gen_random_uuid()::text, 'replit-agent', 'Replit Agent', 'Replit', 'code', 'App builder. One-paragraph product spec → full app; iterate via natural language.', TRUE, 17, NULL, NOW(), NOW()),
  (gen_random_uuid()::text, 'roo-code', 'Roo Code', 'Roo Code', 'code', 'Cline fork. Same style: task + acceptance; tool calls.', TRUE, 18, NULL, NOW(), NOW()),
  (gen_random_uuid()::text, 'cody', 'Cody (Sourcegraph)', 'Sourcegraph', 'code', 'Repo-aware. Reference symbols/files explicitly; ask for cross-file changes explicitly.', TRUE, 19, NULL, NOW(), NOW()),
  (gen_random_uuid()::text, 'bolt-new', 'Bolt.new', 'StackBlitz', 'code', 'Browser sandbox builder. Spec-first; live iteration; reference UI components.', TRUE, 20, NULL, NOW(), NOW()),
  (gen_random_uuid()::text, 'supermaven', 'Supermaven', 'Supermaven', 'code', 'Completion engine. Minimal NL; let it complete from cursor.', TRUE, 21, NULL, NOW(), NOW()),
  (gen_random_uuid()::text, 'tabnine', 'Tabnine', 'Tabnine', 'code', 'Code completion focused. Short, intent-driven comments; minimal natural language.', TRUE, 22, NULL, NOW(), NOW()),
  (gen_random_uuid()::text, 'v0', 'V0', 'Vercel', 'code', 'UI-first. Describe component + style + framework (Tailwind/React); outputs code + preview.', TRUE, 23, NULL, NOW(), NOW()),
  (gen_random_uuid()::text, 'zed-ai', 'Zed AI', 'Zed', 'code', 'Editor-native. Concise; @-references.', TRUE, 24, NULL, NOW(), NOW()),
  -- ── IMAGE ──
  (gen_random_uuid()::text, 'firefly', 'Adobe Firefly', 'Adobe', 'image', 'Generic Firefly. Commercial-safe prose.', TRUE, 1, NULL, NOW(), NOW()),
  (gen_random_uuid()::text, 'firefly-3', 'Adobe Firefly Image 3', 'Adobe', 'image', 'Commercial-safe. Natural prose; supports style/effect/composition modifiers; great for brand-safe assets.', TRUE, 2, NULL, NOW(), NOW()),
  (gen_random_uuid()::text, 'qwen-image', 'Qwen-Image', 'Alibaba', 'image', 'Complex text rendering + edit. Prose; CN/EN.', TRUE, 3, NULL, NOW(), NOW()),
  (gen_random_uuid()::text, 'qwen-image-2', 'Qwen-Image 2.0', 'Alibaba', 'image', 'Native 2K + pro text rendering + unified gen+edit. Prose; CN/EN strong; describe text content explicitly when rendering text.', TRUE, 4, NULL, NOW(), NOW()),
  (gen_random_uuid()::text, 'ernie-image', 'ERNIE-Image', 'Baidu', 'image', '8B; multilingual EN/ZH/JP. Prose; describe text-in-image explicitly.', TRUE, 5, NULL, NOW(), NOW()),
  (gen_random_uuid()::text, 'ernie-image-turbo', 'ERNIE-Image Turbo', 'Baidu', 'image', 'Fast multilingual. Concise prose.', TRUE, 6, NULL, NOW(), NOW()),
  (gen_random_uuid()::text, 'flux-1-1-pro-ultra', 'FLUX 1.1 [pro] Ultra', 'Black Forest Labs', 'image', '4MP, ultra-fast. Detailed natural prose; specify aspect ratio in API request.', TRUE, 7, NULL, NOW(), NOW()),
  (gen_random_uuid()::text, 'flux-1', 'FLUX.1', 'Black Forest Labs', 'image', 'Generic FLUX.1 family. Detailed natural prose; very literal; supports text rendering.', TRUE, 8, NULL, NOW(), NOW()),
  (gen_random_uuid()::text, 'flux-1-dev', 'FLUX.1 [dev]', 'Black Forest Labs', 'image', 'Open-weights commercial. Detailed prose; same style as pro; LoRA-friendly.', TRUE, 9, NULL, NOW(), NOW()),
  (gen_random_uuid()::text, 'flux-1-krea', 'FLUX.1 [krea]', 'Black Forest Labs', 'image', 'Krea-tuned aesthetic. Detailed prose; lean into editorial/cinematic vocabulary.', TRUE, 10, NULL, NOW(), NOW()),
  (gen_random_uuid()::text, 'flux-1-pro', 'FLUX.1 [pro]', 'Black Forest Labs', 'image', 'Original pro tier. Detailed prose; high fidelity.', TRUE, 11, NULL, NOW(), NOW()),
  (gen_random_uuid()::text, 'flux-1-1-pro', 'FLUX.1 [pro] v1.1', 'Black Forest Labs', 'image', 'Detailed prose; ~4.5s per image; commercial.', TRUE, 12, NULL, NOW(), NOW()),
  (gen_random_uuid()::text, 'flux-1-schnell', 'FLUX.1 [schnell]', 'Black Forest Labs', 'image', 'Open-weights, 1-4 step generation. Sacrifices fine detail — keep prompt tight and unambiguous.', TRUE, 13, NULL, NOW(), NOW()),
  (gen_random_uuid()::text, 'flux-1-kontext-pro', 'FLUX.1 Kontext [pro]', 'Black Forest Labs', 'image', 'TEXT + REFERENCE IMAGE input. Describe the edit (''change shirt to red, keep face and pose''). Preserves non-edited regions perfectly. Be surgical about what to change vs keep.', TRUE, 14, NULL, NOW(), NOW()),
  (gen_random_uuid()::text, 'flux-2-pro', 'FLUX.2 [pro]', 'Black Forest Labs', 'image', '32B foundation; unified gen+edit; multi-reference composition. DETAILED NATURAL PROSE — very literal. Specify subject, action, environment, lighting, lens. 4MP at high speed. Latest is FLUX.1.2 Pro Ultra (Feb 2026).', TRUE, 15, NULL, NOW(), NOW()),
  (gen_random_uuid()::text, 'bria-fibo', 'BRIA FIBO', 'BRIA', 'image', 'Enterprise; licensed data. Structured control — prose + style + composition fields.', TRUE, 16, NULL, NOW(), NOW()),
  (gen_random_uuid()::text, 'bria-fibo-edit', 'BRIA FIBO Edit', 'BRIA', 'image', 'JSON + Mask + Image control. Pass structured edit JSON; mask defines region.', TRUE, 17, NULL, NOW(), NOW()),
  (gen_random_uuid()::text, 'bria-rmbg', 'BRIA RMBG 2.0', 'BRIA', 'image', 'Background removal. No prose; licensed-data, commercial use.', TRUE, 18, NULL, NOW(), NOW()),
  (gen_random_uuid()::text, 'seedream-4', 'Seedream 4.0', 'ByteDance', 'image', 'Predecessor. Prose; unified architecture.', TRUE, 19, NULL, NOW(), NOW()),
  (gen_random_uuid()::text, 'seedream-4-5', 'Seedream 4.5', 'ByteDance', 'image', 'Unified gen+edit. Prose + optional reference; instruction-style edit prompts.', TRUE, 20, NULL, NOW(), NOW()),
  (gen_random_uuid()::text, 'seedream-5', 'Seedream 5.0', 'ByteDance', 'image', 'Full quality tier. Prose; multilingual (CN/EN); strong text rendering.', TRUE, 21, NULL, NOW(), NOW()),
  (gen_random_uuid()::text, 'seedream-5-lite', 'Seedream 5.0 Lite', 'ByteDance', 'image', 'Reasoning-aware editing model. Prose + reference image; describe edit instruction precisely.', TRUE, 22, NULL, NOW(), NOW()),
  (gen_random_uuid()::text, 'freepik-ai', 'Freepik AI Image', 'Freepik', 'image', 'Aggregator (Imagen, GPT, Mystic, Flux, 36 models). Prose; pick model per task.', TRUE, 23, NULL, NOW(), NOW()),
  (gen_random_uuid()::text, 'freepik-mystic', 'Freepik Mystic', 'Freepik', 'image', 'Freepik in-house (2.5 / 2.5 Flexible / 2.5 Fluid). Prose; commercial-safe.', TRUE, 24, NULL, NOW(), NOW()),
  (gen_random_uuid()::text, 'imagen-3', 'Imagen 3', 'Google', 'image', 'Predecessor. Natural prose; safe + detailed; aspect ratio + style hints.', TRUE, 25, NULL, NOW(), NOW()),
  (gen_random_uuid()::text, 'imagen-4', 'Imagen 4', 'Google', 'image', 'Up to 2K. Natural prose; aspect ratio in API; fast and ultra-fast tiers available.', TRUE, 26, NULL, NOW(), NOW()),
  (gen_random_uuid()::text, 'nano-banana-2', 'Nano Banana 2', 'Google', 'image', 'Speed-tuned SOTA. Prose; concise composition + style + lighting.', TRUE, 27, NULL, NOW(), NOW()),
  (gen_random_uuid()::text, 'nano-banana-pro', 'Nano Banana Pro', 'Google', 'image', '4K + near-perfect text rendering. Use template-style structure: subject, setting, lighting, style, text-content. Higgsfield publishes high-control templates.', TRUE, 28, NULL, NOW(), NOW()),
  (gen_random_uuid()::text, 'higgsfield-iconic', 'Higgsfield Iconic', 'Higgsfield', 'image', 'Iconic-poster-style image gen. Prose; lean into cinematic poster vocabulary.', TRUE, 29, NULL, NOW(), NOW()),
  (gen_random_uuid()::text, 'higgsfield-photodump', 'Higgsfield Photodump', 'Higgsfield', 'image', 'Build character once, generate scene variations. Pass character ref + scene list.', TRUE, 30, NULL, NOW(), NOW()),
  (gen_random_uuid()::text, 'higgsfield-soul-2', 'Higgsfield Soul 2.0', 'Higgsfield', 'image', 'Ultra-realistic fashion visuals. Prose with fashion vocabulary; describe garment, fabric, lighting.', TRUE, 31, NULL, NOW(), NOW()),
  (gen_random_uuid()::text, 'ideogram', 'Ideogram', 'Ideogram', 'image', 'Natural prose; STRONG text rendering — quote the exact text to render; specify font/style.', TRUE, 32, NULL, NOW(), NOW()),
  (gen_random_uuid()::text, 'ideogram-2', 'Ideogram 2.0', 'Ideogram', 'image', 'Predecessor with strong text rendering. Same prose + quoted-text approach.', TRUE, 33, NULL, NOW(), NOW()),
  (gen_random_uuid()::text, 'ideogram-3', 'Ideogram 3.0', 'Ideogram', 'image', 'Best-in-class text-in-image + typography. Natural prose; SPECIFY exact text content in quotes; specify font/style for typography. Custom Models for brand.', TRUE, 34, NULL, NOW(), NOW()),
  (gen_random_uuid()::text, 'imagineart-2', 'ImagineArt 2.0', 'ImagineArt', 'image', 'Visual reasoning; cinematic effects. Prose; describe scene + cinematic vocabulary.', TRUE, 35, NULL, NOW(), NOW()),
  (gen_random_uuid()::text, 'krea-1', 'Krea 1', 'Krea', 'image', 'Ultra-realistic flagship. Prose; cinematic vocabulary; native 4K via Krea Image.', TRUE, 36, NULL, NOW(), NOW()),
  (gen_random_uuid()::text, 'krea-image', 'Krea Image', 'Krea', 'image', 'Native 4K. Prose; product/editorial vocabulary.', TRUE, 37, NULL, NOW(), NOW()),
  (gen_random_uuid()::text, 'leonardo', 'Leonardo', 'Leonardo AI', 'image', 'Tag-style; element/style refs; negative prompt; lots of preset modifiers.', TRUE, 38, NULL, NOW(), NOW()),
  (gen_random_uuid()::text, 'leonardo-anime-xl', 'Leonardo Anime XL', 'Leonardo AI', 'image', 'Anime tag style.', TRUE, 39, NULL, NOW(), NOW()),
  (gen_random_uuid()::text, 'leonardo-phoenix', 'Leonardo Phoenix', 'Leonardo AI', 'image', 'Tag style + element/style refs + negative prompt + many preset modifiers. Use Element strength sliders.', TRUE, 40, NULL, NOW(), NOW()),
  (gen_random_uuid()::text, 'luma-photon', 'Luma Photon', 'Luma AI', 'image', 'Image gen. Prose; cinematic vocabulary.', TRUE, 41, NULL, NOW(), NOW()),
  (gen_random_uuid()::text, 'mage-space', 'Mage.space', 'Mage', 'image', 'SDXL aggregator; tag style + weighted parens.', TRUE, 42, NULL, NOW(), NOW()),
  (gen_random_uuid()::text, 'copilot-designer', 'Microsoft Copilot Designer', 'Microsoft', 'image', 'DALL·E 3-backed image generator inside Copilot. Natural prose; very literal interpretation. Specify medium, lighting, mood, camera angle. Commercial-safe filter is strict — avoid trademarked/celebrity prompts. English yields best fidelity.', TRUE, 43, NULL, NOW(), NOW()),
  (gen_random_uuid()::text, 'midjourney', 'Midjourney v6', 'Midjourney', 'image', 'Comma descriptors + --ar, --v 6, --style raw, --no <subject>, legacy --cref. No prose.', TRUE, 44, NULL, NOW(), NOW()),
  (gen_random_uuid()::text, 'midjourney-v7', 'Midjourney v7', 'Midjourney', 'image', 'Comma descriptors + --v 7. Same parameter set as v8: --oref (Omni Reference), --sref codes with --sv 1..6, --p personalization. No prose.', TRUE, 45, NULL, NOW(), NOW()),
  (gen_random_uuid()::text, 'midjourney-v8', 'Midjourney V8.1', 'Midjourney', 'image', 'Comma-separated descriptors + parameters. Use --ar 16:9, --v 8, --style raw, --raw, --oref <url> (Omni Reference replaces --cref), --sref <code> with --sv 1..6 (default 6), --sw <weight>, --p <profile> for personalization, --no <subject>. NO PROSE — descriptors only.', TRUE, 46, NULL, NOW(), NOW()),
  (gen_random_uuid()::text, 'nightcafe', 'NightCafe', 'NightCafe', 'image', 'Aggregator front-end (SDXL/SD3). Tag style or prose depending on backend.', TRUE, 47, NULL, NOW(), NOW()),
  (gen_random_uuid()::text, 'noobai-xl', 'NoobAI XL v-pred 1.0', 'NoobAI', 'image', 'Booru tags; v-prediction sampler required. Danbooru data through Nov 2025; very current character knowledge.', TRUE, 48, NULL, NOW(), NOW()),
  (gen_random_uuid()::text, 'nova-3dcg-xl', 'Nova 3DCG XL', 'Nova', 'image', 'Illustrious-based; PVC-figure look. Booru tags + style hint (''3D figure, anime style'').', TRUE, 49, NULL, NOW(), NOW()),
  (gen_random_uuid()::text, 'nova-anime-xl', 'Nova Anime XL', 'Nova', 'image', 'Illustrious + NoobAI merge. Booru tags; quality tags optional but help.', TRUE, 50, NULL, NOW(), NOW()),
  (gen_random_uuid()::text, 'illustrious-xl', 'Illustrious XL v2.0', 'OnomaAI', 'image', 'Booru-tag style; cleaner lines than Pony; anime/illustration. Quality tags + character/series tags work well.', TRUE, 51, NULL, NOW(), NOW()),
  (gen_random_uuid()::text, 'dall-e-3', 'DALL·E 3', 'OpenAI', 'image', 'Full-sentence prose, very literal. Specify medium (''oil painting''), lighting (''rim light''), mood, camera angle (''low angle''), composition.', TRUE, 52, NULL, NOW(), NOW()),
  (gen_random_uuid()::text, 'gpt-image-1', 'GPT Image 1', 'OpenAI', 'image', 'Natural prose; supports text rendering inside images; describe composition explicitly.', TRUE, 53, NULL, NOW(), NOW()),
  (gen_random_uuid()::text, 'gpt-image-1-mini', 'GPT Image 1 mini', 'OpenAI', 'image', 'Smaller, cheaper. Same prose style.', TRUE, 54, NULL, NOW(), NOW()),
  (gen_random_uuid()::text, 'gpt-image-1-5', 'GPT Image 1.5', 'OpenAI', 'image', 'Improved text + photoreal vs v1. Natural prose; describe composition + lighting.', TRUE, 55, NULL, NOW(), NOW()),
  (gen_random_uuid()::text, 'gpt-image-2', 'GPT Image 2', 'OpenAI', 'image', 'Sharp text rendering and detailed editing. Natural prose; describe composition, typography, materials. Edit endpoint accepts mask + instruction.', TRUE, 56, NULL, NOW(), NOW()),
  (gen_random_uuid()::text, 'playground-v3', 'Playground v3', 'Playground', 'image', 'Prose + style; product-photography-tuned; commercial templates.', TRUE, 57, NULL, NOW(), NOW()),
  (gen_random_uuid()::text, 'pony-diffusion-v6-xl', 'Pony Diffusion V6 XL', 'PurpleSmart', 'image', 'Booru-tag style. Required quality tags: ''score_9, score_8_up, score_7_up''. Strong character anatomy. Use comma-separated tags, weighted parens for emphasis.', TRUE, 58, NULL, NOW(), NOW()),
  (gen_random_uuid()::text, 'reve-edit', 'Reve Edit', 'Reve', 'image', 'Text-driven image transformation. Pass image + edit instruction in imperative voice.', TRUE, 59, NULL, NOW(), NOW()),
  (gen_random_uuid()::text, 'juggernaut-xl-v10', 'Juggernaut XL v10', 'RunDiffusion', 'image', 'Photoreal SDXL. Prose + photo terms (50mm, f/1.8, golden hour). Negative prompt important.', TRUE, 60, NULL, NOW(), NOW()),
  (gen_random_uuid()::text, 'realvis-xl-v4', 'RealVisXL V4.0', 'SG161222', 'image', 'Photoreal portraits. Prose + technical photo terms; minimal style words.', TRUE, 61, NULL, NOW(), NOW()),
  (gen_random_uuid()::text, 'sd-1-5', 'Stable Diffusion 1.5', 'Stability AI', 'image', 'Legacy. Tag-only; weighted parens; very CLIP-token sensitive. Negative prompt critical.', TRUE, 62, NULL, NOW(), NOW()),
  (gen_random_uuid()::text, 'sd-2-1', 'Stable Diffusion 2.1', 'Stability AI', 'image', 'Legacy. Tag style; CLIP-token sensitive.', TRUE, 63, NULL, NOW(), NOW()),
  (gen_random_uuid()::text, 'sd-3', 'Stable Diffusion 3', 'Stability AI', 'image', 'NL + tags hybrid; predecessor of 3.5.', TRUE, 64, NULL, NOW(), NOW()),
  (gen_random_uuid()::text, 'sd-3-5-large', 'Stable Diffusion 3.5 Large', 'Stability AI', 'image', 'Natural language + tags hybrid. Supports text rendering. Specify aspect ratio explicitly. Use CFG 4-7.', TRUE, 65, NULL, NOW(), NOW()),
  (gen_random_uuid()::text, 'sd-3-5-medium', 'Stable Diffusion 3.5 Medium', 'Stability AI', 'image', 'Smaller SD3.5; same prompt style.', TRUE, 66, NULL, NOW(), NOW()),
  (gen_random_uuid()::text, 'sd-3-5-turbo', 'Stable Diffusion 3.5 Turbo', 'Stability AI', 'image', 'Few-step; tighten prompt — model has less time to interpret.', TRUE, 67, NULL, NOW(), NOW()),
  (gen_random_uuid()::text, 'sdxl', 'Stable Diffusion XL', 'Stability AI', 'image', 'Tag-style + weighted parens (emphasis:1.3). Negative prompt section. Sampler hints (DPM++ 2M Karras). 1024x1024 native.', TRUE, 68, NULL, NOW(), NOW()),
  (gen_random_uuid()::text, 'hunyuan-image-2-1', 'HunyuanImage 2.1', 'Tencent', 'image', 'Native 2K. Prose; CN/EN.', TRUE, 69, NULL, NOW(), NOW()),
  (gen_random_uuid()::text, 'hunyuan-image-3', 'HunyuanImage 3.0', 'Tencent', 'image', 'Large unified multimodal autoregressive. Prose; CN/EN.', TRUE, 70, NULL, NOW(), NOW()),
  (gen_random_uuid()::text, 'tensor-art', 'TensorArt', 'TensorArt', 'image', 'SD checkpoint host; tag style; sampler/steps configurable per checkpoint.', TRUE, 71, NULL, NOW(), NOW()),
  (gen_random_uuid()::text, 'z-image-turbo', 'Z-Image Turbo', 'Tongyi-MAI', 'image', '6B; super-fast. Concise prompts.', TRUE, 72, NULL, NOW(), NOW()),
  (gen_random_uuid()::text, 'grok-imagine', 'Grok Imagine', 'xAI', 'image', 'Prose; precise edit endpoint; describe what to change vs preserve.', TRUE, 73, NULL, NOW(), NOW()),
  -- ── VIDEO ──
  (gen_random_uuid()::text, 'happy-horse', 'Happy Horse 1.0', 'Alibaba', 'video', '1080p native, native audio, multilingual lip-sync, 3-15s, multiple aspect ratios. Natural language video edit endpoint.', TRUE, 1, NULL, NOW(), NOW()),
  (gen_random_uuid()::text, 'wan-2-1', 'Wan 2.1', 'Alibaba', 'video', 'Predecessor; cinematic prose.', TRUE, 2, NULL, NOW(), NOW()),
  (gen_random_uuid()::text, 'wan-2-2', 'Wan 2.2', 'Alibaba', 'video', 'Open-source-friendly; high quality + motion diversity. Cinematic prose; image-to-video endpoint.', TRUE, 3, NULL, NOW(), NOW()),
  (gen_random_uuid()::text, 'wan-2-5', 'Wan 2.5', 'Alibaba', 'video', 'Higgsfield-hosted; high quality. Cinematic prose + camera DSL.', TRUE, 4, NULL, NOW(), NOW()),
  (gen_random_uuid()::text, 'bria-video-bg-removal', 'BRIA Video BG Removal', 'BRIA', 'video', 'No green-screen needed. Pass video; output is masked.', TRUE, 5, NULL, NOW(), NOW()),
  (gen_random_uuid()::text, 'seedance', 'Seedance', 'ByteDance', 'video', 'Cinematic prose; multi-shot sequences; describe motion + transitions.', TRUE, 6, NULL, NOW(), NOW()),
  (gen_random_uuid()::text, 'seedance-2', 'Seedance 2.0', 'ByteDance', 'video', 'Native audio; multi-shot editing. Cinematic prose; describe shot transitions. Reference-to-video accepts up to 9 images, 3 videos, 3 audio clips.', TRUE, 7, NULL, NOW(), NOW()),
  (gen_random_uuid()::text, 'seedance-2-fast', 'Seedance 2.0 Fast', 'ByteDance', 'video', 'Lower latency tier; same prose.', TRUE, 8, NULL, NOW(), NOW()),
  (gen_random_uuid()::text, 'genmo-mochi-1', 'Genmo Mochi 1', 'Genmo', 'video', 'Open-source artistic engine. Best for animated, surreal, stylized visuals; describe stylization explicitly.', TRUE, 9, NULL, NOW(), NOW()),
  (gen_random_uuid()::text, 'veo-2', 'Google Veo 2', 'Google', 'video', 'Predecessor. Cinematic prose; no native audio.', TRUE, 10, NULL, NOW(), NOW()),
  (gen_random_uuid()::text, 'veo-3', 'Google Veo 3', 'Google', 'video', 'Cinematic prose; shot-by-shot detail; native audio in clips; 4K capable.', TRUE, 11, NULL, NOW(), NOW()),
  (gen_random_uuid()::text, 'veo-3-1', 'Veo 3.1', 'Google', 'video', 'SOTA cinematic with native audio. Detailed prose: subject, action, camera, lens, lighting, atmosphere. First/last-frame mode for transitions; reference-to-video for multi-image.', TRUE, 12, NULL, NOW(), NOW()),
  (gen_random_uuid()::text, 'veo-3-1-fast', 'Veo 3.1 Fast', 'Google', 'video', 'Lower latency tier. Same prose style.', TRUE, 13, NULL, NOW(), NOW()),
  (gen_random_uuid()::text, 'veo-3-1-lite', 'Veo 3.1 Lite', 'Google', 'video', 'Cost-efficient Veo. Same cinematic prose; high-volume.', TRUE, 14, NULL, NOW(), NOW()),
  (gen_random_uuid()::text, 'heygen-video-agent', 'HeyGen Video Agent', 'HeyGen', 'video', 'Single prompt → full video. Spec-first; describe topic + audience + format + length.', TRUE, 15, NULL, NOW(), NOW()),
  (gen_random_uuid()::text, 'higgsfield-cinema-studio-2-5', 'Higgsfield Cinema Studio 2.5', 'Higgsfield', 'video', 'MCSLA; predecessor.', TRUE, 16, NULL, NOW(), NOW()),
  (gen_random_uuid()::text, 'higgsfield-cinema-studio-3', 'Higgsfield Cinema Studio 3.0', 'Higgsfield', 'video', 'Same MCSLA formula; one move + one action per shot.', TRUE, 17, NULL, NOW(), NOW()),
  (gen_random_uuid()::text, 'higgsfield-cinema-studio-3-5', 'Higgsfield Cinema Studio 3.5', 'Higgsfield', 'video', 'Director-mode. MCSLA formula: Motion + Camera + Subject + Lighting + Atmosphere. Use 6 variables for max impact. ONE camera move + ONE subject action per shot. Place dialogue in dedicated ''Dialogue:'' block for accurate lip-sync.', TRUE, 18, NULL, NOW(), NOW()),
  (gen_random_uuid()::text, 'higgsfield-marketing-studio', 'Higgsfield Marketing Studio', 'Higgsfield', 'video', 'Product link + prose → ad video. Describe target audience + USP + tone.', TRUE, 19, NULL, NOW(), NOW()),
  (gen_random_uuid()::text, 'higgsfield-motion-control', 'Higgsfield Motion Control', 'Higgsfield', 'video', 'Up to 30s; precise character actions and expressions. Specify expression beats over time.', TRUE, 20, NULL, NOW(), NOW()),
  (gen_random_uuid()::text, 'higgsfield-steal', 'Higgsfield Steal', 'Higgsfield', 'video', 'Style transfer of a reference video. Pass reference + your prose; output mimics reference style.', TRUE, 21, NULL, NOW(), NOW()),
  (gen_random_uuid()::text, 'higgsfield-wan-camera-control', 'Higgsfield WAN Camera Control', 'Higgsfield', 'video', 'Wan-based camera DSL. Specify camera move + subject action; one of each per shot.', TRUE, 22, NULL, NOW(), NOW()),
  (gen_random_uuid()::text, 'kling', 'Kling', 'Kuaishou', 'video', 'Detailed prose; strong human motion; specify camera + motion clearly.', TRUE, 23, NULL, NOW(), NOW()),
  (gen_random_uuid()::text, 'kling-1-6', 'Kling 1.6', 'Kuaishou', 'video', 'Legacy. Cinematic prose.', TRUE, 24, NULL, NOW(), NOW()),
  (gen_random_uuid()::text, 'kling-2-1-master', 'Kling 2.1 Master', 'Kuaishou', 'video', 'Premium tier. Detailed cinematic prose.', TRUE, 25, NULL, NOW(), NOW()),
  (gen_random_uuid()::text, 'kling-2-1-pro', 'Kling 2.1 Pro', 'Kuaishou', 'video', 'Camera control; pro endpoint.', TRUE, 26, NULL, NOW(), NOW()),
  (gen_random_uuid()::text, 'kling-2-5-turbo-pro', 'Kling 2.5 Turbo Pro', 'Kuaishou', 'video', 'Motion fluidity, cinematic. Detailed prose + camera.', TRUE, 27, NULL, NOW(), NOW()),
  (gen_random_uuid()::text, 'kling-3', 'Kling 3.0', 'Kuaishou', 'video', 'Cinematic prose; native audio; 15s with character consistency; 4K. ELO #1 (1243). Detailed motion + camera + lighting.', TRUE, 28, NULL, NOW(), NOW()),
  (gen_random_uuid()::text, 'kling-3-4k', 'Kling 3.0 4K', 'Kuaishou', 'video', 'Native 4K text-to-video. Detailed cinematic prose.', TRUE, 29, NULL, NOW(), NOW()),
  (gen_random_uuid()::text, 'kling-3-pro', 'Kling 3.0 Pro', 'Kuaishou', 'video', 'Pro endpoint; image-to-video. Cinematic prose + camera move tokens.', TRUE, 30, NULL, NOW(), NOW()),
  (gen_random_uuid()::text, 'kling-o3-4k', 'Kling O3 4K', 'Kuaishou', 'video', 'Premium 4K. Same cinematic prose.', TRUE, 31, NULL, NOW(), NOW()),
  (gen_random_uuid()::text, 'kling-o3-standard', 'Kling O3 Standard', 'Kuaishou', 'video', 'Start/end-frame animation; describe transition between two images.', TRUE, 32, NULL, NOW(), NOW()),
  (gen_random_uuid()::text, 'ltx-video', 'LTX Video', 'Lightricks', 'video', 'Generic LTX. Concise prose; image-to-video.', TRUE, 33, NULL, NOW(), NOW()),
  (gen_random_uuid()::text, 'ltx-video-13b', 'LTX Video 13B Distilled', 'Lightricks', 'video', 'LoRA-friendly base. Concise prose + LoRA control.', TRUE, 34, NULL, NOW(), NOW()),
  (gen_random_uuid()::text, 'ltx-2-19b', 'LTX-2 19B', 'Lightricks', 'video', 'Image-to-video + audio gen. Concise prose; describe motion + audio intent.', TRUE, 35, NULL, NOW(), NOW()),
  (gen_random_uuid()::text, 'ltx-2-3-22b', 'LTX-2.3 22B', 'Lightricks', 'video', 'Reference-video-to-video. Pass reference + edit prose; supports LoRA.', TRUE, 36, NULL, NOW(), NOW()),
  (gen_random_uuid()::text, 'luma-dream-machine', 'Luma Dream Machine', 'Luma AI', 'video', 'Brief cinematic prose; camera motion explicit; supports start+end frames.', TRUE, 37, NULL, NOW(), NOW()),
  (gen_random_uuid()::text, 'luma', 'Luma Dream Machine (legacy)', 'Luma AI', 'video', 'Legacy entry; supports start+end frames; brief cinematic prose.', TRUE, 38, NULL, NOW(), NOW()),
  (gen_random_uuid()::text, 'luma-ray-2', 'Luma Ray 2', 'Luma AI', 'video', 'Predecessor. Cinematic prose + camera moves.', TRUE, 39, NULL, NOW(), NOW()),
  (gen_random_uuid()::text, 'luma-ray-3', 'Luma Ray 3', 'Luma AI', 'video', 'Hi-Fi 4K HDR; superior physics. Cinematic prose + camera DSL (dolly, crane, pan, tilt). Specify shot length + lens.', TRUE, 40, NULL, NOW(), NOW()),
  (gen_random_uuid()::text, 'hailuo', 'Hailuo (MiniMax)', 'MiniMax', 'video', 'Detailed prose; strong realism; describe subject, camera, and lighting.', TRUE, 41, NULL, NOW(), NOW()),
  (gen_random_uuid()::text, 'hailuo-02', 'Hailuo 02', 'MiniMax', 'video', 'Detailed prose; strong realism. Describe subject, camera, lighting; tight on physics.', TRUE, 42, NULL, NOW(), NOW()),
  (gen_random_uuid()::text, 'mirelo-sfx-v2v', 'Mirelo SFX Video-to-Video', 'Mirelo', 'video', 'Audio synced to video output.', TRUE, 43, NULL, NOW(), NOW()),
  (gen_random_uuid()::text, 'sora', 'Sora (v1)', 'OpenAI', 'video', 'DEPRECATED 2026-04-26 web app; API to 2026-09-24. Migrate to Sora 2.', TRUE, 44, NULL, NOW(), NOW()),
  (gen_random_uuid()::text, 'sora-2', 'Sora 2', 'OpenAI', 'video', 'Cinematic prose; up to 20s. Specify camera move, lens (35mm/50mm/85mm), lighting, subject action, environment. Native audio. Reusable character refs supported on Pro.', TRUE, 45, NULL, NOW(), NOW()),
  (gen_random_uuid()::text, 'sora-2-characters', 'Sora 2 Characters', 'OpenAI', 'video', 'Character ID generation. Provide character image + description; reuse in subsequent shots.', TRUE, 46, NULL, NOW(), NOW()),
  (gen_random_uuid()::text, 'sora-2-i2v', 'Sora 2 Image-to-Video', 'OpenAI', 'video', 'Image + motion intent + camera move. Keep face/identity consistent — describe motion not subject.', TRUE, 47, NULL, NOW(), NOW()),
  (gen_random_uuid()::text, 'sora-2-pro', 'Sora 2 Pro', 'OpenAI', 'video', '1080p; reusable character references. Same cinematic prose; explicitly name reused characters.', TRUE, 48, NULL, NOW(), NOW()),
  (gen_random_uuid()::text, 'sora-2-remix', 'Sora 2 Video-to-Video Remix', 'OpenAI', 'video', 'Style-change instruction on existing video. Imperative: ''restyle as anime, keep motion''.', TRUE, 49, NULL, NOW(), NOW()),
  (gen_random_uuid()::text, 'pika', 'Pika', 'Pika', 'video', 'Short prose; supports camera moves (zoom_in, pan_right) + lip-sync mode.', TRUE, 50, NULL, NOW(), NOW()),
  (gen_random_uuid()::text, 'pika-2', 'Pika 2.0', 'Pika', 'video', 'Camera-token syntax; lipsync mode.', TRUE, 51, NULL, NOW(), NOW()),
  (gen_random_uuid()::text, 'pika-2-1', 'Pika 2.1', 'Pika', 'video', 'Same camera-token syntax.', TRUE, 52, NULL, NOW(), NOW()),
  (gen_random_uuid()::text, 'pika-2-2', 'Pika 2.2', 'Pika', 'video', 'Same camera-token syntax. Concise prose.', TRUE, 53, NULL, NOW(), NOW()),
  (gen_random_uuid()::text, 'pika-2-5', 'Pika 2.5', 'Pika', 'video', 'Prose + camera-move TOKENS: zoom_in, pan_right, tilt_up, dolly_forward. Effects tools accessible. Lipsync mode for talking subjects.', TRUE, 54, NULL, NOW(), NOW()),
  (gen_random_uuid()::text, 'pixverse-v6', 'PixVerse V6', 'PixVerse', 'video', 'Lifelike physics; cinematic; sync audio + camera control. Detailed prose + camera move.', TRUE, 55, NULL, NOW(), NOW()),
  (gen_random_uuid()::text, 'runway-act-one', 'Runway Act-One', 'Runway', 'video', 'Performance-driven character animation. Pass VIDEO REFERENCE of acting performance + character image. Don''t describe motion in text — let the reference drive it.', TRUE, 56, NULL, NOW(), NOW()),
  (gen_random_uuid()::text, 'runway-gen3', 'Runway Gen-3 Alpha', 'Runway', 'video', 'Short shot description, motion verbs, lens/aspect ratio, max 10s clips.', TRUE, 57, NULL, NOW(), NOW()),
  (gen_random_uuid()::text, 'runway-gen3-turbo', 'Runway Gen-3 Turbo', 'Runway', 'video', 'Faster Gen-3; same style.', TRUE, 58, NULL, NOW(), NOW()),
  (gen_random_uuid()::text, 'runway-gen4', 'Runway Gen-4', 'Runway', 'video', 'Improved fidelity over Gen-3; same prompt style; supports references for consistency.', TRUE, 59, NULL, NOW(), NOW()),
  (gen_random_uuid()::text, 'runway-gen4-turbo', 'Runway Gen-4 Turbo', 'Runway', 'video', 'Faster Gen-4; concise shot descriptions; lower cost.', TRUE, 60, NULL, NOW(), NOW()),
  (gen_random_uuid()::text, 'runway-gen-4-5', 'Runway Gen-4.5', 'Runway', 'video', 'SOTA cinematic. Concise shot prose, motion verbs, lens/aspect; 10s clips. References for character consistency.', TRUE, 61, NULL, NOW(), NOW()),
  (gen_random_uuid()::text, 'stable-video-diffusion', 'Stable Video Diffusion', 'Stability AI', 'video', 'Image-to-video. Describe motion intent and camera move; short prose.', TRUE, 62, NULL, NOW(), NOW()),
  (gen_random_uuid()::text, 'hunyuan-video', 'Hunyuan Video', 'Tencent', 'video', 'Predecessor. Cinematic prose.', TRUE, 63, NULL, NOW(), NOW()),
  (gen_random_uuid()::text, 'hunyuan-video-1-5', 'Hunyuan Video 1.5', 'Tencent', 'video', 'Self-hostable on consumer hardware. Cinematic prose; describe motion + camera.', TRUE, 64, NULL, NOW(), NOW()),
  -- ── AUDIO ──
  (gen_random_uuid()::text, 'beatoven-sfx', 'Beatoven Sound Effects', 'Beatoven', 'audio', 'Pro SFX library generation. Describe target sound.', TRUE, 1, NULL, NOW(), NOW()),
  (gen_random_uuid()::text, 'seed-tts', 'Seed-TTS', 'ByteDance', 'audio', 'High-fidelity; CN/EN. Plain script + voice.', TRUE, 2, NULL, NOW(), NOW()),
  (gen_random_uuid()::text, 'cartesia-sonic', 'Cartesia Sonic', 'Cartesia', 'audio', 'Latency leader (~40ms TTFB). Voice ID + plain script. For voice agents where the model must respond before the user finishes speaking.', TRUE, 3, NULL, NOW(), NOW()),
  (gen_random_uuid()::text, 'cartesia-sonic-2', 'Cartesia Sonic-2', 'Cartesia', 'audio', 'Updated Sonic. Same low-latency style.', TRUE, 4, NULL, NOW(), NOW()),
  (gen_random_uuid()::text, 'cohere-transcribe', 'Cohere Transcribe', 'Cohere', 'audio', 'Business audio transcription. No prompt; pass audio + (optional) language hint.', TRUE, 5, NULL, NOW(), NOW()),
  (gen_random_uuid()::text, 'deepgram-aura-2', 'Deepgram Aura-2', 'Deepgram', 'audio', 'Real-time voice agents (~90ms TTFB). Voice ID + plain script. Use for low-latency conversational AI.', TRUE, 6, NULL, NOW(), NOW()),
  (gen_random_uuid()::text, 'elevenlabs', 'ElevenLabs', 'ElevenLabs', 'audio', 'Plain script + voice/style/speed metadata; SSML-lite for pauses (<break time="500ms"/>).', TRUE, 7, NULL, NOW(), NOW()),
  (gen_random_uuid()::text, 'elevenlabs-flash-v2-5', 'ElevenLabs Flash v2.5', 'ElevenLabs', 'audio', 'Realtime; sub-second TTFB. Plain script; minimal SSML; for streaming agents.', TRUE, 8, NULL, NOW(), NOW()),
  (gen_random_uuid()::text, 'elevenlabs-multilingual-v2', 'ElevenLabs Multilingual v2', 'ElevenLabs', 'audio', 'Quality leader for narration. Plain script + voice/style/speed metadata. SSML-lite for pauses: <break time="500ms"/>. Punctuation drives natural pacing.', TRUE, 9, NULL, NOW(), NOW()),
  (gen_random_uuid()::text, 'elevenlabs-turbo-v2-5', 'ElevenLabs Turbo v2.5', 'ElevenLabs', 'audio', 'Interactive; lower latency. Same script style as v3 minus emotion tags; punctuation drives pacing.', TRUE, 10, NULL, NOW(), NOW()),
  (gen_random_uuid()::text, 'elevenlabs-v3', 'ElevenLabs v3', 'ElevenLabs', 'audio', 'Improved naturalness. EMOTION TAGS supported: [whispers], [excited], [sighs], [laughs]. SSML-lite for pauses.', TRUE, 11, NULL, NOW(), NOW()),
  (gen_random_uuid()::text, 'gemini-2-5-flash-tts', 'Gemini 2.5 Flash TTS', 'Google', 'audio', 'Predecessor. Plain script; low-latency.', TRUE, 12, NULL, NOW(), NOW()),
  (gen_random_uuid()::text, 'gemini-3-1-flash-live', 'Gemini 3.1 Flash Live', 'Google', 'audio', 'Audio-to-audio live dialogue. System prompt + tools; turn-taking.', TRUE, 13, NULL, NOW(), NOW()),
  (gen_random_uuid()::text, 'gemini-3-1-flash-tts', 'Gemini 3.1 Flash TTS', 'Google', 'audio', 'Granular AUDIO TAGS for expression; 30 voices; 70+ languages. Plain script + tags for emphasis/emotion.', TRUE, 14, NULL, NOW(), NOW()),
  (gen_random_uuid()::text, 'chirp', 'Google Chirp', 'Google', 'audio', 'Speech recognition. No prompt-style; pass audio + language.', TRUE, 15, NULL, NOW(), NOW()),
  (gen_random_uuid()::text, 'hume-evi-2', 'Hume EVI 2', 'Hume', 'audio', 'Predecessor. Same empathic speech-to-speech.', TRUE, 16, NULL, NOW(), NOW()),
  (gen_random_uuid()::text, 'hume-evi-3', 'Hume EVI 3', 'Hume', 'audio', 'Empathic Voice Interface. Speech-to-speech; READS EMOTION in user voice and adjusts. Pass conversational context; no SSML — emotion is inferred.', TRUE, 17, NULL, NOW(), NOW()),
  (gen_random_uuid()::text, 'inworld-tts', 'Inworld TTS-1.5 Max', 'Inworld', 'audio', 'Natural speech synthesis. Plain script + voice; emotion supported.', TRUE, 18, NULL, NOW(), NOW()),
  (gen_random_uuid()::text, 'microsoft-copilot-voice', 'Microsoft Copilot Voice', 'Microsoft', 'audio', 'Conversational voice chat. Short turns; no markdown (it''ll be spoken). Supports natural interruption. Specify desired voice (Canyon, Wave, Meadow, Grove). Avoid long lists — use natural sentences.', TRUE, 19, NULL, NOW(), NOW()),
  (gen_random_uuid()::text, 'minimax-speech-02-hd', 'MiniMax Speech-02 HD', 'MiniMax', 'audio', 'TTS; high quality. Plain script + voice; CN/EN.', TRUE, 20, NULL, NOW(), NOW()),
  (gen_random_uuid()::text, 'mirelo-sfx-v2a', 'Mirelo SFX Video-to-Audio', 'Mirelo', 'audio', 'Sound-effect generation synced to video. Pass video + (optional) text describing target SFX.', TRUE, 21, NULL, NOW(), NOW()),
  (gen_random_uuid()::text, 'murf', 'Murf', 'Murf', 'audio', 'Script + style; supports tone (friendly, professional) + emphasis tags.', TRUE, 22, NULL, NOW(), NOW()),
  (gen_random_uuid()::text, 'nemotron-3-nano-omni-audio', 'NVIDIA Nemotron Omni Audio', 'NVIDIA', 'audio', 'Audio understanding (input). Describe what to extract from audio.', TRUE, 23, NULL, NOW(), NOW()),
  (gen_random_uuid()::text, 'openai-realtime', 'OpenAI Realtime API', 'OpenAI', 'audio', 'Speech-to-speech. System instruction + tools; turn-taking; sub-second TTFB.', TRUE, 24, NULL, NOW(), NOW()),
  (gen_random_uuid()::text, 'openai-tts', 'OpenAI TTS-1 / HD', 'OpenAI', 'audio', 'Plain script. Voices: alloy, echo, fable, onyx, nova, shimmer. Minimal SSML; punctuation drives pacing. Use HD for narration, 1 for chat.', TRUE, 25, NULL, NOW(), NOW()),
  (gen_random_uuid()::text, 'whisper', 'Whisper', 'OpenAI', 'audio', 'Transcription/translation only. No prompt-style needed; pass audio + language hint.', TRUE, 26, NULL, NOW(), NOW()),
  (gen_random_uuid()::text, 'playai-dialog', 'PlayDialog', 'Play.ai', 'audio', 'Multi-speaker dialogue (2 voices). Format: ''Speaker1: ...\nSpeaker2: ...''. SSML supported.', TRUE, 27, NULL, NOW(), NOW()),
  (gen_random_uuid()::text, 'playht', 'PlayHT', 'Play.ai', 'audio', 'Script + voice ID; SSML supported; speed / pitch parameters.', TRUE, 28, NULL, NOW(), NOW()),
  (gen_random_uuid()::text, 'playht-3', 'PlayHT Play 3.0', 'Play.ai', 'audio', 'Quality narration. SSML supported; speed/pitch params. Pick from Play voice library.', TRUE, 29, NULL, NOW(), NOW()),
  (gen_random_uuid()::text, 'chatterbox-tts', 'Chatterbox TTS', 'Resemble AI', 'audio', 'For memes/games/videos; voice clone capable.', TRUE, 30, NULL, NOW(), NOW()),
  (gen_random_uuid()::text, 'resemble', 'Resemble AI', 'Resemble AI', 'audio', 'Script + voice ID; emotion + pacing tags supported.', TRUE, 31, NULL, NOW(), NOW()),
  (gen_random_uuid()::text, 'wellsaid', 'WellSaid Studio', 'WellSaid', 'audio', 'Enterprise narration. Preset voices; pronunciation hints supported.', TRUE, 32, NULL, NOW(), NOW()),
  (gen_random_uuid()::text, 'grok-tts', 'Grok TTS', 'xAI', 'audio', '5 voices, 20 languages. Plain script.', TRUE, 33, NULL, NOW(), NOW()),
  -- ── MUSIC ──
  (gen_random_uuid()::text, 'aiva', 'AIVA', 'AIVA', 'music', 'Genre + mood + duration + key/tempo. Instrumental focus, classical-friendly. Full copyright on Pro.', TRUE, 1, NULL, NOW(), NOW()),
  (gen_random_uuid()::text, 'beatoven-music', 'Beatoven Music Generation', 'Beatoven', 'music', 'Royalty-free instrumental. Mood + genre + tempo.', TRUE, 2, NULL, NOW(), NOW()),
  (gen_random_uuid()::text, 'boomy', 'Boomy', 'Boomy', 'music', 'Style preset → instant song. No prompt skill — just pick a preset.', TRUE, 3, NULL, NOW(), NOW()),
  (gen_random_uuid()::text, 'lyria-3-clip', 'Lyria 3 Clip', 'Google', 'music', 'Up to 30s loops/previews. Prose; concise.', TRUE, 4, NULL, NOW(), NOW()),
  (gen_random_uuid()::text, 'lyria-3-pro', 'Lyria 3 Pro', 'Google', 'music', 'Full-length songs. Prose: genre, mood, instruments, structure.', TRUE, 5, NULL, NOW(), NOW()),
  (gen_random_uuid()::text, 'musiclm', 'MusicLM', 'Google', 'music', 'Natural prose: genre, mood, instruments, tempo. No lyrics control.', TRUE, 6, NULL, NOW(), NOW()),
  (gen_random_uuid()::text, 'minimax-music-2-5', 'MiniMax Music 2.5', 'MiniMax', 'music', 'Predecessor. Same prose + lyrics format.', TRUE, 7, NULL, NOW(), NOW()),
  (gen_random_uuid()::text, 'minimax-music-2-6', 'MiniMax Music 2.6', 'MiniMax', 'music', 'Singing + backing music. Auto-lyrics option; full-length songs. Prose for style + (optional) lyrics block.', TRUE, 8, NULL, NOW(), NOW()),
  (gen_random_uuid()::text, 'mubert', 'Mubert', 'Mubert', 'music', 'Real-time generative streams. Mood + tempo via API; loop-friendly for apps/games/streams.', TRUE, 9, NULL, NOW(), NOW()),
  (gen_random_uuid()::text, 'soundraw', 'Soundraw', 'Soundraw', 'music', 'NO TEXT PROMPTS. Select mood/genre/theme/instrument; adjust audio blocks. Use selectors only.', TRUE, 10, NULL, NOW(), NOW()),
  (gen_random_uuid()::text, 'stable-audio', 'Stable Audio', 'Stability AI', 'music', 'Tag-style: genre, mood, instruments, tempo, length; deterministic prompts.', TRUE, 11, NULL, NOW(), NOW()),
  (gen_random_uuid()::text, 'stable-audio-2', 'Stable Audio 2.0', 'Stability AI', 'music', 'Tag style: genre, mood, instruments, tempo, length. Deterministic; great for SFX + loops + short clips.', TRUE, 12, NULL, NOW(), NOW()),
  (gen_random_uuid()::text, 'stable-audio-open', 'Stable Audio Open', 'Stability AI', 'music', 'Open-weights. Tag style; SFX + loops.', TRUE, 13, NULL, NOW(), NOW()),
  (gen_random_uuid()::text, 'suno', 'Suno', 'Suno', 'music', E'TWO-BLOCK FORMAT, mandatory.\n\n[STYLE] block: comma-separated descriptors covering genre+sub-genre, era, mood, instrumentation, production texture, BPM (number), key signature optional. NO sentences, NO prose, NO "the song should...". Max ~200 chars.\n\n[LYRICS] block: structure tags REQUIRED on their own lines: [Intro], [Verse], [Pre-Chorus], [Chorus], [Bridge], [Outro], [Instrumental]. Lyrics below each tag. Use open vowels (a/o/e) on long notes, hard consonants on emphasis.\n\nINSTRUMENTAL: omit lyrics entirely; replace with single [Instrumental] tag + brief direction.\n\nLANGUAGE: English descriptors yield best style fidelity even when lyrics are non-English.\n\nANTI-PATTERNS: prose ("write a song that..."), narrative meta ("the song should be about..."), missing structure tags, BPM as text instead of number, mixing style and lyrics in one block.', TRUE, 14, NULL, NOW(), NOW()),
  (gen_random_uuid()::text, 'suno-v4', 'Suno v4', 'Suno', 'music', E'Same TWO-BLOCK FORMAT as Suno v5 (predecessor). [STYLE] block + [LYRICS] block with [Verse]/[Chorus]/[Bridge]/[Outro] tags. Slightly weaker melodic coherence than v5; favor explicit BPM and key. Same anti-patterns: no prose, no narrative meta.', TRUE, 15, NULL, NOW(), NOW()),
  (gen_random_uuid()::text, 'suno-v4-5', 'Suno v4.5', 'Suno', 'music', E'TWO-BLOCK FORMAT.\n\n[STYLE] block (~200 chars max): genre + sub-genre, era, mood, instrumentation, production, BPM, optional key. Comma-separated tags, NO prose.\n\n[LYRICS] block: [Verse], [Chorus], [Bridge], [Outro] tags REQUIRED. Instrumental toggle: replace lyrics with [Instrumental].\n\nv4.5 vs v5 differences: shorter max song length; slightly less coherent transitions. Recommend explicit [Bridge] for >2-min songs.', TRUE, 16, NULL, NOW(), NOW()),
  (gen_random_uuid()::text, 'suno-v5', 'Suno v5', 'Suno', 'music', E'TWO-BLOCK FORMAT, mandatory. Released 2025-09-23.\n\n[STYLE] block (max ~200 chars): comma-separated descriptors only. Cover: genre + sub-genre, era (e.g. "80s synth", "Romantic-era classical"), mood (uplifting/melancholic/wistful — NOT generic happy/sad), instrumentation (specific: "rhodes piano", "808 sub-bass", "full string section"), production texture ("tape saturation", "lo-fi crackle", "polished pop mix"), BPM as number (not "fast"), key signature optional. NO sentences. NO prose.\n\n[LYRICS] block: structure tags REQUIRED, each on its own line: [Intro], [Verse], [Pre-Chorus], [Chorus], [Bridge], [Outro], [Instrumental Intro], [Instrumental Outro]. Lyrics below each tag. Singability rules: open vowels (a/o/e) on long notes, hard consonants (k/t/p) on rhythmic emphasis, syllable count matches BPM (faster = fewer syllables/bar).\n\nINSTRUMENTAL: omit lyrics block entirely; in style block add "instrumental, no vocals", and append [Instrumental] tag with brief musical direction.\n\nLANGUAGE: lyrics in any language; English descriptors recommended. Mixing languages allowed if intentional.\n\nANTI-PATTERNS: narrative prose ("we are creating..."), generic mood ("good music"), missing structure tags, BPM as text ("fast"), single-block format mixing style and lyrics, "the song talks about..." meta-commentary.', TRUE, 17, NULL, NOW(), NOW()),
  (gen_random_uuid()::text, 'udio', 'Udio', 'Udio', 'music', E'TAG-DRIVEN FORMAT.\n\nFirst block: comma-separated tags only — genre, sub-genre, mood, era (e.g. "1970s funk", "synthwave"), instruments (specific: "Wurlitzer electric piano", "808 drums"), tempo (BPM as number), key (optional), production style ("vinyl warmth", "analog tape"), vocal style if applicable ("male tenor", "female alto", "no vocals").\n\nSecond block (optional, separated by blank line): [Lyrics] header followed by structure-tagged lyrics ([Verse], [Chorus], [Bridge]). Omit entire lyrics block for instrumental tracks.\n\nNARRATION: never. NO prose ("write a song that..."), NO storytelling meta-commentary. Tags only in block 1.\n\nUdio prefers MORE tags than fewer — granular instrumentation pays off (vs Suno which prefers concise).', TRUE, 18, NULL, NOW(), NOW()),
  (gen_random_uuid()::text, 'udio-v2', 'Udio v2', 'Udio', 'music', E'TAG-DRIVEN FORMAT (v2 — adds remixing + stem download).\n\nFirst block: granular comma-separated tags. Cover: genre + sub-genre, era, mood (specific: "wistful", "triumphant", "melancholic" — not generic "happy/sad"), instruments (specific brand/model where useful: "Rhodes Mark II", "Roland TR-808"), BPM as number, key optional, production style ("dusty vinyl", "polished modern pop"), vocal style ("male tenor with reverb", "instrumental").\n\nSecond block (optional): [Lyrics]\\n[Verse]/[Chorus]/[Bridge] structure-tagged lyrics. Omit fully for instrumental.\n\nv2 advantages: better stem separation if you plan to remix → tag instruments distinctly so they isolate cleanly.\n\nANTI-PATTERNS: prose, narrative meta, generic mood words, BPM as text, missing structure tags in lyrics block.', TRUE, 19, NULL, NOW(), NOW())
ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name,
  provider = EXCLUDED.provider,
  modality = EXCLUDED.modality,
  "promptStyleHint" = EXCLUDED."promptStyleHint",
  "sortOrder" = EXCLUDED."sortOrder",
  "isActive" = TRUE,
  "updatedAt" = NOW();

-- ─── Question Templates (questioner AI'a havuz olarak verilir) ───
-- Modality bazlı; AI bu havuzdan seçer veya intent'e göre türetir.
INSERT INTO "QuestionTemplate" (id, modality, category, question, options, weight, "isActive", "createdAt", "updatedAt")
SELECT gen_random_uuid()::text, 'text', NULL, 'Who is the primary audience?',
  '["General consumer","Technical professional","Business decision-maker","Custom..."]'::jsonb, 10, TRUE, NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM "QuestionTemplate" WHERE question='Who is the primary audience?' AND modality='text');

INSERT INTO "QuestionTemplate" (id, modality, category, question, options, weight, "isActive", "createdAt", "updatedAt")
SELECT gen_random_uuid()::text, 'text', NULL, 'What tone should the output have?',
  '["Professional","Friendly","Bold","Witty","Custom..."]'::jsonb, 9, TRUE, NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM "QuestionTemplate" WHERE question='What tone should the output have?' AND modality='text');

INSERT INTO "QuestionTemplate" (id, modality, category, question, options, weight, "isActive", "createdAt", "updatedAt")
SELECT gen_random_uuid()::text, 'text', NULL, 'How long should the output be?',
  '["Short (≤100 words)","Medium (100–300)","Long (300+)","Custom..."]'::jsonb, 8, TRUE, NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM "QuestionTemplate" WHERE question='How long should the output be?' AND modality='text');

INSERT INTO "QuestionTemplate" (id, modality, category, question, options, weight, "isActive", "createdAt", "updatedAt")
SELECT gen_random_uuid()::text, 'text', NULL, 'What is the primary call to action?',
  '["Sign up","Buy now","Learn more","Share","Custom..."]'::jsonb, 7, TRUE, NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM "QuestionTemplate" WHERE question='What is the primary call to action?' AND modality='text');

INSERT INTO "QuestionTemplate" (id, modality, category, question, options, weight, "isActive", "createdAt", "updatedAt")
SELECT gen_random_uuid()::text, 'code', NULL, 'Which language/framework?',
  '["TypeScript / React","Python","Go","Rust","Custom..."]'::jsonb, 10, TRUE, NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM "QuestionTemplate" WHERE question='Which language/framework?' AND modality='code');

INSERT INTO "QuestionTemplate" (id, modality, category, question, options, weight, "isActive", "createdAt", "updatedAt")
SELECT gen_random_uuid()::text, 'code', NULL, 'What output format do you need?',
  '["Function only","Function + tests","Full module","Just explanation","Custom..."]'::jsonb, 9, TRUE, NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM "QuestionTemplate" WHERE question='What output format do you need?' AND modality='code');

INSERT INTO "QuestionTemplate" (id, modality, category, question, options, weight, "isActive", "createdAt", "updatedAt")
SELECT gen_random_uuid()::text, 'code', NULL, 'Any constraints (perf, deps, style)?',
  '["No external deps","Functional style","Async / await","Custom..."]'::jsonb, 8, TRUE, NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM "QuestionTemplate" WHERE question='Any constraints (perf, deps, style)?' AND modality='code');

INSERT INTO "QuestionTemplate" (id, modality, category, question, options, weight, "isActive", "createdAt", "updatedAt")
SELECT gen_random_uuid()::text, 'image', NULL, 'What style?',
  '["Photorealistic","Illustration","3D render","Anime","Custom..."]'::jsonb, 10, TRUE, NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM "QuestionTemplate" WHERE question='What style?' AND modality='image');

INSERT INTO "QuestionTemplate" (id, modality, category, question, options, weight, "isActive", "createdAt", "updatedAt")
SELECT gen_random_uuid()::text, 'image', NULL, 'Aspect ratio?',
  '["Square 1:1","Landscape 16:9","Portrait 9:16","Cinema 21:9","Custom..."]'::jsonb, 9, TRUE, NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM "QuestionTemplate" WHERE question='Aspect ratio?' AND modality='image');

INSERT INTO "QuestionTemplate" (id, modality, category, question, options, weight, "isActive", "createdAt", "updatedAt")
SELECT gen_random_uuid()::text, 'image', NULL, 'Lighting and mood?',
  '["Bright, optimistic","Moody, dramatic","Soft, natural","Neon, futuristic","Custom..."]'::jsonb, 8, TRUE, NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM "QuestionTemplate" WHERE question='Lighting and mood?' AND modality='image');

INSERT INTO "QuestionTemplate" (id, modality, category, question, options, weight, "isActive", "createdAt", "updatedAt")
SELECT gen_random_uuid()::text, 'image', NULL, 'Subject focus?',
  '["Single object","Person / portrait","Scene / landscape","Abstract","Custom..."]'::jsonb, 7, TRUE, NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM "QuestionTemplate" WHERE question='Subject focus?' AND modality='image');

INSERT INTO "QuestionTemplate" (id, modality, category, question, options, weight, "isActive", "createdAt", "updatedAt")
SELECT gen_random_uuid()::text, 'video', NULL, 'Duration?',
  '["≤5 seconds","5–10s","10–30s","Custom..."]'::jsonb, 10, TRUE, NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM "QuestionTemplate" WHERE question='Duration?' AND modality='video');

INSERT INTO "QuestionTemplate" (id, modality, category, question, options, weight, "isActive", "createdAt", "updatedAt")
SELECT gen_random_uuid()::text, 'video', NULL, 'Camera motion?',
  '["Static","Slow pan","Tracking shot","Drone / aerial","Custom..."]'::jsonb, 9, TRUE, NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM "QuestionTemplate" WHERE question='Camera motion?' AND modality='video');

INSERT INTO "QuestionTemplate" (id, modality, category, question, options, weight, "isActive", "createdAt", "updatedAt")
SELECT gen_random_uuid()::text, 'video', NULL, 'Setting / scene?',
  '["Indoor / studio","Urban exterior","Nature","Abstract / surreal","Custom..."]'::jsonb, 8, TRUE, NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM "QuestionTemplate" WHERE question='Setting / scene?' AND modality='video');

INSERT INTO "QuestionTemplate" (id, modality, category, question, options, weight, "isActive", "createdAt", "updatedAt")
SELECT gen_random_uuid()::text, 'audio', NULL, 'Voice character?',
  '["Male, deep","Female, warm","Neutral, narration","Energetic, young","Custom..."]'::jsonb, 10, TRUE, NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM "QuestionTemplate" WHERE question='Voice character?' AND modality='audio');

INSERT INTO "QuestionTemplate" (id, modality, category, question, options, weight, "isActive", "createdAt", "updatedAt")
SELECT gen_random_uuid()::text, 'audio', NULL, 'Pace / speed?',
  '["Slow, deliberate","Conversational","Fast, energetic","Custom..."]'::jsonb, 9, TRUE, NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM "QuestionTemplate" WHERE question='Pace / speed?' AND modality='audio');

INSERT INTO "QuestionTemplate" (id, modality, category, question, options, weight, "isActive", "createdAt", "updatedAt")
SELECT gen_random_uuid()::text, 'audio', NULL, 'Use case?',
  '["Voiceover","Podcast","Audiobook","Ad spot","Custom..."]'::jsonb, 8, TRUE, NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM "QuestionTemplate" WHERE question='Use case?' AND modality='audio');

INSERT INTO "QuestionTemplate" (id, modality, category, question, options, weight, "isActive", "createdAt", "updatedAt")
SELECT gen_random_uuid()::text, 'music', NULL, 'Genre?',
  '["Electronic","Pop","Cinematic","Lo-fi / chill","Custom..."]'::jsonb, 10, TRUE, NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM "QuestionTemplate" WHERE question='Genre?' AND modality='music');

INSERT INTO "QuestionTemplate" (id, modality, category, question, options, weight, "isActive", "createdAt", "updatedAt")
SELECT gen_random_uuid()::text, 'music', NULL, 'Mood?',
  '["Uplifting","Melancholic","Tense","Relaxed","Custom..."]'::jsonb, 9, TRUE, NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM "QuestionTemplate" WHERE question='Mood?' AND modality='music');

INSERT INTO "QuestionTemplate" (id, modality, category, question, options, weight, "isActive", "createdAt", "updatedAt")
SELECT gen_random_uuid()::text, 'music', NULL, 'Length?',
  '["≤30 seconds","30–60s","1–3 minutes","Custom..."]'::jsonb, 8, TRUE, NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM "QuestionTemplate" WHERE question='Length?' AND modality='music');

-- ─── Email Templates (2026-05-01: admin-panel-full-functional plan) ──────
-- Idempotent via @@unique([slug, locale])
INSERT INTO "EmailTemplate" (id, slug, locale, subject, "bodyHtml", "bodyText", "isActive", "sentCount", "createdAt", "updatedAt") VALUES
  (gen_random_uuid()::text, 'welcome', 'en', 'Welcome to promtexpress 👋',
    '<h1>Hi {{name}},</h1><p>Welcome to promtexpress — the world''s best prompt generation platform.</p><p>Your account is ready. Start crafting world-class prompts now.</p><p><a href="https://promtexpress.com/dashboard">Go to dashboard</a></p>',
    'Hi {{name}}, welcome to promtexpress. Visit https://promtexpress.com/dashboard to get started.',
    TRUE, 0, NOW(), NOW()),
  (gen_random_uuid()::text, 'welcome', 'tr', 'promtexpress''e hoş geldin 👋',
    '<h1>Merhaba {{name}},</h1><p>promtexpress''e hoş geldin — dünyanın en iyi prompt üretim platformu.</p><p>Hesabın hazır. Hemen başla.</p><p><a href="https://promtexpress.com/dashboard">Panele git</a></p>',
    'Merhaba {{name}}, promtexpress''e hoş geldin. https://promtexpress.com/dashboard',
    TRUE, 0, NOW(), NOW()),
  (gen_random_uuid()::text, 'verification', 'en', 'Verify your email',
    '<h1>Verify your email</h1><p>Click the link below to verify your email address:</p><p><a href="{{verifyUrl}}">Verify email</a></p><p>If you didn''t request this, ignore this message.</p>',
    'Verify your email: {{verifyUrl}}',
    TRUE, 0, NOW(), NOW()),
  (gen_random_uuid()::text, 'verification', 'tr', 'E-posta adresini doğrula',
    '<h1>E-posta doğrulama</h1><p>E-posta adresini doğrulamak için bağlantıya tıkla:</p><p><a href="{{verifyUrl}}">E-postayı doğrula</a></p>',
    'E-posta doğrulama: {{verifyUrl}}',
    TRUE, 0, NOW(), NOW()),
  (gen_random_uuid()::text, 'password-reset', 'en', 'Reset your password',
    '<h1>Reset your password</h1><p>Click the link below to set a new password:</p><p><a href="{{resetUrl}}">Reset password</a></p><p>This link expires in 1 hour.</p>',
    'Reset your password: {{resetUrl}}',
    TRUE, 0, NOW(), NOW()),
  (gen_random_uuid()::text, 'password-reset', 'tr', 'Parola sıfırlama',
    '<h1>Parola sıfırla</h1><p>Yeni parola belirlemek için bağlantıya tıkla:</p><p><a href="{{resetUrl}}">Parolayı sıfırla</a></p><p>Bağlantı 1 saat içinde geçerliliğini yitirir.</p>',
    'Parola sıfırla: {{resetUrl}}',
    TRUE, 0, NOW(), NOW()),
  (gen_random_uuid()::text, 'low-credits', 'en', 'You''re running low on credits',
    '<h1>Heads up, {{name}}</h1><p>You have {{credits}} credits left. Upgrade to keep generating world-class prompts without interruption.</p><p><a href="https://promtexpress.com/pricing">Upgrade plan</a></p>',
    'You have {{credits}} credits left. Upgrade: https://promtexpress.com/pricing',
    TRUE, 0, NOW(), NOW()),
  (gen_random_uuid()::text, 'low-credits', 'tr', 'Kredilerin azalıyor',
    '<h1>Bilgi: {{name}}</h1><p>{{credits}} kredin kaldı. Kesintisiz üretim için planını yükselt.</p><p><a href="https://promtexpress.com/pricing">Planı yükselt</a></p>',
    '{{credits}} kredin kaldı. https://promtexpress.com/pricing',
    TRUE, 0, NOW(), NOW()),
  (gen_random_uuid()::text, 'plan-renewal', 'en', 'Your plan renews tomorrow',
    '<h1>Heads up</h1><p>Your {{planName}} plan renews tomorrow ({{date}}). Card on file: {{cardLast4}}.</p>',
    'Your {{planName}} plan renews tomorrow ({{date}}).',
    TRUE, 0, NOW(), NOW()),
  (gen_random_uuid()::text, 'plan-renewal', 'tr', 'Planın yarın yenilenecek',
    '<h1>Bilgi</h1><p>{{planName}} planın yarın yenilenecek ({{date}}). Kart: {{cardLast4}}.</p>',
    '{{planName}} planın yarın yenilenecek ({{date}}).',
    TRUE, 0, NOW(), NOW()),
  (gen_random_uuid()::text, 'receipt', 'en', 'Your promtexpress receipt',
    '<h1>Thanks for your payment</h1><p>Plan: {{planName}}<br/>Amount: {{amount}}<br/>Date: {{date}}</p><p><a href="{{receiptUrl}}">View receipt</a></p>',
    'Receipt: {{planName}} {{amount}} on {{date}}. {{receiptUrl}}',
    TRUE, 0, NOW(), NOW()),
  (gen_random_uuid()::text, 'receipt', 'tr', 'promtexpress makbuzunuz',
    '<h1>Ödemeniz alındı</h1><p>Plan: {{planName}}<br/>Tutar: {{amount}}<br/>Tarih: {{date}}</p><p><a href="{{receiptUrl}}">Makbuzu görüntüle</a></p>',
    'Makbuz: {{planName}} {{amount}} {{date}}. {{receiptUrl}}',
    TRUE, 0, NOW(), NOW())
ON CONFLICT (slug, locale) DO UPDATE SET
  subject = EXCLUDED.subject,
  "bodyHtml" = EXCLUDED."bodyHtml",
  "bodyText" = EXCLUDED."bodyText",
  "isActive" = EXCLUDED."isActive",
  "updatedAt" = NOW();
