"use server";

/**
 * Consent acceptance for legacy users created before plan 2026-05-08.
 *
 * Story:
 *   - Step 3 of plan 2026-05-08-uye-kabul-tam-onarim-plani.md introduced
 *     `User.termsConsentAt` + `User.kvkkConsentAt`. New signups capture both
 *     timestamps inline (signup.ts). Existing users have NULL columns.
 *   - This action is invoked from src/components/feature/legal/consent-update-modal.tsx
 *     after the legacy user explicitly checks both boxes. The modal is
 *     non-bypassable and rendered by the (app) layout when either column is
 *     null on the session user.
 *
 * The action is intentionally small: read session, set both timestamps to
 * now, return ok. No body parameters — checking the boxes in the UI is the
 * consent; submission == acceptance.
 */

import { auth } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { db } from "@/db/client";

export type AcceptConsentResult =
  | { ok: true }
  | { ok: false; error: string };

export async function acceptUpdatedConsent(): Promise<AcceptConsentResult> {
  const session = await auth();
  if (!session?.user?.id) {
    return { ok: false, error: "Not signed in" };
  }
  const now = new Date();
  await db.user.update({
    where: { id: session.user.id },
    data: {
      termsConsentAt: now,
      kvkkConsentAt: now,
    },
  });
  // Layout reads consent state from DB on every render; revalidate so the
  // modal disappears immediately on the next navigation/refresh.
  revalidatePath("/", "layout");
  return { ok: true };
}
