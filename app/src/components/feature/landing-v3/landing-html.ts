// AUTO-GENERATED from /promtexpress v3/PromtExpress Landing.html (lines 1612-2629)
// Embedded as raw HTML for dangerouslySetInnerHTML. Do not hand-edit.
// Inline <script> blocks have been removed and ported to client-effects.tsx.

// Auth-aware header markup. When isAuthenticated, a single Dashboard CTA
// replaces the Log in + Start Free pair. This is a defensive layer — the
// primary auth redirect lives in src/proxy.ts (`/` + session → /generator).
const headerAuthBlockDesktop = (isAuth: boolean) =>
  isAuth
    ? `<a class="btn btn-primary" href="/generator">Dashboard</a>`
    : `<a class="login" href="/auth/signin">Log in</a>
      <a class="btn btn-primary" href="/auth/signup">Start Free</a>`;

const headerAuthBlockMobile = (isAuth: boolean) =>
  isAuth
    ? `<a href="/generator" class="btn btn-primary btn-lg" data-menu-link>Dashboard</a>`
    : `<a href="/auth/signin" class="btn btn-ghost btn-lg" data-menu-link>Log in</a>
    <a href="/auth/signup" class="btn btn-primary btn-lg" data-menu-link>Start Free</a>`;

export const renderLandingHtmlTop = (isAuth: boolean) => String.raw`
<!-- ===== NAV ===== -->
<div class="nav-shell" style="padding-top:18px;">
  <nav class="nav" aria-label="Primary">
    <a class="brand" href="/">
      <img src="/brand/logo-mark.png" alt="PromtExpress" class="mark-img" width="32" height="32" decoding="async" fetchpriority="high" />
      <span>promt<span class="ex">Express</span></span>
    </a>
    <div class="nav-links">
      <a href="#problem">How it Works</a>
      <a href="#templates">Templates</a>
      <a href="#models">Models</a>
      <a href="#faq">FAQ</a>
      <a href="https://github.com/WebitroHQ/promtexpress-oss" target="_blank" rel="noopener">GitHub</a>
      <a href="/feedback">Feedback</a>
    </div>
    <div class="nav-right">
      <button class="menu-trigger" id="menuTrigger" aria-label="Open menu" aria-expanded="false" aria-controls="menuOverlay">
        <span class="dot d1"></span>
        <span class="dot d2"></span>
        <span class="dot d3"></span>
      </button>
      <div id="lv3-lang-slot" class="lv3-lang-slot"></div>
      <button class="theme-toggle" id="themeToggle" aria-label="Toggle theme">
        <svg class="moon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z"/></svg>
        <svg class="sun" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41"/></svg>
      </button>
      ${headerAuthBlockDesktop(isAuth)}
    </div>
  </nav>
</div>

<!-- ===== MOBILE MENU OVERLAY ===== -->
<div class="menu-overlay" id="menuOverlay" aria-hidden="true" data-open="false" role="dialog" aria-modal="true" aria-label="Mobile navigation">
  <div class="menu-overlay-head">
    <a class="brand" href="/">
      <img src="/brand/logo-mark.png" alt="PromtExpress" class="mark-img" width="32" height="32" decoding="async" loading="lazy" />
      <span>promt<span class="ex">Express</span></span>
    </a>
    <button class="menu-close" id="menuClose" aria-label="Close menu">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
    </button>
  </div>
  <nav class="menu-links" aria-label="Mobile primary">
    <a href="#problem" data-menu-link>How it Works <svg class="arr" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg></a>
    <a href="#templates" data-menu-link>Templates <svg class="arr" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg></a>
    <a href="#models" data-menu-link>Models <svg class="arr" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg></a>
    <a href="#faq" data-menu-link>FAQ <svg class="arr" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg></a>
    <a href="https://github.com/WebitroHQ/promtexpress-oss" target="_blank" rel="noopener" data-menu-link>GitHub <svg class="arr" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg></a>
    <a href="/feedback" data-menu-link>Feedback <svg class="arr" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg></a>
  </nav>
  <div class="menu-cta">
    <div id="lv3-lang-slot-mobile" class="lv3-lang-slot-mobile"></div>
    ${headerAuthBlockMobile(isAuth)}
  </div>
</div>

<!-- ===== HERO ===== -->
<section class="hero">
  <div class="wrap">

    <!-- Floating logo (between columns) -->
    <div class="hero-halo" aria-hidden="true"></div>
    <div class="hero-ring-outer" aria-hidden="true"></div>
    <div class="hero-ring" aria-hidden="true"></div>
    <div class="hero-logo" aria-hidden="true">
      <img src="/brand/logo-mark-512.png" alt="" width="512" height="512" decoding="async" fetchpriority="high" />
    </div>

    <div class="hero-grid">
      <!-- LEFT -->
      <div>
        <h1 class="headline">
          <span class="row1">Intent in.</span>
          <span class="row2">Perfect Prompt out.</span>
        </h1>

        <p class="sub">
          Create engine-tuned prompts for ChatGPT, Claude, Gemini,
          Midjourney and 60+ more — fast, clean, optimized.
        </p>

        <div class="cta-row">
          <a class="btn btn-primary btn-lg" href="/auth/signup">
            Start Free
            <svg class="arrow" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>
          </a>
          <a class="btn btn-ghost btn-lg" href="#playground">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="width:14px;height:14px;"><circle cx="12" cy="12" r="9"/><polygon points="10 8 16 12 10 16 10 8" fill="currentColor"/></svg>
            Watch Demo
          </a>
        </div>

        <div class="trust-checks">
          <span><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg> Free</span>
          <span><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg> Open source</span>
          <span><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg> Use your own AI key</span>
        </div>
      </div>

      <!-- RIGHT — Prompt card -->
      <div class="prompt-card" style="padding: 20px 28px 20px 20px;">
        <h4>Your Prompt</h4>
        <div class="prompt-text">
          <span id="promptOut" class="typed"></span><span id="caret" class="caret" aria-hidden="true"></span>
          <span class="icons">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" title="Copy"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15V5a2 2 0 0 1 2-2h10"/></svg>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" title="Share"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.6" y1="13.5" x2="15.4" y2="17.5"/><line x1="15.4" y1="6.5" x2="8.6" y2="10.5"/></svg>
          </span>
        </div>

        <div class="opt-label">Optimized for</div>
        <div class="chips" id="chips">
          <span class="chip" data-key="mj"><span class="dot"></span>Midjourney</span>
          <span class="chip gpt" data-key="gpt"><span class="dot"></span>ChatGPT</span>
          <span class="chip claude" data-key="claude"><span class="dot"></span>Claude</span>
          <span class="chip gemini" data-key="gemini"><span class="dot"></span>Gemini</span>
        </div>

        <div class="quality">
          <div class="quality-row">
            <span class="lbl">Quality Score</span>
            <span class="val"><span id="qScore">98</span><span class="max"> /100</span></span>
          </div>
          <div class="qbar"><i id="qBar"></i></div>
        </div>

        <button class="refine-btn">
          <span class="spark" style="width:14px;height:14px;display:inline-block;-webkit-mask:url(&quot;data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='currentColor'><path d='M12 2l1.6 5.4L19 9l-5.4 1.6L12 16l-1.6-5.4L5 9l5.4-1.6z'/></svg>&quot;) center/contain no-repeat;mask:url(&quot;data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='currentColor'><path d='M12 2l1.6 5.4L19 9l-5.4 1.6L12 16l-1.6-5.4L5 9l5.4-1.6z'/></svg>&quot;) center/contain no-repeat;"></span>
          Refine Prompt
        </button>
      </div>
    </div>

    <!-- ===== 4 FEATURE CARDS ===== -->
    <!-- SEM-2: real H2 restores the H1 -> H2 -> H3 outline (cards below use h3).
         Styled as a small eyebrow label so it does not disrupt the hero design. -->
    <h2 class="features-h2">What you get</h2>
    <div class="features">
      <article class="feat">
        <div class="ico violet">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="4"/><circle cx="12" cy="12" r="1.2" fill="currentColor"/></svg>
        </div>
        <div>
          <h3>Intent First</h3>
          <p>Describe your goal. We handle the rest.</p>
        </div>
      </article>
      <article class="feat">
        <div class="ico orange">
          <svg viewBox="0 0 24 24" fill="currentColor"><path d="M13 2 4 14h7l-1 8 9-12h-7l1-8z"/></svg>
        </div>
        <div>
          <h3>Engine-Tuned</h3>
          <p>Pre-tuned for ChatGPT, Claude, Gemini, and 60+ more.</p>
        </div>
      </article>
      <article class="feat">
        <div class="ico pink">
          <svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2l1.7 5.6L19 9l-5.3 1.4L12 16l-1.7-5.6L5 9l5.3-1.4zM18 14l.9 2.5L21 17l-2.1.5L18 20l-.9-2.5L15 17l2.1-.5z"/></svg>
        </div>
        <div>
          <h3>Higher Quality</h3>
          <p>Higher clarity. More consistency. Less trial &amp; error.</p>
        </div>
      </article>
      <article class="feat">
        <div class="ico blue">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"><path d="M12 3 3 7.5 12 12l9-4.5L12 3z"/><path d="M3 12.5 12 17l9-4.5"/><path d="M3 17.5 12 22l9-4.5"/></svg>
        </div>
        <div>
          <h3>Reusable &amp; Shareable</h3>
          <p>Save, organize, and share prompts that perform.</p>
        </div>
      </article>
    </div>

    <!-- ===== TRUST BAR ===== -->
    <div class="trust">
      <span class="label">PROFESSIONAL PROMPTS FOR 60+ AI ENGINES — BUILT FOR THE TOOLS YOU ALREADY USE</span>
      <div class="marquee" aria-hidden="false">
        <div class="marquee-track" id="trustTrack"></div>
      </div>
    </div>

    <!-- ===== SECONDARY ROW ===== -->
    <div class="row3">
      <!-- HOW IT WORKS -->
      <div class="panel">
        <span class="eyebrow">HOW IT WORKS</span>
        <div class="steps">
          <div class="step s1">
            <div class="circ"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M4 4h12l4 4v12H4z"/><path d="M9 14l2 2 4-4"/></svg></div>
            <h4>1. Describe</h4>
            <p>Tell us what you want to achieve.</p>
          </div>
          <div class="step s2">
            <div class="circ"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><polyline points="8 12 11 15 16 9"/></svg></div>
            <h4>2. Receive</h4>
            <p>Get an engine-tuned prompt you can copy and ship.</p>
          </div>
        </div>
      </div>

      <!-- STATS -->
      <div class="panel">
        <span class="eyebrow">BUILT FOR PERFORMANCE</span>
        <div class="stats">
          <div class="stat">
            <div class="num">$0</div>
            <div class="lbl">No Plans, No Credits</div>
          </div>
          <div class="stat">
            <div class="num">1,400+</div>
            <div class="lbl">Prompts in the Library</div>
          </div>
          <div class="stat">
            <div class="num">60+</div>
            <div class="lbl">AI Engines Supported</div>
          </div>
          <div class="stat">
            <div class="num">100%</div>
            <div class="lbl">Open Source</div>
          </div>
        </div>
      </div>

    </div>

    <!-- ===== FINAL CTA ===== -->
    <div class="final-cta">
      <div>
        <h3>Ready to turn intent into prompts that <span class="accent">ship</span>?</h3>
        <p>Free and open source. Add your own AI key and start generating.</p>
      </div>
      <div class="ctas">
        <a class="btn btn-primary btn-lg" href="/auth/signup">
          Start Free
          <svg class="arrow" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>
        </a>
        <a class="btn btn-ghost btn-lg" href="#templates">Explore Templates</a>
      </div>
    </div>

  </div>
</section>

<!-- ===== PROBLEM ===== -->
<section class="section" id="problem">
  <div class="wrap">
    <div class="section-head">
      <span class="eyebrow">The Problem</span>
      <h2>Prompting is <span class="grad">painful work</span> — and you shouldn't be doing it.</h2>
      <p>Most people spend more time wrestling with prompt syntax than getting answers. PromtExpress flips that.</p>
    </div>
    <div class="problem-grid">
      <div class="pain-card bad">
        <span class="tag">Old way</span>
        <h3>Trial &amp; error, every single time</h3>
        <ul class="pain-list bad">
          <li><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg> Re-write the same boilerplate for every model</li>
          <li><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg> Memorize XML tags, role syntax, escape rules</li>
          <li><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg> 6+ retries before the output is usable</li>
          <li><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg> Inconsistent results across teammates</li>
        </ul>
      </div>
      <div class="pain-card good">
        <span class="tag">With PromtExpress</span>
        <h3>One sentence. Engine-ready prompt.</h3>
        <ul class="pain-list good">
          <li><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg> Describe outcomes, not syntax</li>
          <li><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg> Optimized per-model: GPT, Claude, Midjourney, Gemini</li>
          <li><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg> Validated quality score before you send</li>
          <li><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg> Save, share, reuse across the team</li>
        </ul>
      </div>
    </div>
  </div>
</section>

<!-- ===== BEFORE / AFTER ===== -->
<section class="section" id="ba">
  <div class="wrap">
    <div class="section-head">
      <span class="eyebrow">Before &amp; After</span>
      <h2>The same intent. <span class="grad">A radically better prompt.</span></h2>
      <p>Real input from a real user, side-by-side with what PromtExpress generates.</p>
    </div>
    <div class="ba-grid">
      <div class="ba-col before">
        <div class="ba-head">
          <span class="label">Manual prompt</span>
          <span class="pill-mini">Quality 32/100</span>
        </div>
        <div class="ba-code muted">write a blog post about productivity</div>
        <div class="ba-meta">
          <span class="chip"><span class="dot" style="background:#ff7a7a"></span>Generic output</span>
          <span class="chip"><span class="dot" style="background:#ff7a7a"></span>No structure</span>
          <span class="chip"><span class="dot" style="background:#ff7a7a"></span>Avg. 4 retries</span>
        </div>
      </div>
      <div class="ba-arrow">
        <div class="arrowwrap">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" style="width:18px;height:18px;"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>
        </div>
      </div>
      <div class="ba-col after">
        <div class="ba-head">
          <span class="label">PromtExpress output</span>
          <span class="pill-mini">Quality 96/100</span>
        </div>
<div class="ba-code"><span class="k">Role:</span> Senior B2B content strategist with 8+ years in SaaS.
<span class="k">Goal:</span> 1,200-word blog post on remote-team productivity.
<span class="k">Audience:</span> Engineering managers at 50–500 person startups.
<span class="k">Format:</span> H2 sections, scannable bullets, 1 stat per section.
<span class="k">Tone:</span> Confident, concrete, no fluff.
<span class="k">Constraints:</span> Cite 2 studies. Include 1 contrarian take.
<span class="k">Output:</span> Markdown, with meta description.</div>
        <div class="ba-meta">
          <span class="chip"><span class="dot"></span>Engine-tuned</span>
          <span class="chip gpt"><span class="dot"></span>1-shot success</span>
          <span class="chip claude"><span class="dot"></span>Reusable</span>
        </div>
      </div>
    </div>
  </div>
</section>

<!-- ===== LIVE PLAYGROUND ===== -->
<section class="section" id="playground">
  <div class="wrap">
    <div class="section-head">
      <span class="eyebrow">Demo</span>
      <h2>See it. <span class="grad">Before you sign up.</span></h2>
      <p>Sample prompts for four engines. Sign up and add your AI key to generate from your own intent.</p>
    </div>
    <div class="pg">
      <div class="pg-col">
        <h4>Your intent</h4>
        <textarea id="pgIn" placeholder="e.g. 'a moody portrait of a violinist in a dimly lit jazz club'">a moody portrait of a violinist in a dimly lit jazz club</textarea>
        <div class="pg-controls">
          <div class="pg-models">
            <button class="pg-model active" data-model="mj">Midjourney</button>
            <button class="pg-model" data-model="gpt">ChatGPT</button>
            <button class="pg-model" data-model="claude">Claude</button>
            <button class="pg-model" data-model="gemini">Gemini</button>
          </div>
          <button class="btn btn-primary" id="pgRun">
            Generate
            <svg class="arrow" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>
          </button>
        </div>
      </div>
      <div class="pg-col">
        <h4>Engine-tuned prompt</h4>
        <div class="pg-out" id="pgOut">Click <b>Generate</b> to see your refined prompt appear here.</div>
      </div>
    </div>
  </div>
</section>

<!-- ===== USE CASES ===== -->
<section class="section" id="usecases">
  <div class="wrap">
    <div class="section-head">
      <span class="eyebrow">Built for everyone</span>
      <h2>Whatever you build, <span class="grad">PromtExpress speaks your dialect.</span></h2>
    </div>
    <div class="uc-tabs" id="ucTabs">
      <button class="uc-tab active" data-uc="creator"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="23 7 16 12 23 17 23 7"/><rect x="1" y="5" width="15" height="14" rx="2"/></svg>Creators</button>
      <button class="uc-tab" data-uc="dev"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/></svg>Developers</button>
      <button class="uc-tab" data-uc="marketer"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 17 9 11 13 15 21 7"/><polyline points="14 7 21 7 21 14"/></svg>Marketers</button>
      <button class="uc-tab" data-uc="educator"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M2 9l10-5 10 5-10 5L2 9z"/><path d="M6 11v6c2 1.5 4 2 6 2s4-.5 6-2v-6"/></svg>Educators</button>
    </div>
    <div class="uc-panels">
      <div class="uc-panel active" data-uc="creator">
        <div class="uc-content">
          <div>
            <h3>Scripts, thumbnails, scene boards.</h3>
            <p>Stop wrestling with Midjourney parameter syntax. Describe the shot, get camera, lighting, lens, and style flags optimized for the model you're targeting.</p>
            <ul class="uc-features">
              <li><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>Cinematic shot vocabulary baked in</li>
              <li><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>Aspect-ratio &amp; style tags handled</li>
              <li><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>Reusable scene boards for series</li>
            </ul>
          </div>
          <div class="uc-visual" style="padding:0;background:transparent;border:none;display:block;text-transform:none;letter-spacing:0;font-family:inherit;color:inherit;">
            <div class="creator-flow">
              <div class="cf-panel">
                <div class="cf-panel-head">
                  <span class="cf-dot r"></span>
                  <span class="cf-dot y"></span>
                  <span class="cf-dot g"></span>
                  <span class="cf-panel-title">midjourney · prompt</span>
                  <span class="cf-pill">v6</span>
                </div>
                <div class="cf-prompt" id="cfPrompt"><span class="cf-typed" id="cfTyped"></span><span class="caret"></span></div>
                <div class="cf-progress"><span></span></div>
              </div>
              <div class="cf-grid">
                <div class="cf-generating">
                  <div style="display:grid;place-items:center;text-align:center;">
                    <div class="spinner"></div>
                    Generating 4 variations
                  </div>
                </div>
                <div class="cf-tile t1"><span class="label">v1 · cinematic</span></div>
                <div class="cf-tile t2"><span class="label">v2 · moody</span></div>
                <div class="cf-tile t3"><span class="label">v3 · golden hour</span></div>
                <div class="cf-tile t4"><span class="label">v4 · stylized</span></div>
              </div>
            </div>
          </div>
        </div>
      </div>
      <div class="uc-panel" data-uc="dev">
        <div class="uc-content">
          <div>
            <h3>System prompts that don't drift.</h3>
            <p>Reusable scaffolds for function-calling, structured outputs, and agent loops. Versioned, testable, and exportable as code.</p>
            <ul class="uc-features">
              <li><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>JSON schema generation</li>
              <li><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>API-first: REST, SDK, CLI</li>
              <li><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>Eval suite for prompt regressions</li>
            </ul>
          </div>
          <div class="uc-visual">[ Developer workflow visual ]</div>
        </div>
      </div>
      <div class="uc-panel" data-uc="marketer">
        <div class="uc-content">
          <div>
            <h3>On-brand campaigns, in minutes.</h3>
            <p>Brand voice, target persona, and campaign goal — locked in. Generate copy, visual briefs, and storyboards that stay consistent across channels.</p>
            <ul class="uc-features">
              <li><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>Brand voice memory</li>
              <li><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>Multi-channel briefs in one click</li>
              <li><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>A/B variant generation</li>
            </ul>
          </div>
          <div class="uc-visual">[ Marketer workflow visual ]</div>
        </div>
      </div>
      <div class="uc-panel" data-uc="educator">
        <div class="uc-content">
          <div>
            <h3>Lesson plans tuned to grade level.</h3>
            <p>Standards-aligned prompts for lesson plans, quizzes, and rubrics. Specify grade, subject, and difficulty — get pedagogically sound output.</p>
            <ul class="uc-features">
              <li><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>Bloom's taxonomy aware</li>
              <li><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>Rubric &amp; quiz generators</li>
              <li><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>Reading-level calibration</li>
            </ul>
          </div>
          <div class="uc-visual">[ Educator workflow visual ]</div>
        </div>
      </div>
    </div>
  </div>
</section>

<!-- ===== MODEL COVERAGE ===== -->
<section class="section" id="models">
  <div class="wrap">
    <div class="section-head">
      <h2>One prompt, <span class="grad">60+ engines.</span></h2>
      <p>Optimized templates for every major LLM, image, video, and audio model.</p>
    </div>
    <div class="models-grid" id="modelsGrid"></div>
  </div>
</section>

<!-- ===== TEMPLATE LIBRARY ===== -->
<section class="section" id="templates">
  <div class="wrap">
    <div class="section-head">
      <span class="eyebrow">Template Library</span>
      <h2>An open prompt library. <span class="grad">Across 6 modalities.</span></h2>
      <p>1,400+ prompts to learn from, and a community template library on GitHub that anyone can contribute to.</p>
    </div>
    <div class="tpl-stats">
      <div class="tpl-stat"><div class="num">1,400+</div><div class="lbl">Library prompts</div></div>
      <div class="tpl-stat"><div class="num">6</div><div class="lbl">Modalities</div></div>
      <div class="tpl-stat"><div class="num">5</div><div class="lbl">AI providers you can connect</div></div>
      <div class="tpl-stat"><div class="num">$0</div><div class="lbl">Cost</div></div>
    </div>
    <div class="tpl-grid">
      <div class="tpl-card">
        <span class="cat">✦ Image</span>
        <h4>Cinematic Product Shot</h4>
        <p>Studio lighting, 35mm aesthetic, brand-safe color grading. Tuned for Midjourney v6 &amp; Flux.</p>
      </div>
      <div class="tpl-card">
        <span class="cat">✦ Text</span>
        <h4>Sales Page Copywriter</h4>
        <p>PAS framework, objection handling, hero + 3 sections. Conversion-optimized output.</p>
      </div>
      <div class="tpl-card">
        <span class="cat">✦ Code</span>
        <h4>Function-Calling Scaffold</h4>
        <p>Strict JSON schema, edge-case handling, error recovery. Works with GPT-4o &amp; Claude.</p>
      </div>
      <div class="tpl-card">
        <span class="cat">✦ Video</span>
        <h4>Short-Form Hook Generator</h4>
        <p>3-second hooks, retention-optimized. Outputs script + b-roll suggestions for Sora &amp; Runway.</p>
      </div>
      <div class="tpl-card">
        <span class="cat">✦ Audio</span>
        <h4>Podcast Episode Outliner</h4>
        <p>Cold open, 3 acts, CTA. Tuned for ElevenLabs voice consistency and retention.</p>
      </div>
      <div class="tpl-card">
        <span class="cat">✦ Agent</span>
        <h4>Research Agent System</h4>
        <p>Multi-step plan, source verification, structured output. Drop-in for LangChain &amp; LlamaIndex.</p>
      </div>
    </div>
  </div>
</section>

`;

