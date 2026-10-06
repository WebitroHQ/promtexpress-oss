/**
 * TargetEngine.promptStyleHint zenginleştirme seed'i (Faz 5).
 *
 * Mevcut prisma/seed.sql TargetEngine INSERT'leri korunur (legacy). Bu seed
 * UPSERT ile aktif motorların `promptStyleHint` alanını **slug bazında**
 * kapsamlı (250-400 kelime) bir kılavuza günceller.
 *
 * Direktif #1 (AI hardcode yasağı): Bu dosya yalnızca **TargetEngine içerik
 * metnini** günceller. Hiçbir AiEngine seçimi/atamaı/model adı/key burada YOK.
 *
 * Strateji:
 *   1. MODALITY_STANDARD — her modality için 250-400 kelimelik standart hint.
 *      Tüm aktif motor o modality'nin standart hint'ini varsayılan olarak alır.
 *   2. SLUG_OVERRIDES — popüler/özellikli motorlar için motor-spesifik override.
 *      Standart üzerine binerek tam syntax + flags + ek kuralları ekler.
 *
 * Mission gereği: standart hint zaten dünya birincisi kalibre; override'lar
 * sağlayıcının resmi davranışına göre özelleştirilir.
 */

import { PrismaClient } from "@prisma/client";

// ─────────────────────────────────────────────────────────────────────────
// MODALITY STANDARDS — her modality için ortak kapsamlı kılavuz
// ─────────────────────────────────────────────────────────────────────────

const IMAGE_STANDARD = `
SYNTAX: Detailed natural prose unless target is tag-based (Midjourney/SDXL); subject FIRST, then descriptors, style, composition, technical flags last.
TEXT-IN-IMAGE: Quote rendered text EXACTLY in double quotes ("..."). Specify position (top-center / centered / bottom-third), size hierarchy (PRIMARY/SECONDARY/CTA), typography feel (sans/serif, weight, color, finish). For multiple text blocks, use distinct labeled sections (PRIMARY TEXT / SECONDARY TEXT / BRAND LOGO AREA).
NEGATIVE: Always include explicit "NEGATIVE:" or "no X" cues — at minimum: no people (unless requested), no watermark, no stock-photo logos, no lorem ipsum, no extra text beyond specified, no garbled glyphs.
ASPECT: State aspect ratio explicitly per deliverable (1:1 for square posts, 9:16 for stories/reels, 16:9 for banners/horizontal ads, 4:5 for Instagram portrait). Format: "aspect ratio 1:1, 2048x2048" inline (or target's flag form, e.g. Midjourney --ar 1:1).
BRAND-RENDER: For brand visuals, dedicate a BRAND_LOGO_AREA slot — specify placement (top-center / corner), size relative to headline, typography style, breathing room from main composition. Reserve negative space.
COMMERCIAL-SAFETY: For brand-safe targets (Adobe Firefly, Imagen), avoid copyrighted character/IP references; favor original abstract or generic depictions.
LANGUAGE: English yields highest fidelity for most diffusion models; Qwen-Image / Seedream / ERNIE handle Chinese natively. For non-English text rendering, prefer Ideogram or Imagen 3+ which handle multilingual glyphs better; explicitly state "preserve characters: <list>" + "no garbled glyphs" + "no missing diacritics" in TYPOGRAPHY_RULES.
ANTI-PATTERNS: trendy filler ("epic", "stunning", "masterpiece", "8k", "trending on artstation") — avoid unless intent demands; modifier overload before subject (causes weight on wrong concepts); ambiguous text ("some text" instead of quoted exact string); missing aspect; missing negative block; multi-text without hierarchy labels.
EXAMPLE STRUCTURE:
  SUBJECT: <noun first>
  BRAND_LOGO_AREA: <if any>
  PRIMARY TEXT: "exact string" — typography description
  SECONDARY TEXT: "exact string" — smaller typography
  LAYOUT: <composition, hierarchy, negative space>
  BACKGROUND: <surface, palette>
  LIGHTING: <source, direction, quality, temp>
  STYLE: <reference, era, photographer/movement>
  TYPOGRAPHY RULES: preserve characters: <…>; no garbled glyphs; no misspellings; no extra letters
  NEGATIVE: <explicit list>
  TECHNICAL: aspect ratio, resolution, target-specific flags
`.trim();

