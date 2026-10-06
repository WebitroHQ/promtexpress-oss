export const dynamic = "force-dynamic";

import { Suspense } from "react";
import { TopNav } from "@/components/feature/layout/top-nav";
import { LegalTabs } from "@/components/feature/legal/legal-tabs";
import { buildMetadata } from "@/lib/seo/metadata";
import { buildCanonical } from "@/lib/seo/hreflang";
import { JsonLd } from "@/components/seo/json-ld";
import { breadcrumbSchema } from "@/lib/seo/schemas";

const _legalMeta = buildMetadata({
  pathname: "/legal",
  title: "Legal",
  description:
    "Legal information for PromtExpress — Terms of Service, Privacy Policy, Refund Policy, and Cookie Policy.",
});

// SEM-1: /legal is a near-verbatim duplicate of /terms. Consolidate indexing to
// /terms by overriding the canonical (kept everything else, incl. hreflang
// languages map). Visible legal copy is intentionally unchanged.
export const metadata = {
  ..._legalMeta,
  alternates: { ..._legalMeta.alternates, canonical: buildCanonical("/terms") },
};

const LEGAL_BREADCRUMBS = breadcrumbSchema([
  { name: "Home", url: "/" },
  { name: "Legal", url: "/legal" },
]);

export default function LegalPage() {
  return (
    <div>
      <JsonLd data={LEGAL_BREADCRUMBS} />
      <TopNav />
      <section className="pe-section pt-12">
        <h1 className="text-[36px] font-semibold tracking-[-0.025em] mb-1">Legal</h1>
        <p className="text-sm text-text-faint mb-6">Last updated: April 21, 2026</p>
        <Suspense fallback={null}>
          <LegalTabs />
        </Suspense>
      </section>
    </div>
  );
}
