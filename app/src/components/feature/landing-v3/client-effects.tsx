"use client";

import { useEffect } from "react";

const HERO_PROMPTS = [
  {
    text: "A cinematic wide shot of a futuristic city at dusk, neon lights reflecting on wet streets, flying cars in the sky, ultra detailed, atmospheric, 8k, vibrant colors.",
    hot: "mj",
    score: 98,
  },
  {
    text: "Act as a senior product strategist. Draft a 5-bullet GTM brief for an AI prompt tool targeting solo creators. Tone: confident, concrete, no fluff.",
    hot: "gpt",
    score: 96,
  },
  {
    text: "You are a careful research assistant. Summarize the attached paper in 3 sections: thesis, method, and 2 surprising findings — cite page numbers inline.",
    hot: "claude",
    score: 97,
  },
  {
    text: "Generate a structured JSON schema for a recipe app: title, prepTime, ingredients[], steps[], nutrition. Include 1 fully-filled example matching the schema.",
    hot: "gemini",
    score: 94,
  },
  {
    text: "Studio-lit product shot of a matte black ceramic mug on warm oak, soft window light from the left, shallow depth of field, 35mm, food-magazine aesthetic.",
    hot: "mj",
    score: 99,
  },
];

const PG_TEMPLATES: Record<string, (intent: string) => string> = {
  mj: (intent) =>
    `${intent}, cinematic composition, ultra-detailed, atmospheric lighting,\nshallow depth of field, 35mm anamorphic, dramatic color grading,\n--ar 16:9 --style raw --v 6 --quality 2`,
  gpt: (intent) =>
    `Role: Senior creative director with 10+ years of experience.\nGoal: ${intent}\nFormat: Markdown, with sections and bullet points.\nTone: Confident, concrete, no fluff.\nConstraints: Cite at least one reference. Avoid clichés.`,
  claude: (intent) =>
    `<role>You are a careful, detail-oriented assistant.</role>\n<task>${intent}</task>\n<format>Provide your answer in 3 sections: context, approach, deliverable.</format>\n<quality>Self-check the output before finalizing.</quality>`,
  gemini: (intent) =>
    `Task: ${intent}\nOutput format: JSON with keys { summary, steps[], example }.\nAudience: Technical, intermediate level.\nConstraints: Be specific. Include 1 worked example.`,
};

const TRUST_ENGINES = [
  { name: "OpenAI",       logo: "/brand/engines/openai.svg" },
  { name: "Anthropic",    logo: "/brand/engines/anthropic.svg" },
  { name: "Google Gemini",logo: "/brand/engines/googlegemini.svg" },
  { name: "Meta",         logo: "/brand/engines/meta.svg" },
  { name: "Mistral AI",   logo: "/brand/engines/mistralai.svg" },
  { name: "DeepSeek",     logo: "/brand/engines/deepseek.svg" },
  { name: "xAI",          logo: "/brand/engines/x.svg" },
  { name: "Perplexity",   logo: "/brand/engines/perplexity.svg" },
  { name: "ElevenLabs",   logo: "/brand/engines/elevenlabs.svg" },
  { name: "Suno",         logo: "/brand/engines/suno.svg" },
  { name: "Cohere",       logo: "/brand/engines/cohere.svg" },
  { name: "NVIDIA",       logo: "/brand/engines/nvidia.svg" },
  { name: "Microsoft",    logo: "/brand/engines/microsoft.svg" },
  { name: "Adobe",        logo: "/brand/engines/adobe.svg" },
  { name: "Canva",        logo: "/brand/engines/canva.svg" },
  { name: "Figma",        logo: "/brand/engines/figma.svg" },
  { name: "Notion",       logo: "/brand/engines/notion.svg" },
];

