"use client";

import * as React from "react";
import { createPortal } from "react-dom";
import { LanguageSwitcher } from "@/components/feature/layout/language-switcher";

interface Props {
  currentLocale: string;
}

// Mounts the LanguageSwitcher into the static-HTML nav slot
// (#lv3-lang-slot) inside landing-html.ts. The landing nav is rendered
// via dangerouslySetInnerHTML, so React does not manage that DOM —
// we use a portal so the switcher visually lives next to the theme
// toggle while staying a real React component.
export function LandingLangMount({ currentLocale }: Props) {
  const [targets, setTargets] = React.useState<HTMLElement[]>([]);

  React.useEffect(() => {
    const found = ["lv3-lang-slot", "lv3-lang-slot-mobile"]
      .map((id) => document.getElementById(id))
      .filter((el): el is HTMLElement => el !== null);
    setTargets(found);
  }, []);

  if (targets.length === 0) return null;
  return (
    <>
      {targets.map((el, i) => (
        <React.Fragment key={i}>
          {createPortal(<LanguageSwitcher currentLocale={currentLocale} />, el)}
        </React.Fragment>
      ))}
    </>
  );
}
