"use client";

/**
 * v4 Generator UI — 3 ekran akışı (Library-Augmented Single-Shot Studio)
 *
 *   Screen 1: Hedef AI seçimi + serbest metin → "Devam Et"
 *   Screen 2: (Koşullu) Senaryo A→atla, B→max 3 chip soru, C→3 yorum doğrulama
 *   Screen 3: Tek prompt + iterasyon textarea + assumptions paneli
 *
 * Variation YOK (Direktif #1). LevelToggle YOK (tek seviye, herkes pro).
 * Iterasyon: aynı promptId üzerinde feedback ile yeniden üretim → /api/generate (iteration field).
 */
import * as React from "react";
import {
  Sparkles, Copy, Bookmark, Check, Info, ArrowLeft, ArrowRight,
  Code2, Image as ImageIcon, Video, Mic, Music, Type, ChevronDown,
  Sigma, Presentation, Network, Box, FileText,
  Brain, Target as TargetIcon, Wand2, ShieldCheck, CheckCircle2,
} from "lucide-react";
import { toast } from "sonner";
import { useRouter } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { ModalitySwitcher, type Modality } from "./modality-switcher";
import { cn } from "@/lib/utils";
import { toggleFavorite } from "@/server/actions/prompts";
import { EmailVerifyBanner } from "@/components/feature/auth/email-verify-banner";
import { TargetPickerV2 } from "./target-picker-v2";
import { INTENT_MAX_LEN, INTENT_MIN_LEN } from "@/lib/limits";

// ── Types ─────────────────────────────────────────────────
type Screen = "screen1" | "screen2" | "screen3";

interface ChipQuestion {
  label: string;
  options: string[];
}

interface Assumption {
  key: string;
  value: string;
  label_tr: string;
}

interface IntentAnalysisData {
  domain: string;
  language: string;
  scenario: "A" | "B" | "C";
  missing_params: string[];
  chip_questions: ChipQuestion[];
  ambiguity_clarifications: string[];
  psych_signals: {
    expertise: "novice" | "intermediate" | "expert";
    tone: "casual" | "professional" | "frustrated" | "neutral";
    specificity: number;
  };
}

interface AnalyzeResponse {
  scenario: "A" | "B" | "C";
  domain: string;
  language: string;
  chipQuestions: ChipQuestion[];
  ambiguityClarifications: string[];
  /** F1 — generate'e cachedIntent olarak geri gönderilir, Layer 2 atlanır. */
  intentAnalysis: IntentAnalysisData;
}

interface GenerateResponse {
  promptId: string;
  output: string;
  creditsUsed: number;
  creditsRemaining: number;
  latencyMs: number;
  validationScore: number | null;
  validationIssues: string[];
  assumptions: Assumption[];
  traceId: string;
  scenario: "A" | "B" | "C";
  recentEntry: {
    id: string;
    mod: string;
    title: string;
    userInput: string;
    date: string;
  };
}

interface TargetEngineOption {
  id: string;
  slug: string;
  name: string;
  provider: string | null;
  modality: string;
  sortOrder: number;
  iconUrl?: string | null;
  createdAt?: string | Date;
  tier?: string | null;
  capabilities?: string[] | null;
  releasedAt?: string | Date | null;
  brandColor?: string | null;
}

interface Props {
  creditsRemaining?: number;
  recentPrompts?: Array<{ id: string; mod: string; title: string; userInput: string; date: string }>;
  initialIntent?: string;
  targetEngines: TargetEngineOption[];
  popularByModality?: Partial<Record<Modality, TargetEngineOption[]>>;
  /**
   * "full"  → tüm 3 ekran akışı, normal generator (auth gerekli).
   * "demo"  → sadece Screen 1; "Devam et" butonunda misafir → /auth/signup, üye → /generator (prefill).
   */
  mode?: "demo" | "full";
  /** Misafir vs. üye ayrımı (demo modunda davranışı belirler). */
  isAuthenticated?: boolean;
  /** "full" mod: kullanıcının e-postası doğrulanmış mı (banner + disable mantığı). */
  emailVerified?: boolean;
  /** "full" mod: banner + verify sayfası için kullanıcı maili. */
  userEmail?: string;
  /** Verify callback'inden geliyorsa (?verified=1) toast tetiklenir. */
  justVerified?: boolean;
}

const GUEST_PROMPT_STORAGE_KEY = "pe.guestPrompt";

const MODALITY_ICONS: Record<string, React.ElementType> = {
  text: Type, code: Code2, image: ImageIcon, video: Video, audio: Mic, music: Music,
  math: Sigma, slides: Presentation, diagram: Network, "3d": Box, document: FileText,
};

const SKIP_OPTION = "Sen karar ver";

// ──────────────────────────────────────────────────────────
// Generation progress stages (FAZ 7 mini, 2026-05-03)
// Timed visual stepper — no real SSE in sync mode, transitions are scheduled
// against observed layer latencies (L2: 0-25s, L3: ~1s, L4: 12-50s, L5+L6: <1s).
// If the actual generation completes earlier, we jump straight to "done".
// If synthesizer takes longer than estimated, we hold on the synthesize step
// (do NOT auto-advance past it — better than lying about progress).
// ──────────────────────────────────────────────────────────

type GenStage = "idle" | "analyzing" | "context" | "synthesizing" | "validating" | "done";

interface StageDef {
  key: GenStage;
  labelKey: string;
  hintKey: string;
  icon: React.ElementType;
}

const STAGES: StageDef[] = [
  { key: "analyzing", labelKey: "analyzing", hintKey: "analyzingHint", icon: Brain },
  { key: "context", labelKey: "context", hintKey: "contextHint", icon: TargetIcon },
  { key: "synthesizing", labelKey: "synthesizing", hintKey: "synthesizingHint", icon: Wand2 },
  { key: "validating", labelKey: "validating", hintKey: "validatingHint", icon: ShieldCheck },
  { key: "done", labelKey: "done", hintKey: "doneHint", icon: CheckCircle2 },
];

