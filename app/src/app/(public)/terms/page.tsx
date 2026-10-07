import { TopNav } from "@/components/feature/layout/top-nav";
import { LegalSectionRenderer, TERMS_SECTIONS } from "@/components/feature/legal/legal-content";
import { buildMetadata } from "@/lib/seo/metadata";
import { JsonLd } from "@/components/seo/json-ld";
import { breadcrumbSchema } from "@/lib/seo/schemas";

export const metadata = buildMetadata({
  pathname: "/terms",
  title: "Terms of Service",
  description:
    "Terms of Service for Promtexpress — operated by Hakan Güven (sole trader, Turkey).",
});

const TERMS_BREADCRUMBS = breadcrumbSchema([
  { name: "Home", url: "/" },
  { name: "Legal", url: "/legal" },
  { name: "Terms of Service", url: "/terms" },
]);

export default function TermsPage() {
  return (
    <div>
      <JsonLd data={TERMS_BREADCRUMBS} />
      <TopNav />
      <section className="pe-section pt-12 pb-24">
        <LegalSectionRenderer
          sections={TERMS_SECTIONS}
          title="Terms of Service"
          lastUpdated="October 7, 2026"
        />
      </section>
    </div>
  );
}
