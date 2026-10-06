/**
 * Seed script: 35+ priority training resources.
 * Çalıştırma: SEED_ACTOR_ID=<admin-user-id> pnpm tsx prisma/seeds/seed-priority-resources.ts
 * Idempotent: (type, url) çifti var ise skip eder.
 */

import { PrismaClient, ResourceType, ResourceRefresh } from "@prisma/client";

const db = new PrismaClient();

type SeedRow = {
  type: ResourceType;
  url: string;
  title: string;
  description: string;
  targetTags: string[];
  refreshPolicy: ResourceRefresh;
  scrapeConfig?: Record<string, unknown>;
};

const SEED: SeedRow[] = [
  // ── RSS §4.1 ──────────────────────────────────────────────────────────────
  { type: "RSS", url: "https://huggingface.co/blog/feed.xml", title: "Hugging Face Blog", description: "HF official blog — model releases, technique articles", targetTags: ["hf","models","papers","technique"], refreshPolicy: "WEEKLY", scrapeConfig: { maxEntries: 20 } },
  { type: "RSS", url: "https://openai.com/news/rss.xml", title: "OpenAI News", description: "OpenAI official news feed", targetTags: ["openai","releases","technique"], refreshPolicy: "WEEKLY", scrapeConfig: { maxEntries: 20 } },
  { type: "RSS", url: "https://lilianweng.github.io/index.xml", title: "Lilian Weng (Lil'Log)", description: "Deep technical blog by OpenAI Head of Safety Research", targetTags: ["research","technique","agent"], refreshPolicy: "WEEKLY", scrapeConfig: { maxEntries: 20 } },
  { type: "RSS", url: "https://simonwillison.net/atom/everything/", title: "Simon Willison", description: "Practitioner notes — technique + tooling", targetTags: ["practitioner","technique","tooling"], refreshPolicy: "WEEKLY", scrapeConfig: { maxEntries: 20 } },
  { type: "RSS", url: "https://www.oneusefulthing.org/feed", title: "Ethan Mollick — One Useful Thing", description: "Wharton prof; use-case + evaluation", targetTags: ["use-case","evaluation","productivity"], refreshPolicy: "WEEKLY", scrapeConfig: { maxEntries: 20 } },
  { type: "RSS", url: "https://rss.arxiv.org/rss/cs.CL+cs.AI", title: "ArXiv cs.CL + cs.AI", description: "Academic NLP/AI papers; high volume", targetTags: ["academic","papers","technique"], refreshPolicy: "WEEKLY", scrapeConfig: { maxEntries: 30 } },
  { type: "RSS", url: "https://janellecshane.substack.com/feed", title: "Janelle Shane (AI Weirdness)", description: "AI failure modes & creative misfires", targetTags: ["failure-modes","antipatterns","creative"], refreshPolicy: "WEEKLY", scrapeConfig: { maxEntries: 20 } },
  { type: "RSS", url: "https://raw.githubusercontent.com/conoro/anthropic-engineering-rss-feed/main/anthropic_engineering_rss.xml", title: "Anthropic Engineering (community RSS)", description: "Community-maintained RSS for Anthropic engineering posts", targetTags: ["anthropic","engineering","technique"], refreshPolicy: "WEEKLY", scrapeConfig: { maxEntries: 20 } },

  // ── SITEMAP §4.2 ──────────────────────────────────────────────────────────
  { type: "SITEMAP", url: "https://learnprompting.org/sitemap.xml", title: "learnprompting.org sitemap", description: "Comprehensive PE education site", targetTags: ["education","technique","comprehensive"], refreshPolicy: "MONTHLY", scrapeConfig: { maxUrls: 50, urlPattern: "(prompt|guide|technique|docs)" } },
  { type: "SITEMAP", url: "https://www.anthropic.com/sitemap.xml", title: "Anthropic sitemap", description: "Anthropic public docs + research", targetTags: ["anthropic","docs","technique","model"], refreshPolicy: "MONTHLY", scrapeConfig: { maxUrls: 30, urlPattern: "(prompt|engineering|research|docs)" } },
  { type: "SITEMAP", url: "https://openai.com/sitemap.xml", title: "OpenAI sitemap", description: "OpenAI docs + research index", targetTags: ["openai","docs","technique","model"], refreshPolicy: "MONTHLY", scrapeConfig: { maxUrls: 30, urlPattern: "(prompt|engineering|research|docs|cookbook)" } },

  // ── URL Ana Guide'lar §4.3 ────────────────────────────────────────────────
  { type: "URL", url: "https://arxiv.org/abs/2406.06608", title: "The Prompt Report (2024 — 58-technique survey)", description: "OpenAI/Google/Princeton joint; 1500+ paper analysis; foundational reference", targetTags: ["survey","technique","comprehensive","foundation"], refreshPolicy: "MONTHLY" },
  { type: "URL", url: "https://docs.anthropic.com/en/docs/build-with-claude/prompt-engineering/overview", title: "Anthropic — Prompt Engineering Overview", description: "Anthropic's official PE entry doc", targetTags: ["anthropic","technique","official"], refreshPolicy: "MONTHLY" },
  { type: "URL", url: "https://platform.claude.com/docs/en/build-with-claude/prompt-engineering/claude-prompting-best-practices", title: "Anthropic — Claude Prompting Best Practices", description: "Best practices doc for Claude family", targetTags: ["anthropic","best-practice"], refreshPolicy: "MONTHLY" },
  { type: "URL", url: "https://docs.anthropic.com/en/resources/prompt-library/library", title: "Anthropic Prompt Library", description: "100+ curated prompt examples", targetTags: ["anthropic","exemplar","library"], refreshPolicy: "MONTHLY" },
  { type: "URL", url: "https://github.com/anthropics/prompt-eng-interactive-tutorial", title: "Anthropic Interactive Tutorial (GitHub README)", description: "Hands-on tutorial repo", targetTags: ["anthropic","tutorial","hands-on"], refreshPolicy: "MONTHLY" },
  { type: "URL", url: "https://cookbook.openai.com/", title: "OpenAI Cookbook (index)", description: "OpenAI cookbook landing page", targetTags: ["openai","cookbook","technique"], refreshPolicy: "MONTHLY" },
  { type: "URL", url: "https://platform.openai.com/docs/guides/prompt-engineering", title: "OpenAI — Prompt Engineering Guide", description: "OpenAI's official PE guide", targetTags: ["openai","official","technique"], refreshPolicy: "MONTHLY" },
  { type: "URL", url: "https://cookbook.openai.com/examples/gpt-5/gpt-5_prompting_guide", title: "OpenAI — GPT-5 Prompting Guide", description: "GPT-5 specific prompting guide", targetTags: ["openai","model","gpt-5"], refreshPolicy: "MONTHLY" },
  { type: "URL", url: "https://cookbook.openai.com/examples/gpt4-1_prompting_guide", title: "OpenAI — GPT-4.1 Prompting Guide", description: "GPT-4.1 specific prompting guide", targetTags: ["openai","model","gpt-4.1"], refreshPolicy: "MONTHLY" },
  { type: "URL", url: "https://ai.google.dev/gemini-api/docs/prompting-strategies", title: "Google — Gemini Prompting Strategies", description: "Gemini API official PE doc", targetTags: ["google","gemini","model"], refreshPolicy: "MONTHLY" },
  { type: "URL", url: "https://www.promptingguide.ai/", title: "promptingguide.ai (DAIR.AI)", description: "DAIR.AI comprehensive PE guide; 3M+ learners", targetTags: ["comprehensive","technique","education"], refreshPolicy: "MONTHLY" },
  { type: "URL", url: "https://www.llama.com/docs/how-to-guides/prompting/", title: "Meta — Llama Prompting Guide", description: "Llama family prompt format & guide", targetTags: ["meta","llama","model"], refreshPolicy: "MONTHLY" },
  { type: "URL", url: "https://docs.mistral.ai/guides/prompting_capabilities", title: "Mistral — Prompting Capabilities", description: "Mistral AI prompting doc", targetTags: ["mistral","model"], refreshPolicy: "MONTHLY" },
  { type: "URL", url: "https://cohere.com/llmu/prompt-engineering-basics", title: "Cohere LLMU — PE Basics", description: "Cohere educational module", targetTags: ["cohere","education","basics"], refreshPolicy: "MONTHLY" },
  { type: "URL", url: "https://learn.microsoft.com/en-us/azure/ai-services/openai/concepts/advanced-prompt-engineering", title: "Azure OpenAI — Advanced Prompt Engineering", description: "Microsoft Azure advanced PE concepts", targetTags: ["azure","microsoft","advanced"], refreshPolicy: "MONTHLY" },
  { type: "URL", url: "https://docs.aws.amazon.com/bedrock/latest/userguide/prompt-engineering-guidelines.html", title: "AWS Bedrock — Prompt Engineering Guidelines", description: "AWS Bedrock official PE doc", targetTags: ["aws","bedrock","official"], refreshPolicy: "MONTHLY" },

  // ── URL Akademik Papers §4.4 ──────────────────────────────────────────────
  { type: "URL", url: "https://arxiv.org/abs/2201.11903", title: "Paper — Chain-of-Thought Prompting (2022)", description: "Wei et al. — CoT foundational paper", targetTags: ["academic","cot","foundational"], refreshPolicy: "MONTHLY" },
  { type: "URL", url: "https://arxiv.org/abs/2305.10601", title: "Paper — Tree of Thoughts (NeurIPS 2023)", description: "ToT reasoning paper", targetTags: ["academic","tot","reasoning"], refreshPolicy: "MONTHLY" },
  { type: "URL", url: "https://arxiv.org/abs/2210.03629", title: "Paper — ReAct (ICLR 2023)", description: "Reasoning + Acting agent paper", targetTags: ["academic","react","agent"], refreshPolicy: "MONTHLY" },
  { type: "URL", url: "https://arxiv.org/abs/2212.08073", title: "Paper — Constitutional AI (2022)", description: "Anthropic's CAI paper — safety from AI feedback", targetTags: ["academic","safety","constitution"], refreshPolicy: "MONTHLY" },
  { type: "URL", url: "https://arxiv.org/abs/2211.01910", title: "Paper — APE Auto Prompt Engineer (2022)", description: "Meta-prompting via LLMs", targetTags: ["academic","meta-prompting"], refreshPolicy: "MONTHLY" },
  { type: "URL", url: "https://arxiv.org/abs/2005.11401", title: "Paper — RAG (2020)", description: "Retrieval-Augmented Generation foundational paper", targetTags: ["academic","rag"], refreshPolicy: "MONTHLY" },
  { type: "URL", url: "https://arxiv.org/abs/2005.14165", title: "Paper — GPT-3 Few-Shot Learning (2020)", description: "In-context learning foundational paper", targetTags: ["academic","few-shot","foundational"], refreshPolicy: "MONTHLY" },
  { type: "URL", url: "https://arxiv.org/abs/2203.11171", title: "Paper — Self-Consistency (2022)", description: "Self-consistency reasoning paper", targetTags: ["academic","reasoning"], refreshPolicy: "MONTHLY" },
  { type: "URL", url: "https://arxiv.org/abs/2311.16119", title: "Paper — HackAPrompt (EMNLP 2023)", description: "Adversarial PE / jailbreak research (defensive)", targetTags: ["academic","security","antipattern"], refreshPolicy: "MONTHLY" },

  // ── URL Tooling §4.5 ─────────────────────────────────────────────────────
  { type: "URL", url: "https://github.com/stanfordnlp/dspy", title: "DSPy — Stanford (programmatic PE)", description: "Programmatic PE framework README", targetTags: ["tooling","dspy","programmatic"], refreshPolicy: "MONTHLY" },
  { type: "URL", url: "https://github.com/f/awesome-chatgpt-prompts", title: "awesome-chatgpt-prompts (143K ⭐)", description: "Curated prompt collection", targetTags: ["exemplar","use-case","community"], refreshPolicy: "MONTHLY" },
];

async function main() {
  const SYSTEM_ID = process.env.SEED_ACTOR_ID;
  if (!SYSTEM_ID) throw new Error("SEED_ACTOR_ID env required (an admin User.id from DB)");

  let created = 0;
  let existing = 0;
  const errors: string[] = [];

  for (const row of SEED) {
    try {
      const found = await db.trainingResource.findFirst({
        where: { type: row.type, url: row.url },
      });
      if (found) {
        existing++;
        continue;
      }
      await db.trainingResource.create({
        data: {
          type: row.type,
          url: row.url,
          title: row.title,
          description: row.description,
          targetPersonaSlugs: [],
          targetTags: row.targetTags,
          refreshPolicy: row.refreshPolicy,
          scrapeConfig: (row.scrapeConfig ?? {}) as object,
          status: "ACTIVE",
          createdBy: SYSTEM_ID,
        },
      });
      created++;
      console.log(`✓ Created: ${row.title}`);
    } catch (e) {
      errors.push(`${row.url}: ${(e as Error).message}`);
    }
  }

  console.log(JSON.stringify({ created, existing, errors }, null, 2));
  await db.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