const VIDEO_STANDARD = `
SYNTAX: Single coherent prose paragraph (or short labeled paragraphs); subject + action FIRST, then camera, lighting, mood, style, duration, audio, aspect.
ON-SCREEN-TEXT: When the brief includes render text, specify timing ("at second 5"), duration ("holds for 3 seconds"), position (centered / lower-third / top), typography (font feel, color, glyph preservation rules). Quote the exact string.
NEGATIVE: State explicitly what NOT to show: "no people unless requested", "no real product UI screenshots", "no busy backgrounds", "no stock-music vibe", "no garbled glyphs in on-screen text".
ASPECT: 16:9 cinematic / horizontal ads, 9:16 vertical (Reels/Stories/TikTok), 1:1 social square, 4:5 Instagram portrait. State explicitly per deliverable.
BRAND-MENTION: For brand videos, specify HOW the brand appears: end-card wordmark reveal at second N, product label visible, voice-over mention. Reserve clean frames for it.
DURATION: Always state explicit seconds — Veo 3 native max ~8s; Sora ~60s; Runway Gen-3 5-10s; Kling up to ~10s. Choose duration matching target's strength.
AUDIO: For native-audio targets (Veo 3, Sora): specify ambient sound design, dialogue (if any), music (avoid if competing with VO), or "no audio" explicitly.
CAMERA: shot type (close-up / wide / medium), movement (static / dolly / pan / orbit / zoom), lens (anamorphic / 35mm / 50mm / wide), height (eye-level / low / high).
LIGHTING: source (natural / studio / practical), direction (key from upper-left / rim / backlit), quality (soft / hard), temperature (warm / cool / neutral).
ANTI-PATTERNS: bullet lists in the prompt ("the video should: 1. ... 2. ..."), preamble ("this video shows..."), multiple style references conflicting, missing duration, missing aspect.
EXAMPLE STRUCTURE:
  SUBJECT + ACTION: <who/what doing what>
  BRAND_MENTION: <if any, with timing>
  ON_SCREEN_TEXT: <exact strings, timing, position, typography>
  CAMERA: <shot, movement, lens, height>
  LIGHTING: <source, direction, quality, temp>
  MOOD: <emotional tone>
  STYLE: <reference if useful>
  DURATION: <N seconds>
  AUDIO: <ambient/dialogue/music/none>
  ASPECT: <ratio>
  NEGATIVE: <explicit list>
`.trim();

const AUDIO_STANDARD = `
SYNTAX: Plain script + voice characteristics + pacing/emotion tags (where supported). Use bracketed tags for emotion: [serious], [warm], [excited], [whispered], [laughing]. Use [pause N s] for explicit pauses if target supports.
VOICE-PROFILE: gender (male/female/neutral), age range (young/adult/elderly), timbre (deep/warm/bright/raspy), accent (Turkish/English-US/English-UK/etc.).
SCRIPT: state the EXACT text to be spoken — voice clones will read this verbatim. For multi-language scripts, mark sections explicitly.
PRONUNCIATION: For brand names or unusual words, provide phonetic guides ([phoneme] or simple respelling). Mark stress where ambiguous.
EMOTION_TAGS: distribute throughout the script for natural variation; do not overload (3-5 tags per minute is plenty).
SSML: For targets that support SSML (PlayHT, Hume, some ElevenLabs models), use <break time="500ms"/>, <prosody rate="slow">, <emphasis level="strong"> for fine control.
TECHNICAL: state sample rate (44.1kHz / 24kHz / 16kHz), codec/format (MP3 / WAV / OGG), bitrate (192kbps for music-grade, 128kbps for speech), and any voice-specific settings (Stability, Similarity, Style Exaggeration for ElevenLabs).
ANTI-PATTERNS: dumping the whole script in one block without pacing cues; missing emotion tags entirely (flat delivery); requesting "natural sounding" without specifics; mixing target tools in one prompt.
EXAMPLE STRUCTURE:
  VOICE PROFILE: <gender, age, timbre, accent>
  EMOTION TAGS: [<tag>] inline
  PACING: <slow/medium/fast>
  SCRIPT:
  [opening tag]
  <line 1>
  [pause]
  <line 2>
  PRONUNCIATION: <brand/unusual words with hints>
  TECHNICAL: <sample rate, codec, settings>
`.trim();

const TEXT_STANDARD = `
SYNTAX: RTCFE structure adapted to target's strength: ROLE → TASK → CONTEXT → FORMAT → CONSTRAINTS (+ Examples if useful).
ROLE: 1 sentence persona/expertise. Direct, no apology, no "you are an AI assistant" boilerplate.
TASK: Concrete verb + deliverable. State the output type explicitly (essay / email / outline / table / code).
CONTEXT: Domain jargon from ExpertPersona; INCLUDE entities.brand / product_or_service / audience / occasion / offer here verbatim.
FORMAT: Structure (sections / numbered list / table / Markdown), length (word count or paragraph count), tone (professional / casual / warm / authoritative), language (preserve user's intent language unless target requires English).
CONSTRAINTS: Explicit do/don't list. entities.forbidden → don't list. entities.render_text → quoted strings the output MUST contain verbatim (e.g. CTA button text).
LANGUAGE: ChatGPT / Claude / Gemini / DeepSeek / Grok handle multilingual natively — write in the user's intent language. For Turkish: enforce ç ğ ı ö ş ü preservation; "bozuk glyph yok" ifadesi.
MARKDOWN: Allowed for targets that render it (ChatGPT / Claude / Gemini); use sparingly — headers for sections, code blocks for code, tables for comparisons.
ANTI-PATTERNS: "Please" / "Could you" / "I want" / "Help me" — replace with direct instructions; multiple options ("either X or Y") — pick ONE; meta-commentary ("Note that…", "Please ensure…"); apology / explanation about the prompt itself; trailing "Hope this helps" / "Let me know if".
EXAMPLE STRUCTURE:
  ROLE: <persona>
  TASK: <concrete verb + deliverable>
  CONTEXT: <jargon, entities, audience, occasion, offer>
  FORMAT: <structure, length, tone, language>
  CONSTRAINTS: <do/don't, forbidden, required quoted strings>
`.trim();

