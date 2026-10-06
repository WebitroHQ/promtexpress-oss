"use client";

/**
 * Plan 2026-05-08 step 3 — legacy-user consent capture modal.
 *
 * Mounted by src/app/(app)/layout.tsx when the signed-in user has either
 * `termsConsentAt` or `kvkkConsentAt` NULL (i.e. the row predates the
 * 2026-05-08 schema migration). The modal is non-dismissable: the only path
 * out is to tick both boxes and click "Confirm acceptance".
 *
 * UX rules:
 *   - The (app) shell remains rendered behind the dialog so the user is not
 *     forcibly logged out — they simply cannot interact with the app until
 *     consent is captured. This matches plan rule 4 (zero downtime — no
 *     functionality is removed for legacy accounts, only gated).
 *   - All copy is English (plan rule 1).
 */

import * as React from "react";
import { Link } from "@/i18n/navigation";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { acceptUpdatedConsent } from "@/server/actions/consent";

export function ConsentUpdateModal() {
  const [open] = React.useState(true);
  const [terms, setTerms] = React.useState(false);
  const [kvkk, setKvkk] = React.useState(false);
  const [submitting, setSubmitting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const handleConfirm = async () => {
    if (!terms || !kvkk) return;
    setSubmitting(true);
    setError(null);
    try {
      const result = await acceptUpdatedConsent();
      if (!result.ok) {
        setError(result.error);
        return;
      }
      // Layout will re-render without the modal after revalidation.
      window.location.reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save consent");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open}>
      <DialogContent
        hideClose
        className="max-w-md"
        // Block escape & overlay click from dismissing.
        onEscapeKeyDown={(e) => e.preventDefault()}
        onPointerDownOutside={(e) => e.preventDefault()}
        onInteractOutside={(e) => e.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle>Updated terms — please review</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 text-sm text-text-muted">
          <p>
            Our Terms of Service and KVKK personal-data notice were updated on
            2026-05-08. To continue using PromtExpress we need your explicit
            acceptance of the new versions.
          </p>

          <label className="flex items-start gap-2 cursor-pointer">
            <input
              type="checkbox"
              className="mt-0.5 accent-primary"
              checked={terms}
              onChange={(e) => setTerms(e.target.checked)}
            />
            <span className="text-text">
              I agree to the{" "}
              <Link href="/legal" target="_blank" className="text-primary hover:underline">
                Terms of Service
              </Link>{" "}
              and{" "}
              <Link
                href="/legal?tab=privacy"
                target="_blank"
                className="text-primary hover:underline"
              >
                Privacy Policy
              </Link>
              .
            </span>
          </label>

          <label className="flex items-start gap-2 cursor-pointer">
            <input
              type="checkbox"
              className="mt-0.5 accent-primary"
              checked={kvkk}
              onChange={(e) => setKvkk(e.target.checked)}
            />
            <span className="text-text">
              I explicitly consent to the processing of my personal data as described
              in the{" "}
              <Link
                href="/legal?tab=kvkk"
                target="_blank"
                className="text-primary hover:underline"
              >
                KVKK Notice
              </Link>{" "}
              (KVKK Art. 5).
            </span>
          </label>

          {error && (
            <div className="rounded-md border border-error/30 bg-error/5 px-3 py-2 text-sm text-error">
              {error}
            </div>
          )}

          <div className="flex justify-end pt-2">
            <Button onClick={handleConfirm} disabled={submitting || !terms || !kvkk}>
              {submitting ? "Saving…" : "Confirm acceptance"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
