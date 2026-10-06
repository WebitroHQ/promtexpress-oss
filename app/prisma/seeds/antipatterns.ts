/**
 * AntiPatternRule seed — pipeline validator + synthesizer'ın kullandığı
 * "yapma" listesi. Global (domainSlug=null) + domain-bazlı.
 *
 * Validator (Layer 5) bu kuralları regex/substring ile prompt çıktısında arar.
 * Synthesizer (Layer 4) system prompt'una "Anti-Pattern Rules" bölümünde
 * domain-uyumlu kuralları enjekte eder.
 *
 * Direktif #1: Bu seed AI motor adı içermez.
 */

export const ANTI_PATTERN_RULES = [
  // ════════════════════════════════════════════════════════════════════
  // GLOBAL (domainSlug=null) — her prompt'ta uygulanır
  // Direktif: kullanıcı isteğini sınırlamayız. Sadece WARN seviyesinde
  // stilistik öneriler. Sisteme saldırı koruması ORM/auth/rate-limit ile
  // yapılır; output kontrolüyle değil.
  // ════════════════════════════════════════════════════════════════════
  {
    domainSlug: null,
    pattern: "^Please\\s",
    isRegex: true,
    severity: "warn",
    rationale: "AI is a tool, not a person — drop 'Please' opener",
  },
  {
    domainSlug: null,
    pattern: "^I\\s+(want|need|would\\s+like)",
    isRegex: true,
    severity: "warn",
    rationale: "Restate as direct instruction; remove 'I want/need'",
  },
  {
    domainSlug: null,
    pattern: "^Could\\s+you\\s",
    isRegex: true,
    severity: "warn",
    rationale: "Drop polite question opener; use direct instruction",
  },
  {
    domainSlug: null,
    pattern: "(?:\\[your\\s+\\w+\\s+here\\]|\\[customize\\s+this\\]|\\[insert\\s+\\w+\\])",
    isRegex: true,
    severity: "warn",
    rationale: "Placeholder text — replace with concrete value",
  },
  {
    domainSlug: null,
    pattern: "either\\s+\\w+\\s+or\\s+\\w+",
    isRegex: true,
    severity: "warn",
    rationale: "Pick ONE option; don't offer alternatives in the prompt",
  },
  {
    domainSlug: null,
    pattern: "\\bvery\\s+(unique|special|amazing|stunning|epic)\\b",
    isRegex: true,
    severity: "warn",
    rationale: "Empty intensifier — be specific instead",
  },
  {
    domainSlug: null,
    pattern: "Hope\\s+this\\s+helps|Let\\s+me\\s+know\\s+if",
    isRegex: true,
    severity: "warn",
    rationale: "Meta-commentary — strip output to prompt only",
  },

  // ════════════════════════════════════════════════════════════════════
  // IMAGE DOMAINS
  // ════════════════════════════════════════════════════════════════════
  {
    domainSlug: "design.logo-minimal",
    pattern: "(?:3D\\s+effect|gradient\\s+mesh|drop[\\s-]?shadow|bevel|emboss|chrome|holographic)",
    isRegex: true,
    severity: "warn",
    rationale: "Logo timeless rule: no 3D, no gradient mesh, no chrome/holographic effects",
  },
  {
    domainSlug: "design.logo-minimal",
    pattern: "more\\s+than\\s+\\d+\\s+colors|rainbow",
    isRegex: true,
    severity: "warn",
    rationale: "Logo palette discipline: ≤3 colors, no rainbow",
  },
  {
    domainSlug: "design.photo-portrait",
    pattern: "harsh\\s+(on-?camera\\s+)?flash|direct\\s+flash",
    isRegex: true,
    severity: "warn",
    rationale: "Portrait lighting: avoid harsh on-camera flash",
  },
  {
    domainSlug: "design.photo-portrait",
    pattern: "centered\\s+eye[\\s-]?line",
    isRegex: true,
    severity: "warn",
    rationale: "Portrait composition: eye-line on upper third, not center",
  },
  {
    domainSlug: "design.photo-product",
    pattern: "distracting\\s+background|cluttered\\s+background",
    isRegex: true,
    severity: "warn",
    rationale: "Product shot: clean/seamless background",
  },
  {
    domainSlug: "design.illustration-flat",
    pattern: "photorealistic|gradient\\s+mesh|hyper[\\s-]?detailed",
    isRegex: true,
    severity: "warn",
    rationale: "Flat illustration: no photo-realism, no gradient mesh",
  },
  {
    domainSlug: "design.illustration-anime",
    pattern: "western\\s+cartoon|disney[\\s-]?style|hyper[\\s-]?realistic",
    isRegex: true,
    severity: "warn",
    rationale: "Anime style: avoid western cartoon mashup or hyper-realism",
  },
  {
    domainSlug: "design.ui-mobile",
    pattern: "tap\\s+target.*\\b(?:[1-9]|[1-3]\\d|4[0-3])\\s*(?:pt|px)\\b",
    isRegex: true,
    severity: "warn",
    rationale: "iOS HIG / Material 3: tap targets ≥44pt",
  },
  {
    domainSlug: "design.ui-web",
    pattern: "carousel\\s+for\\s+primary\\s+content",
    isRegex: true,
    severity: "warn",
    rationale: "Web UX: carousels hurt CTR for primary content",
  },
  {
    domainSlug: "design.character-design",
    pattern: "unidentifiable\\s+silhouette|generic\\s+(?:anime|disney)\\s+mashup",
    isRegex: true,
    severity: "warn",
    rationale: "Character must pass silhouette test",
  },

  // ════════════════════════════════════════════════════════════════════
  // VIDEO DOMAINS
  // ════════════════════════════════════════════════════════════════════
  {
    domainSlug: "video.short-form-tiktok",
    pattern: "no\\s+captions|without\\s+captions|caption[\\s-]?less",
    isRegex: true,
    severity: "warn",
    rationale: "Short-form: 80%+ watch on mute → captions mandatory",
  },
  {
    domainSlug: "video.short-form-tiktok",
    pattern: "16:9\\s+horizontal|landscape\\s+orientation",
    isRegex: true,
    severity: "warn",
    rationale: "Short-form TikTok/Reels/Shorts: 9:16 vertical only",
  },
  {
    domainSlug: "video.youtube-thumbnail",
    pattern: "small\\s+text|tiny\\s+text|fine\\s+print",
    isRegex: true,
    severity: "warn",
    rationale: "YT thumbnail: text readable on mobile (3-5 BIG words)",
  },
  {
    domainSlug: "video.cinematic-shot",
    pattern: "dutch\\s+angle.*(?:no\\s+reason|random)|orange[\\s-]?and[\\s-]?teal",
    isRegex: true,
    severity: "warn",
    rationale: "Cinematic: avoid clichéd grade/Dutch angle without psychological reason",
  },

  // ════════════════════════════════════════════════════════════════════
  // TEXT DOMAINS
  // ════════════════════════════════════════════════════════════════════
  {
    domainSlug: "marketing.copy-shortform",
    pattern: "synergy|innovative|cutting[\\s-]?edge|best[\\s-]?in[\\s-]?class|world[\\s-]?class",
    isRegex: true,
    severity: "warn",
    rationale: "Copy buzzwords: replace with specific claim or proof",
  },
  {
    domainSlug: "marketing.seo-blog",
    pattern: "keyword\\s+stuff|keyword\\s+density\\s+>\\s*[3-9]",
    isRegex: true,
    severity: "warn",
    rationale: "SEO 2025: keyword stuffing penalized; ≤2% density",
  },
  {
    domainSlug: "marketing.email-sales",
    pattern: "(?:circling\\s+back|just\\s+checking\\s+in|hope\\s+this\\s+finds\\s+you\\s+well)",
    isRegex: true,
    severity: "warn",
    rationale: "Sales email cliché openers — use specific hook",
  },
  {
    domainSlug: "social.instagram",
    pattern: "(#\\w+\\s*){15,}",
    isRegex: true,
    severity: "warn",
    rationale: "Instagram: 5-8 niche hashtags, not 15+ stack",
  },
  {
    domainSlug: "social.linkedin",
    pattern: "I\\s+am\\s+(thrilled|excited|honored)\\s+to\\s+announce",
    isRegex: true,
    severity: "warn",
    rationale: "LinkedIn ego post — start with insight or specific number",
  },
  {
    domainSlug: "technical-documentation",
    pattern: "the\\s+request\\s+is\\s+sent|is\\s+being\\s+\\w+ed",
    isRegex: true,
    severity: "warn",
    rationale: "Tech docs: active voice, not passive ('the request is sent')",
  },
  {
    domainSlug: "creative-fiction",
    pattern: "she\\s+(?:said|asked)\\s+\\w+ly|he\\s+(?:said|asked)\\s+\\w+ly",
    isRegex: true,
    severity: "warn",
    rationale: "Fiction: no adverbs in dialogue tags ('said angrily')",
  },
  {
    domainSlug: "creative-fiction",
    pattern: "she\\s+felt|he\\s+felt|they\\s+felt|noticed\\s+that|realized\\s+that",
    isRegex: true,
    severity: "warn",
    rationale: "Filter words — show, don't tell",
  },
  {
    domainSlug: "academic-summary",
    pattern: "I\\s+think|I\\s+believe|in\\s+my\\s+opinion",
    isRegex: true,
    severity: "warn",
    rationale: "Academic: third person; remove first-person opinion",
  },

  // ════════════════════════════════════════════════════════════════════
  // CODE DOMAINS
  // ════════════════════════════════════════════════════════════════════
  {
    domainSlug: "software.python-data-analysis",
    pattern: "iterrows\\(\\)|itertuples\\(\\).*for|\\.apply\\(.*lambda",
    isRegex: true,
    severity: "warn",
    rationale: "Pandas perf: vectorize; avoid iterrows/apply on large frames",
  },
  {
    domainSlug: "software.python-web-backend",
    pattern: "from\\s+sqlalchemy\\s+import\\s+create_engine.*\\n.*sync",
    isRegex: true,
    severity: "warn",
    rationale: "FastAPI: async ORM (await), don't mix sync/async",
  },
  {
    domainSlug: "software.javascript-frontend",
    pattern: "useEffect.*fetch|useEffect.*axios",
    isRegex: true,
    severity: "warn",
    rationale: "React 19+: data fetching → Server Components or React Query",
  },
  {
    domainSlug: "software.sql-query",
    pattern: "SELECT\\s+\\*\\s+FROM",
    isRegex: true,
    severity: "warn",
    rationale: "Production SQL: explicit columns, not SELECT *",
  },
  {
    domainSlug: "software.devops-script",
    pattern: "^#!/bin/bash\\s*$\\n(?!.*set\\s+-e)",
    isRegex: true,
    severity: "warn",
    rationale: "Bash strict mode: 'set -euo pipefail' missing",
  },

  // ════════════════════════════════════════════════════════════════════
  // AUDIO + AD
  // ════════════════════════════════════════════════════════════════════
  {
    domainSlug: "audio.podcast-script",
    pattern: "self[\\s-]?intro.*first\\s+30\\s+sec|introduce\\s+myself\\s+first",
    isRegex: true,
    severity: "warn",
    rationale: "Podcast: cold open with hook, not self-intro",
  },
  {
    domainSlug: "audio.music-prompt",
    pattern: "happy\\s+music|sad\\s+music|good\\s+music",
    isRegex: true,
    severity: "warn",
    rationale: "AI music: specific genre + mood (uplifting/melancholic), not 'happy/sad'",
  },
  {
    domainSlug: "ad.headline",
    pattern: "^.{60,}$",
    isRegex: true,
    severity: "warn",
    rationale: "Ad headline: 5-second test → ≤8 words usually",
  },
  {
    domainSlug: "ad.script-30sec",
    pattern: "logo\\s+only\\s+at\\s+end|brand\\s+at\\s+25s",
    isRegex: true,
    severity: "warn",
    rationale: "30-sec ad: brand visible early; 70% drop-off before 25s",
  },
];

export type AntiPatternRuleSeed = (typeof ANTI_PATTERN_RULES)[number];