export const LANDING_HTML_BOTTOM = String.raw`
<!-- ===== FAQ ===== -->
<section class="section" id="faq">
  <div class="wrap">
    <div class="section-head">
      <span class="eyebrow">FAQ</span>
      <h2>Questions, <span class="grad">answered.</span></h2>
    </div>
    <div class="faq-list">
      <details class="faq-item" open>
        <summary>What exactly does PromtExpress do?<span class="plus"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg></span></summary>
        <div class="body">You describe your goal in plain language. PromtExpress matches your intent to a curated template, refines it with an LLM brain, and outputs a production-ready prompt tuned to the model you're targeting — no syntax knowledge required.</div>
      </details>
      <details class="faq-item">
        <summary>Which models are supported?<span class="plus"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg></span></summary>
        <div class="body">All major LLMs (GPT-4o, Claude, Gemini, Llama 3, Mistral, Deepseek, Qwen), image models (Midjourney, Flux, Stable Diffusion, DALL·E 3), video (Sora, Runway, Pika), and audio (ElevenLabs, Suno). 60+ engines and growing.</div>
      </details>
      <details class="faq-item">
        <summary>Is it really free?<span class="plus"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg></span></summary>
        <div class="body">Everything is free. You create an account, add your own AI provider API key (OpenAI, Anthropic, Google Gemini, DeepSeek or OpenRouter) and generate as much as you like. Your provider bills you for the usage; PromtExpress charges nothing.</div>
      </details>
      <details class="faq-item">
        <summary>Do you have an API?<span class="plus"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg></span></summary>
        <div class="body">Yes. Every account gets REST API access, with open-source SDKs for TypeScript and Python and a CLI.</div>
      </details>
      <details class="faq-item">
        <summary>How is this different from ChatGPT or Claude directly?<span class="plus"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg></span></summary>
        <div class="body">We don't replace those models — we make them work better. PromtExpress generates the prompt; you feed it to your favorite model. Think of it as a precision compiler for natural language intent.</div>
      </details>
      <details class="faq-item">
        <summary>Can I use my own templates?<span class="plus"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg></span></summary>
        <div class="body">Yes. The prompt library is open source: you can fork any template or contribute your own on GitHub.</div>
      </details>
      <details class="faq-item">
        <summary>Is my data private?<span class="plus"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg></span></summary>
        <div class="body">Your prompts are saved to your own history and you can export or delete them. Your AI provider key is stored encrypted and is never shown again after you save it. The code is open source, so you can check how it works or run it yourself.</div>
      </details>
      <details class="faq-item">
        <summary>What does it cost to generate a prompt?<span class="plus"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg></span></summary>
        <div class="body">There are no credits. Generation runs on the API key you add, so the only cost is what your AI provider charges you.</div>
      </details>
    </div>
  </div>
</section>

<!-- ===== FINAL CTA WRAPPER ===== -->
<section class="section" style="padding-top:0;">
  <div class="wrap">
    <div class="final-cta" id="finalCta">
      <div>
        <h3>Ready to turn intent into prompts that <span class="accent">ship</span>?</h3>
        <p>Free and open source. Add your own AI key and start generating.</p>
      </div>
      <div class="ctas">
        <a class="btn btn-primary btn-lg" href="/auth/signup">
          Start Free
          <svg class="arrow" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>
        </a>
        <a class="btn btn-ghost btn-lg" href="#templates">Explore Templates</a>
      </div>
    </div>

  </div>
</section>


<!-- ===== SEO / ABOUT BLOCK (SEO + Mobile SEO + AIO + GEO + Keywords) ===== -->
<section class="section" style="padding-top:0;" aria-labelledby="aboutHeading">
  <div class="wrap">
    <article class="seo-block">
      <header class="seo-head">
        <h2 id="aboutHeading">About <span class="grad">PromtExpress</span> — the hybrid AI prompt engine</h2>
        <div class="seo-tags" aria-label="Optimization signals">
          <span class="seo-tag seo">SEO</span>
          <span class="seo-tag">Mobile SEO</span>
          <span class="seo-tag aio">AIO</span>
          <span class="seo-tag geo">GEO</span>
          <span class="seo-tag kw">Keywords</span>
        </div>
      </header>

      <div class="seo-grid">
        <div class="seo-body">
          <p>
            <strong>PromtExpress</strong> is a <strong>next-generation AI prompt engineering platform</strong>
            that turns plain intent into <strong>engine-tuned prompts</strong> for ChatGPT, Claude, Gemini,
            Midjourney, Llama, Mistral, DeepSeek, Grok, Sora and 60+ other large language, image, video and
            audio models. Built for creators, developers, marketers and educators, our hybrid engine combines
            <em>an open library of 1,400+ prompts</em> with real-time LLM refinement to deliver prompts that ship.
          </p>
          <p>
            Whether you write code, run paid campaigns, ship product briefs, design visual concepts or teach,
            PromtExpress shortens the path from idea to output. Describe what you want — we craft, optimize and
            structure the perfect prompt with system messages, role definitions, constraints, examples and
            output formats your target engine actually understands.
          </p>

          <h3>Why teams choose PromtExpress</h3>
          <p>
            Most prompt tools generate a single string. PromtExpress generates a <strong>full instruction
            architecture</strong>: system + role + task + constraints + format + few-shot examples — tuned per
            model. Result: higher consistency, fewer retries, measurable quality scores, and prompts you can
            <strong>save, version and share</strong> across your team via API, CLI or web.
          </p>

          <h3>AI Search & Answer Engine Optimization (AIO)</h3>
          <p>
            We build for the next era of search. Our content and prompts are structured for
            <strong>AI answer engines</strong> — ChatGPT Search, Perplexity, Gemini, Claude, Bing Copilot and
            SGE — using semantic markup, schema.org metadata, citation-friendly facts and clear entity
            relationships. <strong>Generative Engine Optimization (GEO)</strong> is core to how we ship.
          </p>

          <h3>Mobile-first & globally fast</h3>
          <p>
            PromtExpress is engineered <strong>mobile-first</strong>: sub-second TTFB on edge, Core Web Vitals
            in the green, and a touch-optimized UI. The interface and the prompt library are in English.
          </p>
        </div>

        <aside class="seo-side" aria-label="Optimization signals detail">
          <div class="seo-card">
            <h4><span class="ico">#</span> Top Keywords</h4>
            <div class="kw-list">
              <span>ai prompt generator</span>
              <span>prompt engineering</span>
              <span>chatgpt prompt builder</span>
              <span>midjourney prompts</span>
              <span>claude prompt optimizer</span>
              <span>llm prompt templates</span>
              <span>system prompt</span>
              <span>few-shot examples</span>
              <span>prompt library</span>
              <span>ai prompt api</span>
              <span>structured prompts</span>
              <span>generative ai tools</span>
            </div>
          </div>

          <div class="seo-card">
            <h4><span class="ico">◎</span> GEO — Geographic Reach</h4>
            <div class="geo-list">
              <span>🇺🇸 United States</span>
              <span>🇬🇧 United Kingdom</span>
              <span>🇹🇷 Türkiye</span>
              <span>🇩🇪 Germany</span>
              <span>🇫🇷 France</span>
              <span>🇪🇸 Spain</span>
              <span>🇧🇷 Brazil</span>
              <span>🇯🇵 Japan</span>
              <span>🇮🇳 India</span>
              <span>🇦🇪 UAE</span>
              <span>🇨🇳 China</span>
              <span>🇨🇦 Canada</span>
            </div>
          </div>

          <div class="seo-card">
            <h4><span class="ico">★</span> AIO — Answer Engine Coverage</h4>
            <div class="ai-list">
              <div class="row"><span class="name">ChatGPT Search</span><span class="stat">indexed</span></div>
              <div class="row"><span class="name">Perplexity</span><span class="stat">indexed</span></div>
              <div class="row"><span class="name">Google SGE</span><span class="stat">indexed</span></div>
              <div class="row"><span class="name">Bing Copilot</span><span class="stat">indexed</span></div>
              <div class="row"><span class="name">Claude</span><span class="stat">cited</span></div>
              <div class="row"><span class="name">Gemini</span><span class="stat">cited</span></div>
            </div>
          </div>
        </aside>
      </div>

      <!-- SoftwareApplication JSON-LD moved out (Plan §3.3) — rendered via
           src/lib/seo/schemas + landing route. Removed fake aggregateRating
           (12000 reviews), areaServed (12 countries), and 9-locale inLanguage
           claim (US-only target). -->
    </article>
  </div>
</section>

<!-- Plan §6.4 — global SiteFooter component now renders the footer; the
     21 dead href="#" anchors that lived here are gone. -->
`;