const MODELS = [
  { name: "ChatGPT",    sub: "OpenAI",    logo: "/brand/engines/openai.svg",       glow: "rgba(16,163,127,.45)" },
  { name: "Claude",     sub: "Anthropic", logo: "/brand/engines/anthropic.svg",    glow: "rgba(217,119,87,.45)" },
  { name: "Gemini",     sub: "Google",    logo: "/brand/engines/googlegemini.svg", glow: "rgba(66,133,244,.45)" },
  { name: "Llama",      sub: "Meta",      logo: "/brand/engines/meta.svg",         glow: "rgba(8,102,255,.45)"  },
  { name: "Grok",       sub: "xAI",       logo: "/brand/engines/x.svg",            glow: "rgba(160,160,160,.4)" },
  { name: "Mistral",    sub: "open",      logo: "/brand/engines/mistralai.svg",    glow: "rgba(255,112,0,.45)"  },
  { name: "DeepSeek",   sub: "open",      logo: "/brand/engines/deepseek.svg",     glow: "rgba(91,108,255,.45)" },
  { name: "Perplexity", sub: "search",    logo: "/brand/engines/perplexity.svg",   glow: "rgba(32,128,141,.45)" },
  { name: "Sora",       sub: "OpenAI",    logo: "/brand/engines/openai.svg",       glow: "rgba(124,58,237,.45)" },
  { name: "ElevenLabs", sub: "audio",     logo: "/brand/engines/elevenlabs.svg",   glow: "rgba(120,120,120,.4)" },
];
const CF_TEXT =
  "/imagine a violinist mid-performance in a dimly lit jazz club,\nwarm spotlight, smoke curling, 35mm film grain, shallow DOF\n--ar 16:9 --style raw --v 6 --quality 2";

