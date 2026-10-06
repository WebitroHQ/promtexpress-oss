import type { HelpContent } from "@/components/feature/admin/help-dialog-button";
import { HELP_TR } from "./tr";
import { HELP_EN } from "./en";

export type AdminHelpKey =
  | "dashboard"
  | "users"
  | "plans"
  | "agent-roles"
  | "constitution"
  | "personas"
  | "antipatterns"
  | "training-resources"
  | "training-distillations"
  | "traces"
  | "templates"
  | "engines"
  | "mapping"
  | "target-engines"
  | "questions"
  | "taxonomy"
  | "library-list"
  | "library-detail"
  | "library-import"
  | "library-settings"
  | "embedding-engines"
  | "blog"
  | "i18n"
  | "emails"
  | "analytics"
  | "abuse"
  | "api"
  | "system-settings"
  | "audit";

export interface HelpUiStrings {
  triggerLabel: string;
}

const UI: Record<string, HelpUiStrings> = {
  en: { triggerLabel: "Help" },
  tr: { triggerLabel: "Açıklama" },
  de: { triggerLabel: "Hilfe" },
  fr: { triggerLabel: "Aide" },
  es: { triggerLabel: "Ayuda" },
  pt: { triggerLabel: "Ajuda" },
  it: { triggerLabel: "Aiuto" },
  nl: { triggerLabel: "Help" },
  pl: { triggerLabel: "Pomoc" },
  ro: { triggerLabel: "Ajutor" },
  cs: { triggerLabel: "Nápověda" },
  hu: { triggerLabel: "Súgó" },
  sv: { triggerLabel: "Hjälp" },
  no: { triggerLabel: "Hjelp" },
  da: { triggerLabel: "Hjælp" },
  fi: { triggerLabel: "Ohje" },
  uk: { triggerLabel: "Довідка" },
  ru: { triggerLabel: "Справка" },
  ar: { triggerLabel: "مساعدة" },
  ja: { triggerLabel: "ヘルプ" },
  zh: { triggerLabel: "帮助" },
};

const REGISTRIES: Record<string, Partial<Record<AdminHelpKey, HelpContent>>> = {
  tr: HELP_TR,
  en: HELP_EN,
};

export function getAdminHelp(
  key: AdminHelpKey,
  locale: string | null | undefined,
): { content: HelpContent; ui: HelpUiStrings } | null {
  const loc = (locale ?? "en").toLowerCase();
  const reg = REGISTRIES[loc] ?? REGISTRIES.en;
  const content = reg[key] ?? REGISTRIES.en[key];
  if (!content) return null;
  return {
    content,
    ui: UI[loc] ?? UI.en,
  };
}