const CODE_STANDARD = `
SYNTAX: Context-first, then task, then acceptance criteria, then out-of-scope. Use file-mention syntax of the target tool (@filename for Cursor, raw paths for Aider).
CONTEXT: Stack (language + framework + version), relevant file paths, existing patterns to follow, type/lint configuration if relevant.
TASK: Concrete change. State the change verb (refactor / add / fix / migrate / extract / inline) and the target unit (function / component / module / migration).
ACCEPTANCE CRITERIA: Explicit and verifiable: "tests pass (pnpm test)", "type check passes (pnpm exec tsc --noEmit)", "no any types introduced", "lint clean", "existing public API unchanged".
OUT-OF-SCOPE: Explicit list of what NOT to change — prevents scope creep. Examples: "don't rename the component", "don't change the public props interface", "don't add Suspense or ErrorBoundary in this PR".
LANGUAGE: English (technical convention). Comments in English unless explicitly requested otherwise.
DOMAIN-NORMS: Follow framework idioms (React: hooks > class; Next.js 16: server components default; TanStack Query v5: useQuery API; etc.). State the version explicitly to disambiguate.
ANTI-PATTERNS: vague tasks ("improve this code"); missing file paths; no acceptance criteria; mixing multiple changes in one prompt; not stating the framework version (Tailwind v3 vs v4, React Query v4 vs v5 differ significantly).
EXAMPLE STRUCTURE:
  CONTEXT: stack=<…>, framework=<… version>, files=<@path1, @path2>
  TASK: <verb + target>
  ACCEPTANCE CRITERIA:
  - <verifiable check>
  - <verifiable check>
  OUT OF SCOPE:
  - <thing not to change>
  - <thing not to change>
`.trim();

const MUSIC_STANDARD = `
SYNTAX: Two blocks separated by blank line.
BLOCK 1 — STYLE/TAGS: comma-separated descriptors only — genre+sub-genre, era, mood (specific: "uplifting"/"melancholic"/"wistful" — NOT generic "happy/sad"), instrumentation, production texture, BPM as a number (NOT "fast"), key signature optional. NO sentences. NO prose.
BLOCK 2 — LYRICS: structure tags REQUIRED on their own lines: [Intro], [Verse], [Pre-Chorus], [Chorus], [Bridge], [Outro], [Instrumental]. Lyrics below each tag. Open vowels on long notes (a, o, e); hard consonants on emphasis. Match syllable count to BPM.
INSTRUMENTAL: omit lyrics block entirely; add "instrumental, no vocals" to the style block; optionally add a single [Instrumental] tag with brief direction.
LANGUAGE: Style descriptors in English (best fidelity); lyrics in any language. Open-vowel rule still applies regardless of language.
BRAND/CAMPAIGN JINGLE: When a brand is involved, weave brand name naturally into Chorus/Bridge if the song is a jingle; OR keep instrumental and rely on accompanying voice-over for brand mention.
ANTI-PATTERNS: prose ("write a song that…"), narrative ("the song should be about…"), missing structure tags, BPM as text instead of number, mixing style and lyrics in one block.
EXAMPLE STRUCTURE:
  [STYLE]
  <descriptor1>, <descriptor2>, <BPM number>, <key>, <mood>

  [LYRICS]
  [Intro]
  …
  [Verse]
  …
  [Chorus]
  …
`.trim();

const STANDARDS: Record<string, string> = {
  image: IMAGE_STANDARD,
  video: VIDEO_STANDARD,
  audio: AUDIO_STANDARD,
  text: TEXT_STANDARD,
  code: CODE_STANDARD,
  music: MUSIC_STANDARD,
};

// ─────────────────────────────────────────────────────────────────────────
// SLUG OVERRIDES — popüler motorlar için spesifik ek kurallar
// (standart hint'in başına eklenir — engine-spesifik üst not)
// ─────────────────────────────────────────────────────────────────────────

