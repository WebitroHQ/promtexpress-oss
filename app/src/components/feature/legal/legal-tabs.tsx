"use client";

import * as React from "react";
import { useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import {
  TERMS_SECTIONS,
  PRIVACY_SECTIONS,
  COOKIE_SECTIONS,
  KVKK_SECTIONS,
  type Section,
} from "./legal-content";

const TAB_IDS = ["terms", "privacy", "cookie", "kvkk"] as const;

type TabId = (typeof TAB_IDS)[number];

const CONTENTS: Record<TabId, Section[]> = {
  terms: TERMS_SECTIONS,
  privacy: PRIVACY_SECTIONS,
  cookie: COOKIE_SECTIONS,
  kvkk: KVKK_SECTIONS,
};

export function LegalTabs() {
  const tLegal = useTranslations("legal");
  const TABS = React.useMemo(
    () => [
      { id: "terms" as const, label: "Terms of Service" },
      { id: "privacy" as const, label: "Privacy Policy" },
      { id: "cookie" as const, label: "Cookie Policy" },
      { id: "kvkk" as const, label: tLegal("kvkkTabLabel") },
    ],
    [tLegal],
  );
  const searchParams = useSearchParams();
  const initialTab = (searchParams.get("tab") as TabId) ?? "terms";
  const [tab, setTab] = React.useState<TabId>(
    TAB_IDS.includes(initialTab as TabId) ? initialTab : "terms"
  );

  const sections = CONTENTS[tab];

  return (
    <div>
      {/* Tab bar */}
      <div className="flex gap-1 border-b border-border mb-10 overflow-x-auto">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors whitespace-nowrap ${
              tab === t.id
                ? "border-primary text-primary"
                : "border-transparent text-text-muted hover:text-text"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[220px_1fr] gap-12">
        {/* TOC */}
        <aside className="hidden lg:block sticky top-24 self-start">
          <p className="text-[11px] font-semibold uppercase tracking-[0.06em] text-text-faint mb-3">
            On this page
          </p>
          <nav>
            {sections.map((s, i) => (
              <a
                key={s.id}
                href={`#${s.id}`}
                className={`block py-1.5 pl-3 text-sm border-l-2 transition-colors ${
                  i === 0
                    ? "border-primary text-primary"
                    : "border-border text-text-muted hover:text-text"
                }`}
              >
                {s.title}
              </a>
            ))}
          </nav>
        </aside>

        {/* Content */}
        <div className="max-w-[760px] text-[15px] leading-[1.75] text-text-muted">
          {sections.map((s) => (
            <section key={s.id} id={s.id} className="mb-9 scroll-mt-24">
              <h2 className="text-[22px] font-semibold text-text mb-2.5">{s.title}</h2>
              {s.body}
            </section>
          ))}
        </div>
      </div>
    </div>
  );
}
