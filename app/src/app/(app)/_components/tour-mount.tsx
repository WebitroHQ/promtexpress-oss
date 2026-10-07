"use client";

import dynamic from "next/dynamic";
import * as React from "react";
import type { SupportedLocale } from "@/components/onboarding-tour/use-browser-locale";

const TourProvider = dynamic(
  () => import("@/components/onboarding-tour").then((m) => m.TourProvider),
  { ssr: false },
);

interface Props {
  initialStepIndex: number;
  /** User-selected locale (from User.locale, narrowed to supported set). Tour follows site locale. */
  userLocale: SupportedLocale;
  messages: { en: Record<string, unknown> };
  children: React.ReactNode;
}

export function TourMount({ initialStepIndex, userLocale, messages, children }: Props) {
  return (
    <TourProvider
      initialStepIndex={initialStepIndex}
      userLocale={userLocale}
      autoStart
      messages={messages}
    >
      {children}
    </TourProvider>
  );
}