const SLUG_OVERRIDES: Record<string, string> = {
  // ── Image
  midjourney:
    "MIDJOURNEY: tag-based (comma-separated). End with flags: --ar X:Y (REQUIRED), --v 6 (or current default), --style raw (for less stylization), --no <thing> for negatives. Use ::weight for emphasis (e.g. 'red car::2 blue background::1'). Text-in-image is weak — prefer Ideogram/Imagen for typography work; if used, quote text exactly and keep short (1-3 words).",
  "midjourney-v6":
    "MIDJOURNEY v6: tag-based; --ar X:Y mandatory; --v 6 --style raw default. v6 improved text rendering modestly but still inferior to Ideogram. Use ::weight for emphasis. --no for negatives.",
  "dall-e-3":
    "DALL-E 3: natural prose; OpenAI internally rewrites the prompt — keep your prompt concrete and specific to reduce rewrite drift. Lead with subject. Aspect via API parameter (1024x1024 / 1792x1024 / 1024x1792). Text rendering improved but still unreliable for >10 chars. Commercial-safe.",
  "gpt-image-2":
    "GPT IMAGE 2: natural language instruction-style prompts ONLY. No Midjourney/SDXL flags (--ar, --v, --style). No NEGATIVE: block. No SUBJECT:/LIGHTING:/BACKGROUND: headers. " +
    "For EDIT requests: describe the change precisely and surgically ('increase exposure in shadow areas by ~1.5 stops, preserve highlight detail, shift white balance to 5500K golden tone'). " +
    "For GENERATE requests: subject first, then lighting, composition, atmosphere, style. " +
    "Aspect ratio is an API parameter — do NOT include in the prompt text. " +
    "Keep prompt under 800 characters — concise precise instructions outperform verbose descriptions.",
  ideogram:
    "IDEOGRAM: SUPERIOR text rendering — its core differentiator. Quote the exact text in double quotes. Supports multi-text blocks: PRIMARY TEXT / SECONDARY TEXT / LOGO AREA labels work well. Specify font style (serif / sans / display / handwritten). Aspect via API. Use this engine when render-text fidelity matters.",
  "flux-2-pro":
    "FLUX.2 [pro]: 32B foundation; very literal — every word counts. Detailed natural prose; subject first. Text rendering excellent; quote text exactly. Multi-reference composition supported. Aspect via API param. Negatives inline ('no people, no watermark').",
  "flux-1-pro":
    "FLUX.1 [pro]: detailed natural prose; high fidelity. Text rendering good; quote exactly. Negatives inline. Aspect via API param.",
  "flux-1-1-pro":
    "FLUX.1 [pro] v1.1: ~4.5s per image; commercial. Detailed prose; same style as 1.0 pro with improved coherence.",
  "flux-1-1-pro-ultra":
    "FLUX.1 [pro] Ultra: 4MP ultra-fast; detailed natural prose; specify aspect in API request; very literal.",
  "flux-1-dev":
    "FLUX.1 [dev]: open-weights commercial; LoRA-friendly. Detailed prose same as pro; negatives inline.",
  "flux-1-krea":
    "FLUX.1 [krea]: Krea-tuned aesthetic — lean into editorial / cinematic vocabulary. Detailed prose.",
  "flux-1-schnell":
    "FLUX.1 [schnell]: open-weights, 1-4 step generation. Sacrifices fine detail — keep prompt TIGHT and unambiguous. No multi-clause sentences; tag-like prose works best.",
  "flux-1-kontext-pro":
    "FLUX.1 Kontext [pro]: TEXT + REFERENCE IMAGE input. Describe the EDIT precisely ('change shirt to red, keep face and pose'). Preserves non-edited regions. Be surgical about what to change vs keep.",
  firefly:
    "ADOBE FIREFLY: COMMERCIAL-SAFE — trained on licensed data, no IP risk. Natural prose; supports style/effect/composition modifiers. Avoid named characters/celebrities. Great for brand assets.",
  "firefly-3":
    "ADOBE FIREFLY Image 3: commercial-safe; natural prose; style/effect/composition modifiers; great for brand-safe assets. Multi-text via labeled sections; aspect via UI/API.",
  "qwen-image":
    "QWEN-IMAGE: complex text rendering + edit; prose; strong CN/EN. Describe text-in-image explicitly with quoted strings.",
  "qwen-image-2":
    "QWEN-IMAGE 2.0: native 2K + pro text rendering + unified gen+edit. Prose; CN/EN strong; describe text content explicitly when rendering text.",
  "ernie-image":
    "ERNIE-IMAGE: 8B; multilingual EN/ZH/JP. Prose; describe text-in-image explicitly.",
  "seedream-5":
    "SEEDREAM 5.0: full quality tier; prose; multilingual (CN/EN); strong text rendering. Quote text exactly.",
  "seedream-4-5":
    "SEEDREAM 4.5: unified gen+edit; prose + optional reference; instruction-style edit prompts.",

  // ── Video
  "veo-3":
    "VEO 3: subject + action + camera + lighting + mood + style; native audio. Duration up to ~8s. State: shot type, movement, lens, height; lighting source/direction/quality/temp; mood; cinematography reference; explicit duration in seconds; audio (ambient/dialogue/music/none). Quote on-screen text exactly with timing.",
  sora:
    "SORA: subject + action + camera + style; up to 60s. Detailed prose; cinematic vocabulary works well. Specify aspect (16:9 / 9:16 / 1:1) and duration explicitly. Native audio supported.",
  "runway-gen-3":
    "RUNWAY Gen-3: 5-10s clips; natural prose with cinematic vocabulary. Specify camera movement clearly (dolly / pan / orbit / static). Aspect via UI. No native audio.",
  kling:
    "KLING: up to ~10s; prose; supports text-to-video and image-to-video. Specify motion intensity (low/medium/high) explicitly.",
  luma:
    "LUMA Dream Machine: 5-9s; prose; strong on naturalistic motion. Specify camera explicitly.",

  // ── Audio
  "elevenlabs-v3":
    "ELEVENLABS v3: plain script + voice settings + bracketed emotion tags. Tags: [serious], [warm], [excited], [whispered], [laughing], [sigh]. Voice settings: Stability 0-1, Similarity 0-1, Style Exaggeration 0-1, Speaker Boost on/off. Output formats: 44.1kHz MP3 192kbps (default), pcm_16000/22050/24000/44100, ulaw_8000.",
  "openai-tts":
    "OPENAI TTS (tts-1 / tts-1-hd): plain text in, MP3/Opus/AAC/FLAC out. Voice presets: alloy, echo, fable, onyx, nova, shimmer. No emotion tags — tone derived from punctuation and word choice. Speed 0.25-4.0 via API param.",
  playht:
    "PLAY.HT: plain script + SSML supported (<break>, <prosody>, <emphasis>). Voice clone available. Emotion tags via SSML.",
  hume:
    "HUME EVI: conversational realtime; short turns; no markdown. Specify desired emotional valence in voice profile.",

  // ── Text — leading models with format strengths
  chatgpt:
    "CHATGPT: structured prose with sections; Markdown rendered. RTCFE structure works well. For long outputs, request explicit section headers. For code, use fenced blocks.",
  "gpt-4-1": "GPT-4.1: structured prose; large context; good at long-form. RTCFE structure.",
  "gpt-4o": "GPT-4o: multimodal; structured prose; Markdown rendered. RTCFE structure.",
  "gpt-5-4": "GPT-5.4: structured prose; large context; reasoning-friendly. RTCFE; extended thinking via prompt structure.",
  "gpt-5-4-pro": "GPT-5.4 Pro: max reasoning; can handle complex multi-step tasks; explicit step breakdown helps.",
  o1: "OPENAI o1: reasoning model; let it think — minimize 'think step by step' (built-in); state final output format clearly.",
  o3: "OPENAI o3: stronger reasoning than o1; same prompting style — clear task, format, constraints; let model reason internally.",
  claude:
    "CLAUDE: structured prose with sections, code blocks, examples. Markdown rendered. XML-style tags supported (<context>, <task>, <output_format>) and often improve adherence.",
  "claude-sonnet-4-6":
    "CLAUDE SONNET 4.6: structured prose / Markdown / XML tags. Excellent for long-form analysis, technical writing, code review.",
  "claude-opus-4-7":
    "CLAUDE OPUS 4.7: top-tier reasoning + writing. RTCFE + XML tags; supports extended thinking via prompt.",
  gemini:
    "GEMINI: structured prose; Markdown rendered; good multimodal. State format explicitly.",
  "gemini-2-5-pro":
    "GEMINI 2.5 PRO: large context; structured prose with sections; supports JSON mode via API. Good for long-form synthesis.",
  "deepseek-v3":
    "DEEPSEEK V3: structured prose; strong reasoning + code; Chinese/English bilingual. RTCFE works well.",
  "deepseek-r1":
    "DEEPSEEK R1: reasoning model — minimize 'think step by step' (built-in); state final output format clearly.",
  grok: "GROK: conversational + sharp; structured prose works; humor/sarcasm supported if intent calls for it.",
  "mistral-large-2": "MISTRAL LARGE 2: structured prose; strong multilingual. RTCFE works.",

  // ── Code
  cursor:
    "CURSOR: @-mention files for context (@src/components/Foo.tsx). Use clear directives + acceptance criteria. State stack/framework version explicitly. Out-of-scope list prevents drift.",
  "github-copilot":
    "GITHUB COPILOT: inline completion + chat. For chat: clear task, file context (paste relevant code or use #file references), acceptance criteria.",
  "claude-code":
    "CLAUDE CODE: agentic coding CLI. Provide stack, file paths, acceptance criteria, out-of-scope. It will read files autonomously — no need to paste code.",
  aider:
    "AIDER: file-aware terminal pair-programmer. Provide concrete change verb + target file paths. Use /add to scope.",
};