function stageOrder(s: GenStage): number {
  const idx = STAGES.findIndex((x) => x.key === s);
  return idx < 0 ? -1 : idx;
}

function GenerationProgress({ stage, modality, targetName }: { stage: GenStage; modality: string; targetName?: string | null }) {
  const tStep = useTranslations("generator.steps");
  const tUi = useTranslations("generator.ui");
  const activeIdx = stageOrder(stage);
  return (
    <div className="rounded-[var(--pe-r-md)] border border-border bg-surface-2 p-5">
      <ol className="space-y-3">
        {STAGES.filter((s) => s.key !== "done").map((s, i) => {
          const isDone = activeIdx > i;
          const isActive = activeIdx === i;
          const Icon = s.icon;
          return (
            <li key={s.key} className="flex items-start gap-3">
              <div
                className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full transition-colors ${
                  isDone
                    ? "bg-success/15 text-success"
                    : isActive
                      ? "bg-primary/15 text-primary"
                      : "bg-surface text-text-faint"
                }`}
              >
                {isDone ? (
                  <Check className="h-4 w-4" />
                ) : (
                  <Icon className={`h-4 w-4 ${isActive ? "animate-pulse" : ""}`} />
                )}
              </div>
              <div className="min-w-0 flex-1">
                <p
                  className={`text-sm leading-tight ${
                    isDone ? "text-text-muted line-through decoration-1 decoration-text-faint/40" : isActive ? "text-text font-medium" : "text-text-faint"
                  }`}
                >
                  {tStep(s.labelKey)}
                  {isActive && s.key === "synthesizing" && targetName ? (
                    <span className="ml-1.5 font-normal text-text-muted">— {targetName}</span>
                  ) : null}
                </p>
                {isActive && (
                  <p className="mt-0.5 text-xs text-text-muted">
                    {tStep(s.hintKey)}
                  </p>
                )}
              </div>
            </li>
          );
        })}
      </ol>
      {stage === "synthesizing" && (
        <div className="mt-4 h-1 overflow-hidden rounded-full bg-surface">
          <div className="h-full w-1/3 animate-[shimmer_1.6s_ease-in-out_infinite] rounded-full bg-gradient-to-r from-transparent via-primary/60 to-transparent" />
        </div>
      )}
      <p className="mt-4 text-[11px] text-text-faint">
        {tUi("modalityLabel")}: <span className="font-mono">{modality}</span>
        {targetName ? (
          <>
            {" • "}{tUi("targetLabel")}: <span className="font-mono">{targetName}</span>
          </>
        ) : null}
      </p>
    </div>
  );
}

// FAZ 4 (2026-05-03) — wait for async generation job via SSE.
// Server pushes 'completed' or 'failed' event; resolves/rejects accordingly.
function waitForJobViaSSE(jobId: string, signal: AbortSignal): Promise<GenerateResponse> {
  return new Promise((resolve, reject) => {
    if (typeof window === "undefined" || !("EventSource" in window)) {
      // Fallback to polling if EventSource unavailable
      void pollJob(jobId, signal).then(resolve).catch(reject);
      return;
    }
    const es = new EventSource(`/api/generate/${jobId}/stream`);
    const onAbort = () => {
      es.close();
      reject(new DOMException("Aborted", "AbortError"));
    };
    signal.addEventListener("abort", onAbort, { once: true });

    es.addEventListener("completed", (ev) => {
      try {
        const payload = JSON.parse((ev as MessageEvent).data) as { result: { ok: boolean; result?: GenerateResponse; error?: string } };
        es.close();
        signal.removeEventListener("abort", onAbort);
        if (payload?.result?.ok && payload.result.result) {
          resolve(payload.result.result);
        } else {
          reject(new Error(payload?.result?.error ?? "GENERATION_FAILED"));
        }
      } catch (err) {
        es.close();
        reject(err instanceof Error ? err : new Error("Parse error"));
      }
    });
    es.addEventListener("failed", (ev) => {
      const payload = JSON.parse((ev as MessageEvent).data) as { reason: string };
      es.close();
      signal.removeEventListener("abort", onAbort);
      reject(new Error(payload?.reason ?? "GENERATION_FAILED"));
    });
    es.onerror = () => {
      // CONNECTING (0) or OPEN (1): let browser auto-reconnect.
      // CLOSED (2): handshake or transport failed permanently — fall back to HTTP polling
      // so the user's job (already queued, 202 received) still completes.
      if (es.readyState === EventSource.CLOSED) {
        signal.removeEventListener("abort", onAbort);
        void pollJob(jobId, signal).then(resolve).catch(reject);
      }
    };
  });
}

async function pollJob(jobId: string, signal: AbortSignal): Promise<GenerateResponse> {
  const start = Date.now();
  const TIMEOUT = 10 * 60 * 1000;
  while (Date.now() - start < TIMEOUT) {
    if (signal.aborted) throw new DOMException("Aborted", "AbortError");
    const r = await fetch(`/api/generate/${jobId}`, { signal });
    if (!r.ok) {
      if (r.status === 404) throw new Error("Job not found");
      throw new Error(`Status ${r.status}`);
    }
    const data = (await r.json()) as { status: string; result?: { ok: boolean; result?: GenerateResponse; error?: string }; failedReason?: string };
    if (data.status === "completed") {
      if (data.result?.ok && data.result.result) return data.result.result;
      throw new Error(data.result?.error ?? "GENERATION_FAILED");
    }
    if (data.status === "failed") {
      throw new Error(data.failedReason ?? "GENERATION_FAILED");
    }
    await new Promise((r) => setTimeout(r, 1500));
  }
  throw new Error("GENERATION_TIMEOUT");
}

// ──────────────────────────────────────────────────────────
export function GeneratorClient({
  creditsRemaining = 0,
  recentPrompts = [],
  initialIntent,
  targetEngines,
  popularByModality = {},
  mode = "full",
  isAuthenticated = false,
  emailVerified = true,
  userEmail = "",
  justVerified = false,
}: Props) {
  const router = useRouter();
  const t = useTranslations("generator");
  const tToast = useTranslations("generator.toast");
  const tErr = useTranslations("generator.errors");
  const tUi = useTranslations("generator.ui");
  const tS1 = useTranslations("generator.screen1");
  const tS2 = useTranslations("generator.screen2");
  const tS3 = useTranslations("generator.screen3");
  const tSide = useTranslations("generator.sidebar");

  // Map native browser fetch errors (Safari/iOS "Load failed", Chromium "Failed to fetch",
  // Firefox "NetworkError when attempting to fetch resource.") to a user-friendly i18n
  // message. Falls back to `fallback` for non-network errors.
  const mapNetworkError = React.useCallback(
    (msg: string, fallback: string): string =>
      /^Load failed$/i.test(msg) ||
      /^Failed to fetch$/i.test(msg) ||
      /NetworkError/i.test(msg)
        ? tErr("network")
        : fallback,
    [tErr],
  );

  const isDemo = mode === "demo";
  const needsEmailVerify = !isDemo && !emailVerified && userEmail.length > 0;

  React.useEffect(() => {
    if (justVerified) {
      toast.success(tToast("emailVerified"));
    }
  }, [justVerified, tToast]);

  const [screen, setScreen] = React.useState<Screen>("screen1");
  const [intent, setIntent] = React.useState(initialIntent ?? "");

  // "full" mod: mount sonrası sessionStorage'da bekleyen guest prompt'u içe aktar
  React.useEffect(() => {
    if (isDemo) return;
    if (typeof window === "undefined") return;
    try {
      const raw = window.sessionStorage.getItem(GUEST_PROMPT_STORAGE_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw) as { input?: unknown; modality?: unknown; targetEngineId?: unknown };
      window.sessionStorage.removeItem(GUEST_PROMPT_STORAGE_KEY);
      if (typeof parsed.input === "string" && parsed.input.length > 0 && parsed.input.length <= INTENT_MAX_LEN) {
        setIntent(parsed.input);
      }
      if (typeof parsed.modality === "string") {
        const m = parsed.modality;
        if (m === "text" || m === "code" || m === "image" || m === "video" || m === "audio" || m === "music") {
          setModality(m);
        }
      }
      if (typeof parsed.targetEngineId === "string" && parsed.targetEngineId.length > 0) {
        setTargetEngineId(parsed.targetEngineId);
      }
    } catch {
      // ignore corrupted payload
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const [modality, setModality] = React.useState<Modality>("text");
  const [targetEngineId, setTargetEngineId] = React.useState<string | null>(null);
  const [localCreditsRemaining, setLocalCreditsRemaining] = React.useState(creditsRemaining);
  const [recentPromptsState, setRecentPromptsState] = React.useState(recentPrompts);

  // Screen 2 state
  const [scenario, setScenario] = React.useState<"A" | "B" | "C" | null>(null);
  const [chipQuestions, setChipQuestions] = React.useState<ChipQuestion[]>([]);
  const [ambiguityClarifications, setAmbiguityClarifications] = React.useState<string[]>([]);
  const [questionStep, setQuestionStep] = React.useState(0);
  const [answers, setAnswers] = React.useState<Array<{ question: string; answer: string }>>([]);
  const [customAnswerOpen, setCustomAnswerOpen] = React.useState(false);
  const [customAnswerText, setCustomAnswerText] = React.useState("");
  // F1 — analyze sonucu, generate çağrılarında cachedIntent olarak gönderilir
  const [cachedIntent, setCachedIntent] = React.useState<IntentAnalysisData | null>(null);
  // 2026-05-12 confabulation fix — Plan §1. Kullanıcı clarification'ı atlamak
  // istediğinde açıkça düşük-güven onayı gerekli.
  const [lowConfidenceConfirmOpen, setLowConfidenceConfirmOpen] = React.useState(false);

  // Screen 3 state
  const [output, setOutput] = React.useState("");
  const [assumptions, setAssumptions] = React.useState<Assumption[]>([]);
  const [validationIssues, setValidationIssues] = React.useState<string[]>([]);
  const [lastPromptId, setLastPromptId] = React.useState<string | null>(null);
  const [isFavorited, setIsFavorited] = React.useState(false);

  // Loading + control
  const [isAnalyzing, setIsAnalyzing] = React.useState(false);
  const [isGenerating, setIsGenerating] = React.useState(false);
  // Generation stage indicator (visual progress while user waits — no real SSE
  // events in sync mode, transitions are timed against observed layer latencies).
  const [genStage, setGenStage] = React.useState<GenStage>("idle");
  const stageTimersRef = React.useRef<ReturnType<typeof setTimeout>[]>([]);
  // FAZ 7 mini-2 (2026-05-03) — debounced background pre-fetch of analyze.
  // Key = intent.trim() + modality + targetEngineId. If user clicks "Devam et"
  // and the same key has a cached result, use it (perceived latency ~0ms).
  // Otherwise falls back to live analyze. ABORT on stale (key changed mid-flight).
  const prefetchRef = React.useRef<{
    key: string;
    promise: Promise<AnalyzeResponse | null>;
    abort: AbortController;
  } | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [copied, setCopied] = React.useState(false);
  const abortRef = React.useRef<AbortController | null>(null);

  // Keep intent in sync with /generator?intent=... navigations (post-commit, sadece prop değişiminde).
  React.useEffect(() => {
    if (initialIntent != null && initialIntent.length > 0) {
      setIntent(initialIntent);
    }
  }, [initialIntent]);

  React.useEffect(() => () => abortRef.current?.abort(), []);

  // Stage timer cleanup on unmount (prevent leak after navigation away).
  React.useEffect(() => {
    return () => {
      stageTimersRef.current.forEach((t) => clearTimeout(t));
      stageTimersRef.current = [];
    };
  }, []);

  // FAZ 7 mini-2 (2026-05-03) — Pre-fetch /api/generate/analyze in the background.
  // Trigger: 800ms debounce after intent typing stops, intent.length ≥ 30,
  // modality + targetEngineId selected, screen===screen1, authenticated.
  // Cancels prior prefetch when key changes; result kept in prefetchRef for
  // handleContinue to short-circuit (perceived latency ~0ms when warm).
  React.useEffect(() => {
    if (!isAuthenticated || isDemo) return;
    if (screen !== "screen1") return;
    const trimmed = intent.trim();
    if (trimmed.length < 30 || trimmed.length > INTENT_MAX_LEN) return;
    if (!modality || !targetEngineId) return;

    const key = `${trimmed}::${modality}::${targetEngineId}`;
    if (prefetchRef.current?.key === key) return; // already cached or in-flight

    const timer = setTimeout(() => {
      // Abort previous in-flight prefetch (stale key)
      prefetchRef.current?.abort.abort();
      const ctl = new AbortController();
      const promise = fetch("/api/generate/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ intent: trimmed, modality, targetEngineId }),
        signal: ctl.signal,
      })
        .then((r) => (r.ok ? (r.json() as Promise<AnalyzeResponse>) : null))
        .catch(() => null);
      prefetchRef.current = { key, promise, abort: ctl };
    }, 800);

    return () => clearTimeout(timer);
  }, [intent, modality, targetEngineId, screen, isAuthenticated, isDemo]);

  // FAZ 7 (2026-05-03) — Job resume on mount.
  // If localStorage has an active jobId from a prior tab/page-reload, reattach
  // to its SSE stream and pick up where we left off.
  React.useEffect(() => {
    if (typeof window === "undefined") return;
    let activeJobId: string | null = null;
    try {
      activeJobId = localStorage.getItem("pe.activeJobId");
    } catch {
      return;
    }
    if (!activeJobId) return;

    setIsGenerating(true);
    setScreen("screen3");
    abortRef.current?.abort();
    abortRef.current = new AbortController();

    waitForJobViaSSE(activeJobId, abortRef.current.signal)
      .then((data) => {
        setOutput(data.output);
        setAssumptions(data.assumptions);
        setValidationIssues(data.validationIssues);
        setLastPromptId(data.promptId);
        setLocalCreditsRemaining(data.creditsRemaining);
        setIsFavorited(false);
        try {
          localStorage.removeItem("pe.activeJobId");
        } catch {
          /* */
        }
      })
      .catch((err) => {
        if (err instanceof Error && err.name !== "AbortError") {
          // Stale job — clear and reset
          setError(mapNetworkError(err.message, err.message));
          setScreen("screen1");
        }
        try {
          localStorage.removeItem("pe.activeJobId");
        } catch {
          /* */
        }
      })
      .finally(() => setIsGenerating(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Filter target engines by modality
  const availableTargets = React.useMemo(
    () => targetEngines.filter((t) => t.modality === modality),
    [targetEngines, modality],
  );

  // Group by provider for the dropdown
  const targetsByProvider = React.useMemo(() => {
    const map: Record<string, TargetEngineOption[]> = {};
    for (const t of availableTargets) {
      const p = t.provider ?? tUi("otherProvider");
      if (!map[p]) map[p] = [];
      map[p].push(t);
    }
    return map;
  }, [availableTargets]);

  const selectedTarget = targetEngines.find((t) => t.id === targetEngineId) ?? null;

  // Reset target when modality changes
  React.useEffect(() => {
    if (selectedTarget && selectedTarget.modality !== modality) {
      setTargetEngineId(null);
    }
  }, [modality, selectedTarget]);

  // ── Screen 1 → analyze ─────────────────────────────────
  const handleContinue = async () => {
    if (intent.trim().length < 3) return;

    // Demo mode: girdi sessionStorage'a kaydedilir; misafir → /auth/signup,
    // üye → doğrudan /generator (mount'ta sessionStorage'dan içe aktarılır).
    if (isDemo) {
      const trimmed = intent.slice(0, INTENT_MAX_LEN);
      try {
        if (typeof window !== "undefined") {
          window.sessionStorage.setItem(
            GUEST_PROMPT_STORAGE_KEY,
            JSON.stringify({ input: trimmed, modality, targetEngineId }),
          );
        }
      } catch {
        // storage quota / private mode → ignore
      }
      if (!isAuthenticated) {
        router.push("/auth/signup?next=/generator&from=demo");
      } else {
        router.push("/generator");
      }
      return;
    }

    setError(null);
    setIsAnalyzing(true);
    abortRef.current?.abort();
    abortRef.current = new AbortController();

    try {
      // FAZ 7 mini-2 (2026-05-03) — pre-fetch fast path.
      // If background prefetch already produced a result for the current
      // (intent + modality + targetEngineId) key, use it without re-fetching.
      const trimmed = intent.trim();
      const key = `${trimmed}::${modality}::${targetEngineId}`;
      let data: AnalyzeResponse | null = null;
      if (prefetchRef.current?.key === key) {
        const cached = await prefetchRef.current.promise;
        if (cached) data = cached;
      }

      if (!data) {
        const res = await fetch("/api/generate/analyze", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ intent, modality, targetEngineId }),
          signal: abortRef.current.signal,
        });
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          if (res.status === 403 && body?.error === "EMAIL_NOT_VERIFIED") {
            setError(tErr("emailVerifyRequired"));
            return;
          }
          const intentErr = body?.details?.fieldErrors?.intent?.[0];
          if (res.status === 400 && intentErr) {
            setError(tErr("intentInvalid", { reason: intentErr }));
            return;
          }
          throw new Error(body?.error ?? `Analyze failed (${res.status})`);
        }
        data = (await res.json()) as AnalyzeResponse;
      }
      setScenario(data.scenario);
      setChipQuestions(data.chipQuestions);
      setAmbiguityClarifications(data.ambiguityClarifications);
      setCachedIntent(data.intentAnalysis);

      if (data.scenario === "A") {
        // Niyet net — direkt üretim, cachedIntent ile (Layer 2 atlanır)
        await runGenerate([], data.intentAnalysis);
      } else {
        setScreen("screen2");
        setQuestionStep(0);
        setAnswers([]);
        setCustomAnswerOpen(false);
        setCustomAnswerText("");
      }
    } catch (err) {
      if (err instanceof Error && err.name === "AbortError") return;
      setError(
        err instanceof Error
          ? mapNetworkError(err.message, err.message)
          : tErr("analyzeFailed"),
      );
    } finally {
      setIsAnalyzing(false);
    }
  };

  // ── Screen 2 → answer chip ─────────────────────────────
  const answerChip = async (selected: string) => {
    const q = chipQuestions[questionStep];
    if (!q) return;
    const newAnswers = selected === SKIP_OPTION
      ? answers
      : [...answers, { question: q.label, answer: selected }];
    setAnswers(newAnswers);
    setCustomAnswerOpen(false);
    setCustomAnswerText("");
    if (questionStep < chipQuestions.length - 1) {
      setQuestionStep(questionStep + 1);
    } else {
      await runGenerate(newAnswers);
    }
  };

  const handleSkipAll = async () => {
    // 2026-05-12 confabulation fix — Plan §1. scenario=B + missing_params var +
    // answers boş ise kullanıcıya "düşük güven" uyarı modalı; onaylanırsa
    // acknowledgeLowConfidence=true ile devam.
    const hasMissing = (cachedIntent?.missing_params?.length ?? 0) > 0;
    const noAnswers = answers.length === 0;
    if (scenario === "B" && hasMissing && noAnswers) {
      setLowConfidenceConfirmOpen(true);
      return;
    }
    await runGenerate(answers);
  };

  const confirmLowConfidenceAndRun = async () => {
    setLowConfidenceConfirmOpen(false);
    await runGenerate(answers, null, true);
  };

  const cancelLowConfidence = () => {
    setLowConfidenceConfirmOpen(false);
  };

  const handleBack = () => {
    setCustomAnswerOpen(false);
    setCustomAnswerText("");
    if (questionStep === 0) {
      setScreen("screen1");
      return;
    }
    setQuestionStep((s) => s - 1);
    setAnswers((prev) => prev.slice(0, -1));
  };

  // ── Screen 2 → ambiguity clarification (Senaryo C) ─────
  const pickClarification = async (clar: string) => {
    // Clarification'ı intent'in yerine geçirmiyoruz — intent korunur, açıklama answer olarak gönderilir
    const newAnswers = [...answers, { question: tUi("intentDescription"), answer: clar }];
    setAnswers(newAnswers);
    await runGenerate(newAnswers);
  };

  const handleEditIntent = () => {
    setScreen("screen1");
  };

  // ── Generate (full pipeline) ──────────────────────────
  const runGenerate = async (
    finalAnswers: Array<{ question: string; answer: string }>,
    cachedIntentArg?: IntentAnalysisData | null,
    acknowledgeLowConfidence: boolean = false,
  ) => {
    setError(null);
    setIsGenerating(true);
    setScreen("screen3");

    abortRef.current?.abort();
    abortRef.current = new AbortController();

    // FAZ 7 mini (2026-05-03) — visual stage transitions while user waits.
    // Sync mode has no real progress events — schedule transitions against
    // observed layer latencies. Hold on "synthesizing" indefinitely (the long
    // step) instead of fake-advancing past it.
    stageTimersRef.current.forEach((t) => clearTimeout(t));
    stageTimersRef.current = [];
    const hasCachedIntent = !!(cachedIntentArg ?? cachedIntent);
    setGenStage("analyzing");
    // L1+L2: ~5-15s without cache, ~0.5s with cachedIntent
    const t1 = setTimeout(() => setGenStage("context"), hasCachedIntent ? 500 : 6000);
    // L3 context: ~1-2s, then synthesize (longest step — hold here)
    const t2 = setTimeout(() => setGenStage("synthesizing"), hasCachedIntent ? 1800 : 7500);
    stageTimersRef.current.push(t1, t2);

    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          intent,
          modality,
          targetEngineId,
          answers: finalAnswers,
          // F1 — analyze sonucunu re-use; pipeline Layer 2'yi atlar
          cachedIntent: cachedIntentArg ?? cachedIntent ?? null,
          // 2026-05-12 confabulation fix — scenario=B + answers boş durumunda
          // sunucu 422 LOW_CONFIDENCE_ACK_REQUIRED döner; bu flag açıkça kabul.
          acknowledgeLowConfidence,
        }),
        signal: abortRef.current.signal,
      });
      if (!res.ok && res.status !== 202) {
        const body = await res.json().catch(() => ({}));
        if (res.status === 403 && body?.error === "EMAIL_NOT_VERIFIED") {
          setError(tErr("emailVerifyRequired"));
          setScreen("screen1");
          return;
        }
        // 2026-05-04 — human-readable error messages. 503 ayrımı: Engine
        // error (adapter) ↔ Pipeline error (queue/layer). body.error ipucu verir.
        const isEngineError =
          typeof body?.error === "string" && body.error.startsWith("Engine error");
        const humanMsg =
          res.status === 524 || res.status === 504
            ? tErr("systemBusy")
            : res.status === 503
              ? isEngineError
                ? tErr("engineUnavailable")
                : tErr("queueUnavailable")
              : res.status === 429
                ? body?.error?.includes("IP")
                  ? tErr("rateLimitIp")
                  : tErr("rateLimitFast")
                : res.status === 412
                  ? tErr("noAiKey")
                  : res.status === 402
                  ? tErr("insufficientCredits")
                  : (body?.message ?? body?.error ?? `${tErr("generationFailed")} (${res.status})`);
        throw new Error(humanMsg);
      }

      // FAZ 4 (2026-05-03) — async queue path. 202 → wait via SSE for completion.
      let data: GenerateResponse;
      if (res.status === 202) {
        const { jobId } = (await res.json()) as { jobId: string };
        // Persist active jobId for tab-resume (FAZ 7.3)
        try {
          localStorage.setItem("pe.activeJobId", jobId);
        } catch {
          /* private browsing */
        }
        data = await waitForJobViaSSE(jobId, abortRef.current.signal);
        try {
          localStorage.removeItem("pe.activeJobId");
        } catch {
          /* */
        }
      } else {
        data = (await res.json()) as GenerateResponse;
      }
      setOutput(data.output);
      setAssumptions(data.assumptions);
      setValidationIssues(data.validationIssues);
      setLastPromptId(data.promptId);
      setLocalCreditsRemaining(data.creditsRemaining);
      setIsFavorited(false);
      // Stage: validating briefly, then done. Gives "kalite kontrol" a quick beat.
      stageTimersRef.current.forEach((t) => clearTimeout(t));
      stageTimersRef.current = [];
      setGenStage("validating");
      const tDone = setTimeout(() => setGenStage("done"), 500);
      stageTimersRef.current.push(tDone);
      // Sidebar "Son üretimler" listesini lokal güncelle — router.refresh ile RSC re-fetch yerine
      // (re-fetch sırasında ekran flash + state kaybı yaşanıyordu).
      setRecentPromptsState((prev) => {
        const next = [data.recentEntry, ...prev.filter((p) => p.id !== data.recentEntry.id)];
        return next.slice(0, 3);
      });
    } catch (err) {
      if (err instanceof Error && err.name === "AbortError") return;
      const msg = err instanceof Error ? err.message : tErr("generationFailed");
      const friendly =
        msg === "GENERATION_FAILED" ? tErr("generationFailed")
        : msg === "GENERATION_TIMEOUT" ? tErr("timeout")
        : mapNetworkError(msg, msg);
      setError(friendly);
      setScreen("screen1");
      stageTimersRef.current.forEach((t) => clearTimeout(t));
      stageTimersRef.current = [];
      setGenStage("idle");
    } finally {
      setIsGenerating(false);
    }
  };

  // ── Screen 3 actions ──────────────────────────────────
  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(output);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      toast.success(tToast("copied"));
    } catch {
      toast.error(tErr("copyFailed"));
    }
  };

  const handleSaveFavorite = async () => {
    if (!lastPromptId) return;
    try {
      const result = await toggleFavorite(lastPromptId);
      setIsFavorited(result.isFavorited);
      toast.success(result.isFavorited ? tToast("favoriteAdded") : tToast("favoriteRemoved"));
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : tErr("saveFailed"));
    }
  };

  const handleNewPrompt = () => {
    abortRef.current?.abort();
    setScreen("screen1");
    setIntent("");
    setOutput("");
    setAssumptions([]);
    setValidationIssues([]);
    setScenario(null);
    setChipQuestions([]);
    setAmbiguityClarifications([]);
    setQuestionStep(0);
    setAnswers([]);
    setCustomAnswerOpen(false);
    setCustomAnswerText("");
    setCachedIntent(null);
    setLastPromptId(null);
    setIsFavorited(false);
    setError(null);
  };

  // ──────────────────────────────────────────────────────
  return (
    <div className={isDemo ? "grid grid-cols-1 gap-6" : "grid grid-cols-[1fr_300px] gap-6 max-xl:grid-cols-1"}>
      <div className="min-w-0 flex flex-col gap-4">
        {!isDemo && (
          <div>
            <h1 className="text-[26px] font-semibold tracking-[-0.025em]">{tS1("title")}</h1>
            <p className="text-sm text-text-muted mt-1">
              {tS1("subtitle")}
            </p>
          </div>
        )}

        {/* Email verification banner — yalnızca full mod, doğrulanmamış kullanıcı */}
        {needsEmailVerify && screen === "screen1" && (
          <EmailVerifyBanner email={userEmail} />
        )}

        {/* ═════ SCREEN 1 ═════ */}
        {screen === "screen1" && (
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-2 mb-4">
                <span className="font-mono text-[11px] text-primary">01</span>
                <span className="text-[13px] font-medium">{tS1("header")}</span>
              </div>

              {/* Modality picker */}
              <div className="mb-4" data-tour="modality-select">
                <label className="text-xs text-text-muted block mb-1.5">{tS1("modalityLabel")}</label>
                <ModalitySwitcher value={modality} onChange={setModality} />
              </div>

              {/* Target AI picker */}
              <div className="mb-4" data-tour="model-select">
                <label className="text-xs text-text-muted block mb-1.5">
                  {tS1("targetLabel")} <span className="text-text-faint">{tS1("targetHint")}</span>
                </label>
                <TargetPickerV2
                  byProvider={targetsByProvider}
                  popular={popularByModality[modality] ?? []}
                  selectedId={targetEngineId}
                  onChange={setTargetEngineId}
                />
              </div>

              {/* Intent textarea */}
              <label htmlFor="pe-intent-input" className="text-xs text-text-muted block mb-1.5">{tS1("intentLabel")}</label>
              <textarea
                id="pe-intent-input"
                data-tour="intent-input"
                aria-describedby="pe-intent-counter"
                maxLength={INTENT_MAX_LEN}
                className="w-full rounded-[var(--pe-r-md)] border border-border-strong bg-surface px-3.5 py-3 text-[15px] leading-[1.55] text-text placeholder:text-text-faint resize-y focus:outline-none focus:border-primary focus:ring-[3px] focus:ring-primary/20 transition-all"
                rows={4}
                value={intent}
                onChange={(e) => setIntent(e.target.value)}
                placeholder={t("inputPlaceholder")}
              />
              <div
                id="pe-intent-counter"
                aria-live="polite"
                className={cn(
                  "mt-1 text-xs text-right tabular-nums",
                  intent.length >= INTENT_MAX_LEN
                    ? "text-error"
                    : intent.length >= INTENT_MAX_LEN * 0.85
                      ? "text-warning"
                      : "text-text-faint",
                )}
              >
                {intent.length} / {INTENT_MAX_LEN}
              </div>

              {error && (
                <div className="mt-4 rounded-md border border-error/30 bg-error/5 px-4 py-2.5 text-sm text-error">
                  {error}
                </div>
              )}

              <div className="flex flex-wrap items-center justify-between gap-3 mt-5 pt-5 border-t border-border">
                {isDemo ? (
                  <p className="flex items-center gap-1.5 text-sm text-text-muted">
                    <Info className="h-3.5 w-3.5 shrink-0" />
                    {isAuthenticated
                      ? tUi("ctaContinueHint")
                      : tUi("signupHint")}
                  </p>
                ) : (
                  <p className="flex items-center gap-1.5 text-sm text-text-muted">
                    <Info className="h-3.5 w-3.5 shrink-0" />
                    Free · runs on your own AI key
                  </p>
                )}
                <Button
                  data-tour="generate-button"
                  onClick={handleContinue}
                  disabled={
                    isAnalyzing ||
                    intent.trim().length < INTENT_MIN_LEN ||
                    intent.length > INTENT_MAX_LEN ||
                    needsEmailVerify
                  }
                  title={needsEmailVerify ? tUi("verifyEmailFirst") : undefined}
                >
                  {isAnalyzing ? tS1("analyzingCta") : tS1("continueCta")}
                  {!isAnalyzing && <ArrowRight className="h-4 w-4" />}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* ═════ SCREEN 2 — Senaryo B (chip soruları) ═════ */}
        {screen === "screen2" && scenario === "B" && chipQuestions.length > 0 && (
          <Card className="animate-fade-up border-primary">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-[11px] text-primary">02</span>
                  <span className="text-[13px] font-medium">{tS2("quickQuestions")}</span>
                </div>
                <Badge>{questionStep + 1} / {chipQuestions.length}</Badge>
              </div>

              <div className="flex gap-1 mb-5">
                {chipQuestions.map((_, i) => (
                  <div
                    key={i}
                    className="flex-1 h-[3px] rounded-full transition-colors"
                    style={{ background: i <= questionStep ? "var(--pe-primary)" : "var(--pe-border-strong)" }}
                  />
                ))}
              </div>

              <p className="text-[17px] font-medium mb-4">{chipQuestions[questionStep].label}</p>

              <div className="flex flex-col gap-2">
                {chipQuestions[questionStep].options.map((opt, i) => (
                  <button
                    key={i}
                    onClick={() => answerChip(opt)}
                    disabled={isGenerating || customAnswerOpen}
                    className={cn(
                      "text-left px-3.5 py-3 rounded-[var(--pe-r-md)] border text-sm text-text transition-all",
                      opt === SKIP_OPTION
                        ? "border-dashed border-border-strong bg-transparent hover:border-primary hover:bg-primary-soft text-text-muted hover:text-text"
                        : "border-border-strong bg-surface hover:border-primary hover:bg-primary-soft",
                    )}
                  >
                    {opt}
                  </button>
                ))}

                {!customAnswerOpen ? (
                  <button
                    onClick={() => setCustomAnswerOpen(true)}
                    disabled={isGenerating}
                    className="text-left px-3.5 py-3 rounded-[var(--pe-r-md)] border border-dashed border-border-strong bg-transparent text-sm text-text-muted hover:text-text hover:border-primary hover:bg-primary-soft transition-all"
                  >
                    {tS2("customAnswerCta")}
                  </button>
                ) : (
                  <div className="flex flex-col gap-2 p-3 border border-primary rounded-[var(--pe-r-md)] bg-primary-soft/30">
                    <textarea
                      value={customAnswerText}
                      onChange={(e) => setCustomAnswerText(e.target.value)}
                      maxLength={1000}
                      rows={3}
                      placeholder={tUi("answerPlaceholder")}
                      className="w-full px-3 py-2 rounded-[var(--pe-r-sm)] border border-border-strong bg-surface text-sm text-text resize-y focus:outline-none focus:border-primary"
                      autoFocus
                      disabled={isGenerating}
                    />
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[11px] text-text-muted">{customAnswerText.length}/1000</span>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setCustomAnswerOpen(false);
                            setCustomAnswerText("");
                          }}
                          disabled={isGenerating}
                        >
                          {tS2("cancelCta")}
                        </Button>
                        <Button
                          size="sm"
                          onClick={() => {
                            const ans = customAnswerText.trim();
                            if (ans.length === 0) return;
                            void answerChip(ans);
                          }}
                          disabled={isGenerating || customAnswerText.trim().length === 0}
                        >
                          {tS2("continueCta")}
                          <ArrowRight className="w-4 h-4 ml-1" />
                        </Button>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <div className="flex items-center justify-between mt-4 gap-2">
                <Button variant="ghost" size="sm" onClick={handleBack} disabled={isGenerating}>
                  <ArrowLeft className="w-4 h-4 mr-1" />
                  {tS2("backCta")}
                </Button>
                <Button variant="ghost" size="sm" onClick={handleSkipAll} disabled={isGenerating}>
                  {tS2("skipAllCta")}
                </Button>
              </div>

              {/* 2026-05-12 confabulation fix — Plan §1. Düşük güven onay paneli. */}
              {lowConfidenceConfirmOpen && (
                <div className="mt-4 rounded-md border border-warning/40 bg-warning/5 p-4 text-sm">
                  <p className="font-medium text-text mb-2">
                    {tS2("lowConfidenceTitle")}
                  </p>
                  <p className="text-text-muted mb-3">
                    {tS2("lowConfidenceBody")}
                  </p>
                  <div className="flex items-center justify-end gap-2">
                    <Button variant="ghost" size="sm" onClick={cancelLowConfidence} disabled={isGenerating}>
                      {tS2("backCta")}
                    </Button>
                    <Button size="sm" onClick={confirmLowConfidenceAndRun} disabled={isGenerating}>
                      {tS2("lowConfidenceProceedCta")}
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* ═════ SCREEN 2 — Senaryo C (ambiguity) ═════ */}
        {screen === "screen2" && scenario === "C" && ambiguityClarifications.length > 0 && (
          <Card className="animate-fade-up border-primary">
            <CardContent className="p-6">
              <div className="flex items-center gap-2 mb-4">
                <span className="font-mono text-[11px] text-primary">02</span>
                <span className="text-[13px] font-medium">{tS2("didYouMean")}</span>
              </div>
              <div className="flex flex-col gap-2">
                {ambiguityClarifications.map((c, i) => (
                  <button
                    key={i}
                    onClick={() => pickClarification(c)}
                    disabled={isGenerating}
                    className="text-left px-3.5 py-3 rounded-[var(--pe-r-md)] border border-border-strong bg-surface text-sm text-text transition-all hover:border-primary hover:bg-primary-soft"
                  >
                    {c}
                  </button>
                ))}
                <button
                  onClick={handleEditIntent}
                  disabled={isGenerating}
                  className="text-left px-3.5 py-3 rounded-[var(--pe-r-md)] border border-dashed border-border-strong bg-transparent text-sm text-text-muted transition-all hover:border-primary hover:text-text"
                >
                  {tS2("noneOfThese")}
                </button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* ═════ SCREEN 3 — Sonuç (iterasyon yok; her üretim ayrı kredi) ═════ */}
        {screen === "screen3" && (
          <Card className="animate-fade-up" data-tour="result-panel">
            <CardContent className="p-6">
              <div className="flex items-center gap-2 mb-4">
                <span className="font-mono text-[11px] text-primary">03</span>
                <span className="text-[13px] font-medium">
                  {isGenerating ? tUi("generating") : tUi("ready")}
                </span>
              </div>

              {isGenerating && !output ? (
                <GenerationProgress
                  stage={genStage}
                  modality={modality}
                  targetName={targetEngines.find((t) => t.id === targetEngineId)?.name ?? null}
                />
              ) : (
                <>
                  <pre className="rounded-[var(--pe-r-md)] border border-border bg-surface-2 p-4 font-mono text-sm leading-relaxed text-text whitespace-pre-wrap">
                    {output}
                    {isGenerating && (
                      <span className="inline-block w-px h-[1.1em] bg-current ml-px align-[-0.1em] animate-[blink_1s_step-end_infinite]" />
                    )}
                  </pre>

                  {validationIssues.length > 0 && (
                    <div className="mt-3 rounded-md border border-warning/30 bg-warning/5 px-4 py-2.5 text-xs text-text-muted">
                      <p className="font-medium text-text mb-1">{tS3("attentionTitle")}</p>
                      <ul className="list-disc list-inside space-y-0.5">
                        {validationIssues.map((iss, i) => <li key={i}>{iss}</li>)}
                      </ul>
                    </div>
                  )}

                  {assumptions.length > 0 && (
                    <div className="mt-3 rounded-md border border-border bg-surface-2 px-4 py-3">
                      <p className="text-xs font-medium text-text-muted mb-2">
                        <Info className="inline h-3 w-3 mr-1" />
                        {tS3("assumptionsLabel")}
                      </p>
                      <ul className="text-xs text-text-muted space-y-1">
                        {assumptions.map((a, i) => (
                          <li key={i}><span className="text-text">{a.label_tr}:</span> {a.value}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  <div className="flex flex-wrap gap-2 mt-4">
                    <Button size="sm" onClick={handleCopy} disabled={!output}>
                      {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                      {copied ? tS3("copiedCta") : tS3("copyCta")}
                    </Button>
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={handleSaveFavorite}
                      disabled={!lastPromptId}
                    >
                      {isFavorited ? <Check className="h-3.5 w-3.5" /> : <Bookmark className="h-3.5 w-3.5" />}
                      {isFavorited ? tS3("savedCta") : tS3("favoriteCta")}
                    </Button>
                    <Button size="sm" className="ml-auto" onClick={handleNewPrompt}>
                      <Sparkles className="h-3.5 w-3.5" />
                      {tS3("newPromptCta")}
                    </Button>
                  </div>
                </>
              )}

              {error && (
                <div className="mt-4 rounded-md border border-error/30 bg-error/5 px-4 py-2.5 text-sm text-error">
                  {error}
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>

      {/* ── Sidebar (full mode only) ── */}
      {!isDemo && (
      <aside className="flex flex-col gap-3 max-xl:hidden sticky top-20 self-start">

        <Card>
          <CardContent className="p-4">
            <p className="text-[11px] font-medium uppercase tracking-widest text-text-muted mb-3">
              {tSide("recentGenerations")}
            </p>
            {recentPromptsState.length === 0 ? (
              <p className="text-xs text-text-faint py-2">{tSide("noPrompts")}</p>
            ) : (
              <div className="flex flex-col">
                {recentPromptsState.map((r, i) => {
                  const Icon = MODALITY_ICONS[r.mod] ?? Sparkles;
                  return (
                    <button
                      key={r.id}
                      type="button"
                      onClick={() => {
                        setIntent(r.userInput);
                        handleNewPrompt();
                        setIntent(r.userInput);
                      }}
                      className={cn(
                        "flex items-center gap-2.5 py-2.5 -mx-1 px-1 rounded-md hover:bg-surface-2 transition-colors text-left w-full",
                        i > 0 && "border-t border-border",
                      )}
                    >
                      <div className="w-7 h-7 rounded-lg bg-surface-2 text-text-muted inline-flex items-center justify-center shrink-0">
                        <Icon className="h-3.5 w-3.5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[13px] font-medium truncate">{r.title}</p>
                        <p className="text-[11px] text-text-faint">{r.date}</p>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="bg-surface-2 border-dashed">
          <CardContent className="p-4">
            <p className="text-[12px] font-semibold flex items-center gap-1 mb-1.5">
              <Info className="h-3.5 w-3.5" /> {tSide("howItWorks")}
            </p>
            <p className="text-[12.5px] text-text-muted leading-[1.55]">
              {tSide.rich("howItWorksBody", {
                strong: (chunks) => <strong className="text-text">{chunks}</strong>,
              })}
            </p>
          </CardContent>
        </Card>
      </aside>
      )}

    </div>
  );
}

