"use client";

import * as React from "react";
import { useRouter, usePathname } from "next/navigation";
import { AnimatePresence, motion } from "motion/react";
import { NextIntlClientProvider, useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { TOUR_STEPS } from "./tour-steps";
import { useSpotlight } from "./use-spotlight";
import { TourOverlay } from "./tour-overlay";
import { TourPopover } from "./tour-popover";
import { TourProgress } from "./tour-progress";
import { fireConfetti } from "./tour-confetti";
import { useBrowserLocale, type SupportedLocale } from "./use-browser-locale";
import type { TourState } from "./types";

interface Ctx {
  state: TourState;
  start: () => void;
  next: () => void;
  back: () => void;
  skip: () => void;
  finish: () => void;
}

const TourCtx = React.createContext<Ctx | null>(null);

export function useTour(): Ctx {
  const v = React.useContext(TourCtx);
  if (!v) throw new Error("useTour must be used within TourProvider");
  return v;
}

interface ProviderProps {
  initialStepIndex: number;
  autoStart: boolean;
  messages: Record<SupportedLocale, Record<string, unknown>>;
  children: React.ReactNode;
}

async function postJson(url: string, body?: unknown) {
  try {
    await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: body ? JSON.stringify(body) : undefined,
    });
  } catch {
    // best-effort
  }
}

function useReducedMotionPref(): boolean {
  const [r, setR] = React.useState(false);
  React.useEffect(() => {
    const m = window.matchMedia("(prefers-reduced-motion: reduce)");
    setR(m.matches);
    const onChange = () => setR(m.matches);
    m.addEventListener?.("change", onChange);
    return () => m.removeEventListener?.("change", onChange);
  }, []);
  return r;
}

export function TourProvider({ initialStepIndex, autoStart, messages, children }: ProviderProps) {
  const browserLocale = useBrowserLocale();
  const activeMessages = messages[browserLocale] ?? messages.en;

  return (
    <TourCore
      initialStepIndex={initialStepIndex}
      autoStart={autoStart}
      browserLocale={browserLocale}
      tourMessages={activeMessages}
    >
      {children}
    </TourCore>
  );
}