// ─────────────────────────────────────────────────────────────────────────
// AUTHORING CRITERIA (FAZ 1, 2026-05-03) — synthesizer reads these per target
// to enforce charLimit, preferredFormat, requiresEnglish, structuredFieldSpec,
// parameterHints, authoringTipsMd. Slug-keyed; only listed engines override
// defaults; unlisted engines keep schema defaults (null limit, plain format,
// no English requirement, wantsAssumptions=true, no neg prompt).
// ─────────────────────────────────────────────────────────────────────────

interface AuthoringCriteria {
  charLimit?: number | null;
  preferredFormat?: "plain" | "json" | "markdown" | "structured" | "parameterized" | null;
  requiresEnglish?: boolean;
  wantsAssumptions?: boolean;
  negativePromptSupport?: boolean;
  structuredFieldSpec?: Record<string, string> | null;
  parameterHints?: Record<string, string> | null;
  authoringTipsMd?: string | null;
}

const AUTHORING_CRITERIA: Record<string, AuthoringCriteria> = {
  // ── Image — tag-based engines with parameter syntax
  midjourney: {
    charLimit: 6000,
    preferredFormat: "parameterized",
    requiresEnglish: true,
    negativePromptSupport: true,
    parameterHints: { "--ar": "16:9 | 1:1 | 9:16", "--v": "6", "--style": "raw", "--no": "comma list" },
    authoringTipsMd:
      "End with parameter flags. Subject FIRST, modifiers after. Use ::weight for emphasis (e.g. red::2 blue::1). Text rendering weak — keep <3 words.",
  },
  "midjourney-v6": {
    charLimit: 6000,
    preferredFormat: "parameterized",
    requiresEnglish: true,
    negativePromptSupport: true,
    parameterHints: { "--ar": "16:9", "--v": "6", "--style": "raw", "--no": "list" },
  },
  "dall-e-3": {
    charLimit: 4000,
    preferredFormat: "plain",
    requiresEnglish: false,
    negativePromptSupport: false,
    authoringTipsMd: "Subject first. OpenAI rewrites prompts — be concrete to reduce drift.",
  },
  "gpt-image-2": {
    charLimit: 4000,
    preferredFormat: "plain",
    requiresEnglish: true,
    negativePromptSupport: false,
    structuredFieldSpec: null,
    parameterHints: null,
    authoringTipsMd:
      "Natural language instructions ONLY — no Midjourney/SDXL flags, no NEGATIVE: block, no SUBJECT:/LIGHTING: section headers. " +
      "Edit mode: describe the change precisely ('increase contrast by 20%, warm the shadows to 5500K'). " +
      "Generate mode: subject first, then lighting, atmosphere, style reference. " +
      "Concise beats verbose — aim for 100-400 characters. Aspect ratio is an API parameter, not part of the prompt.",
  },
  ideogram: {
    charLimit: 1000,
    preferredFormat: "structured",
    requiresEnglish: false,
    negativePromptSupport: false,
    structuredFieldSpec: {
      subject: "string",
      primary_text: "string (exact, quoted)",
      secondary_text: "string?",
      logo_area: "string?",
      style: "string",
      aspect: "string (e.g. 1:1)",
    },
    authoringTipsMd: "BEST text-rendering engine. Quote exact text in double quotes. Multi-text labels (PRIMARY/SECONDARY) work well.",
  },
  "stable-diffusion": {
    charLimit: 2000,
    preferredFormat: "parameterized",
    requiresEnglish: true,
    negativePromptSupport: true,
    parameterHints: { negative_prompt: "comma list", steps: "30", cfg_scale: "7", sampler: "DPM++ 2M Karras" },
  },
  "flux-1-pro": { charLimit: 2000, preferredFormat: "plain", requiresEnglish: true, negativePromptSupport: true },
  "flux-2-pro": { charLimit: 2000, preferredFormat: "plain", requiresEnglish: true, negativePromptSupport: true },
  firefly: { charLimit: 1000, preferredFormat: "plain", requiresEnglish: false, authoringTipsMd: "Commercial-safe; avoid IP references." },
  "firefly-3": { charLimit: 1000, preferredFormat: "plain", requiresEnglish: false },

  // ── Music — Suno is the primary target user complaint case
  suno: {
    charLimit: 3000,
    preferredFormat: "structured",
    requiresEnglish: false,
    negativePromptSupport: false,
    structuredFieldSpec: {
      style: "string (comma-separated tags: genre, era, mood, instruments, BPM number, key)",
      vocals: "vocals | instrumental",
      lyrics: "string? (with [Intro] [Verse] [Chorus] [Bridge] [Outro] tags on own lines; omit when instrumental)",
    },
    authoringTipsMd:
      "TWO BLOCKS: (1) STYLE tags comma-separated; (2) LYRICS with [Intro]/[Verse]/[Chorus]/[Bridge]/[Outro] tags on own lines. BPM as NUMBER. Open vowels on long notes. Instrumental → omit lyrics block + add 'instrumental, no vocals' to style.",
  },
  udio: {
    charLimit: 3000,
    preferredFormat: "structured",
    requiresEnglish: false,
    structuredFieldSpec: {
      style: "string (comma-separated)",
      vocals: "vocals | instrumental",
      lyrics: "string? (structure tags on own lines)",
    },
  },

  // ── Video
  "veo-3": {
    charLimit: 5000,
    preferredFormat: "structured",
    requiresEnglish: false,
    structuredFieldSpec: {
      subject_action: "string",
      camera: "string (shot, movement, lens, height)",
      lighting: "string (source, direction, quality, temp)",
      mood: "string",
      style: "string",
      duration_sec: "int (max 8)",
      audio: "string (ambient/dialogue/music/none)",
      aspect: "string (16:9 | 9:16 | 1:1)",
      on_screen_text: "string?",
      negative: "string",
    },
    authoringTipsMd: "Native audio; max ~8s. Be cinematic.",
  },
  // 2026-05-12 (Garantili Teslimat v2):
  // Sora family targets accept cinematic prose, not structured field maps.
  // structuredFieldSpec previously documented above was a reference template,
  // not a wire contract; it triggered the synthesizer shape gate to reject
  // perfectly valid natural-language outputs. Moved to authoringTipsMd as
  // guidance; preferredFormat='plain' so the gate's natural-language escape
  // (looksLikeReasoningLeak) applies.
  sora: {
    charLimit: 5000,
    preferredFormat: "plain",
    requiresEnglish: false,
    authoringTipsMd:
      "Cinematic prose. Specify subject + action, camera (shot type / movement / lens), lighting (source / direction / quality), style, duration in seconds (max 60), aspect ratio. Native audio supported.",
  },
  "sora-2": {
    charLimit: 5000,
    preferredFormat: "plain",
    requiresEnglish: false,
    authoringTipsMd:
      "Cinematic prose; up to 20s. Specify camera move, lens (35mm/50mm/85mm), lighting, subject action, environment. Native audio. Reusable character refs on Pro tier.",
  },
  "sora-2-characters": {
    charLimit: 5000,
    preferredFormat: "plain",
    requiresEnglish: false,
    authoringTipsMd:
      "Character ID generation. Provide character image + description; reuse name in subsequent shots.",
  },
  "sora-2-i2v": {
    charLimit: 5000,
    preferredFormat: "plain",
    requiresEnglish: false,
    authoringTipsMd:
      "Image + motion intent + camera move. Keep face/identity consistent — describe motion not subject.",
  },
  "sora-2-pro": {
    charLimit: 5000,
    preferredFormat: "plain",
    requiresEnglish: false,
    authoringTipsMd:
      "1080p; reusable character references. Same cinematic prose; explicitly name reused characters.",
  },
  "sora-2-remix": {
    charLimit: 5000,
    preferredFormat: "plain",
    requiresEnglish: false,
    authoringTipsMd:
      "Style-change instruction on existing video. Imperative phrasing: 'restyle as anime, keep motion'.",
  },
  "runway-gen-3": {
    charLimit: 2000,
    preferredFormat: "plain",
    requiresEnglish: true,
    authoringTipsMd: "5-10s clips; cinematic vocab; no native audio.",
  },
  kling: { charLimit: 2000, preferredFormat: "plain", requiresEnglish: true },
  pika: { charLimit: 2000, preferredFormat: "plain", requiresEnglish: true },
  luma: { charLimit: 2000, preferredFormat: "plain", requiresEnglish: true },

  // ── Audio
  "elevenlabs-v3": {
    charLimit: 5000,
    preferredFormat: "structured",
    requiresEnglish: false,
    structuredFieldSpec: {
      voice_profile: "string (gender, age, timbre, accent)",
      script: "string (with [emotion] tags inline)",
      pacing: "slow | medium | fast",
      pronunciation_hints: "string?",
      stability: "number (0-1)",
      similarity: "number (0-1)",
      style_exaggeration: "number (0-1)",
    },
  },
  "openai-tts": {
    charLimit: 4096,
    preferredFormat: "structured",
    requiresEnglish: false,
    structuredFieldSpec: {
      voice: "alloy | echo | fable | onyx | nova | shimmer",
      script: "string (plain text, no SSML)",
      speed: "number (0.25-4.0)",
      format: "mp3 | opus | aac | flac",
    },
  },
  playht: { charLimit: 5000, preferredFormat: "markdown", requiresEnglish: false, authoringTipsMd: "SSML supported (<break>, <prosody>, <emphasis>)." },

  // ── Text — major LLMs handle multilingual natively
  chatgpt: { charLimit: 32000, preferredFormat: "markdown", requiresEnglish: false, wantsAssumptions: true },
  "gpt-4-1": { charLimit: 1_000_000, preferredFormat: "markdown", requiresEnglish: false, wantsAssumptions: true },
  "gpt-4o": { charLimit: 128000, preferredFormat: "markdown", requiresEnglish: false, wantsAssumptions: true },
  "gpt-5-4": { charLimit: 200000, preferredFormat: "markdown", requiresEnglish: false, wantsAssumptions: true },
  "gpt-5-4-pro": { charLimit: 200000, preferredFormat: "markdown", requiresEnglish: false, wantsAssumptions: true },
  o1: { charLimit: 100000, preferredFormat: "markdown", requiresEnglish: false, wantsAssumptions: true },
  o3: { charLimit: 200000, preferredFormat: "markdown", requiresEnglish: false, wantsAssumptions: true },
  claude: { charLimit: 200000, preferredFormat: "markdown", requiresEnglish: false, wantsAssumptions: true, authoringTipsMd: "XML tags (<context>, <task>, <output_format>) improve adherence." },
  "claude-sonnet-4-6": { charLimit: 200000, preferredFormat: "markdown", requiresEnglish: false, wantsAssumptions: true },
  "claude-opus-4-7": { charLimit: 200000, preferredFormat: "markdown", requiresEnglish: false, wantsAssumptions: true },
  gemini: { charLimit: 1_000_000, preferredFormat: "markdown", requiresEnglish: false, wantsAssumptions: true },
  "gemini-2-5-pro": { charLimit: 2_000_000, preferredFormat: "markdown", requiresEnglish: false, wantsAssumptions: true },
  "deepseek-v3": { charLimit: 64000, preferredFormat: "markdown", requiresEnglish: false, wantsAssumptions: true },
  "deepseek-r1": { charLimit: 64000, preferredFormat: "markdown", requiresEnglish: false, wantsAssumptions: true },
  grok: { charLimit: 128000, preferredFormat: "markdown", requiresEnglish: false, wantsAssumptions: true },
  perplexity: { charLimit: 12000, preferredFormat: "plain", requiresEnglish: false, authoringTipsMd: "Research-focused; ask explicit questions; cite-friendly." },

  // ── Code
  cursor: { charLimit: 50000, preferredFormat: "structured", requiresEnglish: true, structuredFieldSpec: { context: "string (stack, files via @-mention)", task: "string", acceptance: "string (verifiable)", out_of_scope: "string" } },
  "github-copilot": { charLimit: 8000, preferredFormat: "markdown", requiresEnglish: true },
  "claude-code": { charLimit: 100000, preferredFormat: "markdown", requiresEnglish: true, structuredFieldSpec: { context: "string", task: "string", acceptance: "string", out_of_scope: "string" } },
  aider: { charLimit: 20000, preferredFormat: "plain", requiresEnglish: true },
};

