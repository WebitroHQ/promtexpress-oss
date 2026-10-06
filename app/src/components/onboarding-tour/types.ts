export type StepPlacement = "top" | "bottom" | "left" | "right" | "center";

export interface TourStep {
  id: string;
  /** CSS selector for the highlighted element. `null` => centered modal (no spotlight). */
  selector: string | null;
  /** i18n key path under "Onboarding.steps". */
  i18nKey: string;
  placement?: StepPlacement;
  /** Auto-navigate to this route when the step starts (if not already there). */
  routeTo?: string;
  /** Wait until this predicate becomes true before allowing NEXT (e.g. wait for generation result). */
  waitFor?: () => boolean;
  /** If true, NEXT is hidden — user must perform an action (e.g. click target). */
  awaitUserAction?: boolean;
}

export interface TourState {
  status: "idle" | "running" | "paused" | "completed" | "skipped";
  index: number;
  total: number;
}
