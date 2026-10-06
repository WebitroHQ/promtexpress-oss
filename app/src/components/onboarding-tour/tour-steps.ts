import type { TourStep } from "./types";

export const TOUR_STEPS: TourStep[] = [
  {
    id: "welcome",
    selector: null,
    i18nKey: "welcome",
    placement: "center",
    routeTo: "/dashboard",
  },
  {
    id: "navGenerator",
    selector: '[data-tour="nav-generator"]',
    i18nKey: "steps.navGenerator",
    placement: "right",
    routeTo: "/generator",
  },
  {
    id: "intentInput",
    selector: '[data-tour="intent-input"]',
    i18nKey: "steps.intentInput",
    placement: "bottom",
    routeTo: "/generator",
  },
  {
    id: "modelSelect",
    selector: '[data-tour="model-select"]',
    i18nKey: "steps.modelSelect",
    placement: "bottom",
    routeTo: "/generator",
  },
  {
    id: "modalitySelect",
    selector: '[data-tour="modality-select"]',
    i18nKey: "steps.modalitySelect",
    placement: "bottom",
    routeTo: "/generator",
  },
  {
    id: "generateButton",
    selector: '[data-tour="generate-button"]',
    i18nKey: "steps.generateButton",
    placement: "top",
    routeTo: "/generator",
  },
  {
    id: "resultPanel",
    selector: '[data-tour="result-panel"]',
    i18nKey: "steps.resultPanel",
    placement: "top",
  },
  {
    id: "historyFavs",
    selector: '[data-tour="nav-history"]',
    i18nKey: "steps.historyFavs",
    placement: "right",
    routeTo: "/history",
  },
];