export async function seedTargetEngineAuthoringCriteria(
  prisma: PrismaClient,
): Promise<{ updated: number; skipped: number }> {
  let updated = 0;
  let skipped = 0;

  const engines = await prisma.targetEngine.findMany({
    where: { isActive: true },
    select: {
      id: true,
      slug: true,
      charLimit: true,
      preferredFormat: true,
      requiresEnglish: true,
      wantsAssumptions: true,
      negativePromptSupport: true,
      structuredFieldSpec: true,
      parameterHints: true,
      authoringTipsMd: true,
    },
  });

  for (const eng of engines) {
    const cri = AUTHORING_CRITERIA[eng.slug];
    if (!cri) {
      skipped++;
      continue;
    }
    const next = {
      charLimit: cri.charLimit ?? null,
      preferredFormat: cri.preferredFormat ?? null,
      requiresEnglish: cri.requiresEnglish ?? false,
      wantsAssumptions: cri.wantsAssumptions ?? true,
      negativePromptSupport: cri.negativePromptSupport ?? false,
      structuredFieldSpec: cri.structuredFieldSpec ?? null,
      parameterHints: cri.parameterHints ?? null,
      authoringTipsMd: cri.authoringTipsMd ?? null,
    };
    // Idempotent: skip if all fields match
    const same =
      eng.charLimit === next.charLimit &&
      eng.preferredFormat === next.preferredFormat &&
      eng.requiresEnglish === next.requiresEnglish &&
      eng.wantsAssumptions === next.wantsAssumptions &&
      eng.negativePromptSupport === next.negativePromptSupport &&
      JSON.stringify(eng.structuredFieldSpec ?? null) === JSON.stringify(next.structuredFieldSpec) &&
      JSON.stringify(eng.parameterHints ?? null) === JSON.stringify(next.parameterHints) &&
      eng.authoringTipsMd === next.authoringTipsMd;
    if (same) {
      skipped++;
      continue;
    }
    await prisma.targetEngine.update({
      where: { id: eng.id },
      data: next as never,
    });
    updated++;
  }

  return { updated, skipped };
}

