import "@/styles/landing-v3.css";
import { getLocale } from "next-intl/server";
import { auth } from "@/lib/auth";
import { renderLandingHtmlTop, LANDING_HTML_BOTTOM } from "./landing-html";
import { LandingClientEffects } from "./client-effects";
import { LandingLangMount } from "./lang-mount";
import { JsonLd } from "@/components/seo/json-ld";
import {
  softwareApplicationSchema,
  breadcrumbSchema,
  faqPageSchema,
} from "@/lib/seo/schemas";

// SoftwareApplication, BreadcrumbList, FAQPage rendered via shared schema
// generators (src/lib/seo/schemas). Plan §3.3 evidence: dropped fake
// aggregateRating (12000 reviews), areaServed (12 countries), 9-locale
// inLanguage; landing-html.ts duplicate block removed.

// Mirror of the visible FAQ section in landing-html.ts (lines 615-654).
// Keeping the data here lets the FAQPage JSON-LD stay accurate without
// re-parsing raw HTML.
const LANDING_FAQ = [
  {
    q: "What exactly does PromtExpress do?",
    a: "You describe your goal in plain language. PromtExpress matches your intent to a curated template, refines it with an LLM brain, and outputs a production-ready prompt tuned to the model you're targeting — no syntax knowledge required.",
  },
  {
    q: "Which models are supported?",
    a: "All major LLMs (GPT-4o, Claude, Gemini, Llama 3, Mistral, Deepseek, Qwen), image models (Midjourney, Flux, Stable Diffusion, DALL·E 3), video (Sora, Runway, Pika), and audio (ElevenLabs, Suno). 60+ engines and growing.",
  },
  {
    q: "Is it really free?",
    a: "Everything is free. You create an account, add your own AI provider API key (OpenAI, Anthropic, Google Gemini, DeepSeek or OpenRouter) and generate as much as you like. Your provider bills you for the usage; PromtExpress charges nothing.",
  },
  {
    q: "Do you have an API?",
    a: "Yes. Every account gets REST API access, with open-source SDKs for TypeScript and Python and a CLI.",
  },
  {
    q: "How is this different from ChatGPT or Claude directly?",
    a: "We don't replace those models — we make them work better. PromtExpress generates the prompt; you feed it to your favorite model. Think of it as a precision compiler for natural language intent.",
  },
  {
    q: "Can I use my own templates?",
    a: "Yes. The prompt library is open source: you can fork any template or contribute your own on GitHub.",
  },
  {
    q: "Is my data private?",
    a: "Your prompts are saved to your own history and you can export or delete them. Your AI provider key is stored encrypted and is never shown again after you save it. The code is open source, so you can check how it works or run it yourself.",
  },
  {
    q: "What does it cost to generate a prompt?",
    a: "There are no credits. Generation runs on the API key you add, so the only cost is what your AI provider charges you.",
  },
];

export async function LandingV3() {
  const locale = await getLocale();
  const session = await auth();
  const isAuth = !!session?.user;
  const htmlTop = renderLandingHtmlTop(isAuth);
  const htmlBottom = LANDING_HTML_BOTTOM;
  return (
    <div className="lv3-root" data-theme="dark">
      <JsonLd data={softwareApplicationSchema()} />
      <JsonLd data={breadcrumbSchema([{ name: "Home", url: "/" }])} />
      <JsonLd data={faqPageSchema(LANDING_FAQ)} />
      <div dangerouslySetInnerHTML={{ __html: htmlTop }} />
      <LandingLangMount currentLocale={locale} />
      <div dangerouslySetInnerHTML={{ __html: htmlBottom }} />
      {/* Footer is rendered by (public)/layout.tsx (since 2026-05-11
          i18n middleware fix). It now lives outside .lv3-root and uses the
          default site palette — visual trade-off for reliable rewrites. */}
      <LandingClientEffects />
    </div>
  );
}
