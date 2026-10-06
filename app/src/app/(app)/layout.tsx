import type { Metadata } from "next";
import { auth } from "@/lib/auth";
import { db } from "@/db/client";
import { getLocale } from "next-intl/server";
import { TourMount } from "./_components/tour-mount";
import { ConsentUpdateModal } from "@/components/feature/legal/consent-update-modal";
import enMessages from "../../../messages/en.json";
import trMessages from "../../../messages/tr.json";
import type { SupportedLocale } from "@/components/onboarding-tour/use-browser-locale";

// Authenticated app surfaces are not for search engines. Child pages may set
// their own title/description; robots flags are inherited from this layout.
export const metadata: Metadata = {
  robots: { index: false, follow: false, googleBot: { index: false, follow: false } },
};

// NextIntlClientProvider is now hosted by the ROOT layout (src/app/layout.tsx)
// so this layout no longer wraps children with one. We still pre-load both
// locale message bundles for the onboarding tour because TourProvider has its
// own messages contract independent of next-intl.
const TOUR_MESSAGES = { tr: trMessages, en: enMessages } as const;

export default async function AppGroupLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session?.user?.id) {
    return <>{children}</>;
  }

  const user = await db.user.findUnique({
    where: { id: session.user.id },
    select: {
      onboardingCompletedAt: true,
      onboardingStepIndex: true,
      // Plan 2026-05-08 step 3 — surface NULL consent timestamps so legacy
      // accounts get the consent-update-modal until they accept.
      termsConsentAt: true,
      kvkkConsentAt: true,
    },
  });

  const shouldLoadTour = !user?.onboardingCompletedAt;
  const needsConsentUpdate = !user?.termsConsentAt || !user?.kvkkConsentAt;
  const locale = (await getLocale()) as SupportedLocale;

  if (shouldLoadTour) {
    return (
      <TourMount
        initialStepIndex={user?.onboardingStepIndex ?? 0}
        userLocale={locale}
        messages={TOUR_MESSAGES}
      >
        {children}
        {needsConsentUpdate && <ConsentUpdateModal />}
      </TourMount>
    );
  }

  return (
    <>
      {children}
      {needsConsentUpdate && <ConsentUpdateModal />}
    </>
  );
}