// ─────────────────────────────────────────────────────────────────────────
// Seed function
// ─────────────────────────────────────────────────────────────────────────

export async function seedTargetEngineHints(prisma: PrismaClient): Promise<{ updated: number; skipped: number }> {
  // Tüm aktif TargetEngine kayıtlarını çek
  const engines = await prisma.targetEngine.findMany({
    where: { isActive: true },
    select: { id: true, slug: true, modality: true, promptStyleHint: true },
  });

  let updated = 0;
  let skipped = 0;

  for (const eng of engines) {
    const standard = STANDARDS[eng.modality];
    if (!standard) {
      skipped++;
      continue; // bilinmeyen modality — dokunma
    }
    const override = SLUG_OVERRIDES[eng.slug];
    const composed = override
      ? `${override}\n\n--- ${eng.modality.toUpperCase()} STANDARD ---\n\n${standard}`
      : standard;

    // Idempotent: aynı içerik varsa atla
    if (eng.promptStyleHint === composed) {
      skipped++;
      continue;
    }

    // Raw SQL: Prisma 6'da .update bazı durumlarda gereksiz unique-index re-check
    // tetikleyebiliyor; raw UPDATE doğrudan sadece istenen kolonu yazar, extra
    // yan etki yok. Idempotent ve duplicate-slug sorunlarına dirençli.
    await prisma.$executeRaw`UPDATE "TargetEngine" SET "promptStyleHint" = ${composed} WHERE id = ${eng.id}`;
    updated++;
  }

  return { updated, skipped };
}