export function LandingClientEffects() {
  useEffect(() => {
    const cleanups: Array<() => void> = [];

    // ===== REDUCED MOTION DETECTION (T7) =====
    const prefersReducedMotion =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    // ===== MOBILE MENU (T1) =====
    const trigger = document.getElementById("menuTrigger");
    const overlay = document.getElementById("menuOverlay");
    const closeBtn = document.getElementById("menuClose");
    const menuLinks = document.querySelectorAll<HTMLAnchorElement>("[data-menu-link]");
    const lvRoot = document.querySelector<HTMLElement>(".lv3-root");

    const setMenuOpen = (open: boolean) => {
      if (!overlay || !trigger || !lvRoot) return;
      overlay.dataset.open = String(open);
      overlay.setAttribute("aria-hidden", String(!open));
      trigger.setAttribute("aria-expanded", String(open));
      lvRoot.dataset.menuOpen = String(open);
    };

    if (trigger && overlay) {
      const onTrigger = () => setMenuOpen(overlay.dataset.open !== "true");
      trigger.addEventListener("click", onTrigger);
      cleanups.push(() => trigger.removeEventListener("click", onTrigger));
    }
    if (closeBtn) {
      const onClose = () => setMenuOpen(false);
      closeBtn.addEventListener("click", onClose);
      cleanups.push(() => closeBtn.removeEventListener("click", onClose));
    }
    menuLinks.forEach((a) => {
      const onLink = () => setMenuOpen(false);
      a.addEventListener("click", onLink);
      cleanups.push(() => a.removeEventListener("click", onLink));
    });
    const onEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape" && overlay?.dataset.open === "true") setMenuOpen(false);
    };
    document.addEventListener("keydown", onEsc);
    cleanups.push(() => document.removeEventListener("keydown", onEsc));

    // ===== THEME TOGGLE — delegate to global next-themes =====
    // Single source of truth is <html data-theme>, managed by next-themes
    // (src/app/layout.tsx <ThemeProvider attribute="data-theme">). The
    // landing-v3 CSS still uses `.lv3-root[data-theme="..."]` selectors
    // for its scoped variables, so we mirror html → lv3-root and observe
    // changes. The static-HTML #themeToggle button writes to <html> + the
    // next-themes localStorage key so the whole site (footer, TopNav)
    // stays in sync. No hardcoded default — user/system choice prevails.
    const root = document.querySelector<HTMLElement>(".lv3-root");
    const htmlEl = document.documentElement;
    if (root) {
      const sync = () => {
        root.dataset.theme = htmlEl.dataset.theme || "light";
      };
      sync();
      const observer = new MutationObserver(sync);
      observer.observe(htmlEl, {
        attributes: true,
        attributeFilter: ["data-theme"],
      });
      cleanups.push(() => observer.disconnect());

      const btn = document.getElementById("themeToggle");
      if (btn) {
        const handler = () => {
          const cur = htmlEl.dataset.theme || "light";
          const next = cur === "dark" ? "light" : "dark";
          htmlEl.dataset.theme = next;
          try {
            localStorage.setItem("theme", next);
          } catch {}
          // Notify next-themes' storage listener so it syncs internal state.
          try {
            window.dispatchEvent(
              new StorageEvent("storage", {
                key: "theme",
                newValue: next,
                oldValue: cur,
                storageArea: localStorage,
              }),
            );
          } catch {}
        };
        btn.addEventListener("click", handler);
        cleanups.push(() => btn.removeEventListener("click", handler));
      }
    }

    // ===== USE CASES TABS =====
    const tabs = document.querySelectorAll<HTMLButtonElement>(".uc-tab");
    const panels = document.querySelectorAll<HTMLElement>(".uc-panel");
    tabs.forEach((t) => {
      const handler = () => {
        const k = t.dataset.uc;
        tabs.forEach((x) => x.classList.toggle("active", x.dataset.uc === k));
        panels.forEach((p) => p.classList.toggle("active", p.dataset.uc === k));
      };
      t.addEventListener("click", handler);
      cleanups.push(() => t.removeEventListener("click", handler));
    });

    // ===== TRUST MARQUEE =====
    const track = document.getElementById("trustTrack");
    if (track && !track.dataset.built) {
      track.dataset.built = "1";
      const buildItem = (e: { name: string; logo: string }) => {
        const el = document.createElement("span");
        el.className = "logo-item";
        el.innerHTML =
          '<span class="glyph"><img class="glyph-img" src="' +
          e.logo +
          '" alt="" loading="lazy" decoding="async" /></span><span>' +
          e.name +
          "</span>";
        return el;
      };
      for (let i = 0; i < 2; i++) {
        TRUST_ENGINES.forEach((e) => track.appendChild(buildItem(e)));
      }
    }

    // ===== MODEL GRID =====
    const grid = document.getElementById("modelsGrid");
    if (grid && !grid.dataset.built) {
      grid.dataset.built = "1";
      MODELS.forEach((m) => {
        const c = document.createElement("div");
        c.className = "model-cell";
        c.style.setProperty("--cellGlow", m.glow);
        c.innerHTML =
          '<div class="mark mark-img-bg"><img src="' +
          m.logo +
          '" alt="" loading="lazy" decoding="async" /></div>' +
          '<div><div class="lbl">' +
          m.name +
          '</div><div class="sub">' +
          m.sub +
          "</div></div>";
        grid.appendChild(c);
      });
    }

    // ===== HERO PROMPT TYPEWRITER LOOP =====
    const out = document.getElementById("promptOut");
    const chips = document.getElementById("chips");
    const qScore = document.getElementById("qScore");
    const qBar = document.getElementById("qBar");
    let heroAlive = true;
    if (out && chips && qScore && qBar) {
      const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));
      const rand = (a: number, b: number) => a + Math.random() * (b - a);

      const setHot = (key: string) => {
        chips.querySelectorAll<HTMLElement>(".chip").forEach((c) => {
          c.classList.remove("hot", "dim");
          if (c.dataset.key === key) c.classList.add("hot");
          else c.classList.add("dim");
        });
      };

      const tweenScore = (target: number) => {
        const start = parseInt(qScore.textContent || "0", 10) || target;
        const dur = 700;
        const t0 = performance.now();
        const step = (t: number) => {
          if (!heroAlive) return;
          const k = Math.min(1, (t - t0) / dur);
          const ease = 1 - Math.pow(1 - k, 3);
          const v = Math.round(start + (target - start) * ease);
          qScore.textContent = String(v);
          (qBar as HTMLElement).style.width = v + "%";
          if (k < 1) requestAnimationFrame(step);
        };
        requestAnimationFrame(step);
      };

      const typeText = async (text: string) => {
        out.textContent = "";
        for (let i = 0; i < text.length; i++) {
          if (!heroAlive) return;
          out.textContent += text[i];
          const ch = text[i];
          let delay = rand(14, 38);
          if (ch === " ") delay = rand(8, 22);
          if (ch === ",") delay = rand(120, 180);
          if (ch === ".") delay = rand(220, 320);
          if (Math.random() < 0.015) delay += rand(180, 320);
          await sleep(delay);
        }
      };

      const eraseText = async () => {
        const total = (out.textContent || "").length;
        while ((out.textContent || "").length > 0) {
          if (!heroAlive) return;
          const cur = out.textContent || "";
          const cut = Math.max(2, Math.floor(total / 40));
          out.textContent = cur.slice(0, Math.max(0, cur.length - cut));
          await sleep(12);
        }
      };

      const loop = async () => {
        let idx = 0;
        const first = HERO_PROMPTS[0];
        out.textContent = first.text;
        setHot(first.hot);
        qScore.textContent = String(first.score);
        (qBar as HTMLElement).style.width = first.score + "%";
        if (prefersReducedMotion) return;
        await sleep(2200);
        while (heroAlive) {
          await eraseText();
          if (!heroAlive) return;
          idx = (idx + 1) % HERO_PROMPTS.length;
          const p = HERO_PROMPTS[idx];
          setHot(p.hot);
          await sleep(180);
          await typeText(p.text);
          if (!heroAlive) return;
          await sleep(120);
          tweenScore(p.score);
          await sleep(2800);
        }
      };

      loop();
      cleanups.push(() => {
        heroAlive = false;
      });
    }

    // ===== PLAYGROUND =====
    const inEl = document.getElementById("pgIn") as HTMLTextAreaElement | null;
    const outEl = document.getElementById("pgOut");
    const runBtn = document.getElementById("pgRun");
    const modelBtns = document.querySelectorAll<HTMLButtonElement>(".pg-model");
    if (inEl && outEl && runBtn) {
      let model = "mj";
      modelBtns.forEach((b) => {
        const handler = () => {
          modelBtns.forEach((x) => x.classList.toggle("active", x === b));
          model = b.dataset.model || "mj";
        };
        b.addEventListener("click", handler);
        cleanups.push(() => b.removeEventListener("click", handler));
      });

      let typingTimer: number | null = null;
      const run = () => {
        if (typingTimer) clearTimeout(typingTimer);
        const intent =
          (inEl.value || "").trim() ||
          "a moody portrait of a violinist in a dimly lit jazz club";
        outEl.textContent = "";
        const text = (PG_TEMPLATES[model] || PG_TEMPLATES.mj)(intent);
        let i = 0;
        const tick = () => {
          if (i >= text.length) return;
          outEl.textContent += text[i++];
          typingTimer = window.setTimeout(tick, 8 + Math.random() * 16);
        };
        tick();
      };
      runBtn.addEventListener("click", run);
      const kickoff = window.setTimeout(run, 600);
      cleanups.push(() => {
        runBtn.removeEventListener("click", run);
        clearTimeout(kickoff);
        if (typingTimer) clearTimeout(typingTimer);
      });
    }

    // ===== CREATOR FLOW TYPEWRITER =====
    const cfTarget = document.getElementById("cfTyped");
    let cfStepTimer: number | null = null;
    let cfCycleTimer: number | null = null;
    if (cfTarget) {
      if (prefersReducedMotion) {
        cfTarget.textContent = CF_TEXT;
      } else {
      const CYCLE = 8000;
      const TYPE_DURATION = 4200;
      const typeOnce = () => {
        cfTarget.textContent = "";
        const total = CF_TEXT.length;
        const stepDelay = TYPE_DURATION / total;
        let i = 0;
        const step = () => {
          if (i >= total) return;
          const ch = CF_TEXT[i++];
          cfTarget.append(document.createTextNode(ch));
          cfStepTimer = window.setTimeout(step, stepDelay + (Math.random() * 18 - 9));
        };
        step();
      };
      typeOnce();
      cfCycleTimer = window.setInterval(typeOnce, CYCLE);
      cleanups.push(() => {
        if (cfStepTimer) clearTimeout(cfStepTimer);
        if (cfCycleTimer) clearInterval(cfCycleTimer);
      });
      }
    }

    return () => {
      cleanups.forEach((fn) => fn());
    };
  }, []);

  return null;
}