function TourCore({
  initialStepIndex,
  autoStart,
  browserLocale,
  tourMessages,
  children,
}: {
  initialStepIndex: number;
  autoStart: boolean;
  browserLocale: SupportedLocale;
  tourMessages: Record<string, unknown>;
  children: React.ReactNode;
}) {
  const total = TOUR_STEPS.length;
  const startIndex = Math.min(initialStepIndex, total - 1);

  const [state, setState] = React.useState<TourState>({
    status: autoStart ? "running" : "idle",
    index: Math.max(0, startIndex),
    total,
  });

  const reducedMotion = useReducedMotionPref();
  const step = TOUR_STEPS[state.index];
  const router = useRouter();
  const pathname = usePathname();
  const { bbox, el } = useSpotlight(state.status === "running" ? step?.selector ?? null : null);

  // Persist progress on each index change while running
  React.useEffect(() => {
    if (state.status === "running") {
      postJson("/api/onboarding/progress", { stepIndex: state.index });
    }
  }, [state.index, state.status]);

  // Auto-navigate to step.routeTo when stepping changes (mobile-friendly: no need to tap a hidden sidebar link)
  React.useEffect(() => {
    if (state.status !== "running") return;
    const target = step?.routeTo;
    if (target && pathname !== target) {
      router.push(target);
    }
  }, [state.index, state.status, step?.routeTo, pathname, router]);

  const start = React.useCallback(() => {
    setState((s) => ({ ...s, status: "running", index: Math.max(0, Math.min(s.index, total - 1)) }));
  }, [total]);

  const back = React.useCallback(() => {
    setState((s) => ({ ...s, index: Math.max(0, s.index - 1) }));
  }, []);

  const next = React.useCallback(() => {
    setState((s) => {
      if (s.index >= total - 1) {
        // Final → completed
        postJson("/api/onboarding/complete");
        fireConfetti();
        return { ...s, status: "completed" };
      }
      return { ...s, index: s.index + 1 };
    });
  }, [total]);

  const skip = React.useCallback(() => {
    // Persist current index but do NOT mark completed → next login resumes here.
    setState((s) => ({ ...s, status: "skipped" }));
  }, []);

  const finish = React.useCallback(() => {
    postJson("/api/onboarding/complete");
    setState((s) => ({ ...s, status: "completed" }));
  }, []);

  // Keyboard handlers
  React.useEffect(() => {
    if (state.status !== "running") return;
    function onKey(e: KeyboardEvent) {
      const tag = (e.target as HTMLElement | null)?.tagName?.toLowerCase();
      if (tag === "input" || tag === "textarea") return;
      if (e.key === "Escape") skip();
      else if (e.key === "ArrowRight") next();
      else if (e.key === "ArrowLeft") back();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [state.status, next, back, skip]);

  const ctxValue = React.useMemo(
    () => ({ state, start, next, back, skip, finish }),
    [state, start, next, back, skip, finish],
  );

  return (
    <TourCtx.Provider value={ctxValue}>
      {children}
      <AnimatePresence>
        {state.status === "running" && step && (
          <NextIntlClientProvider locale={browserLocale} messages={tourMessages as never}>
            <TourLayer
              key={step.id}
              step={step}
              anchorEl={el}
              bbox={bbox}
              index={state.index}
              total={total}
              reducedMotion={reducedMotion}
              onNext={next}
              onBack={back}
              onSkip={skip}
              onFinish={finish}
            />
          </NextIntlClientProvider>
        )}
      </AnimatePresence>
    </TourCtx.Provider>
  );
}

function TourLayer({
  step,
  anchorEl,
  bbox,
  index,
  total,
  reducedMotion,
  onNext,
  onBack,
  onSkip,
  onFinish,
}: {
  step: (typeof TOUR_STEPS)[number];
  anchorEl: HTMLElement | null;
  bbox: ReturnType<typeof useSpotlight>["bbox"];
  index: number;
  total: number;
  reducedMotion: boolean;
  onNext: () => void;
  onBack: () => void;
  onSkip: () => void;
  onFinish: () => void;
}) {
  const t = useTranslations("Onboarding");
  const isWelcome = step.id === "welcome";
  const isLast = index === total - 1;

  const title = isWelcome ? t("welcome.title") : t(`${step.i18nKey}.title`);
  const desc = isWelcome ? t("welcome.desc") : t(`${step.i18nKey}.desc`);

  return (
    <>
      <TourOverlay bbox={isWelcome ? null : bbox} reducedMotion={reducedMotion} />
      {!isWelcome && bbox && !reducedMotion && (
        <motion.div
          className="fixed pointer-events-none z-[41] rounded-[12px]"
          style={{
            left: bbox.x - 8,
            top: bbox.y - 8,
            width: bbox.w + 16,
            height: bbox.h + 16,
          }}
          animate={{
            boxShadow: [
              "0 0 0 0 color-mix(in srgb, var(--pe-primary) 55%, transparent)",
              "0 0 0 14px color-mix(in srgb, var(--pe-primary) 0%, transparent)",
            ],
          }}
          transition={{ duration: 1.6, repeat: Infinity, ease: "easeOut" }}
        />
      )}
      <TourPopover
        anchorEl={isWelcome ? null : anchorEl}
        placement={step.placement ?? "bottom"}
        reducedMotion={reducedMotion}
      >
        <div className="space-y-4">
          <div>
            <h3 className="text-[15px] font-semibold tracking-tight text-text">{title}</h3>
            <p className="mt-1.5 text-[13px] leading-relaxed text-text-muted">{desc}</p>
          </div>

          <TourProgress index={index} total={total} />

          <div className="flex items-center justify-between gap-2 pt-1">
            {isWelcome ? (
              <>
                <button
                  onClick={onSkip}
                  className="text-[12px] text-text-faint hover:text-text-muted transition-colors"
                >
                  {t("welcome.skip")}
                </button>
                <Button onClick={onNext} size="sm">
                  {t("welcome.start")}
                </Button>
              </>
            ) : (
              <>
                <button
                  onClick={onSkip}
                  className="text-[12px] text-text-faint hover:text-text-muted transition-colors"
                >
                  {t("controls.skip")}
                </button>
                <div className="flex items-center gap-2">
                  {index > 0 && (
                    <Button onClick={onBack} variant="secondary" size="sm">
                      {t("controls.back")}
                    </Button>
                  )}
                  <Button onClick={isLast ? onFinish : onNext} size="sm">
                    {isLast ? t("controls.finish") : t("controls.next")}
                  </Button>
                </div>
              </>
            )}
          </div>
        </div>
      </TourPopover>
    </>
  );
}
