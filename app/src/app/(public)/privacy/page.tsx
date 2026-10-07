import { TopNav } from "@/components/feature/layout/top-nav";
import { LegalSectionRenderer, PRIVACY_SECTIONS } from "@/components/feature/legal/legal-content";
import { buildMetadata } from "@/lib/seo/metadata";
import { JsonLd } from "@/components/seo/json-ld";
import { breadcrumbSchema } from "@/lib/seo/schemas";

export const metadata = buildMetadata({
  pathname: "/privacy",
  title: "Privacy Policy",
  description:
    "Privacy Policy for Promtexpress — KVKK and GDPR-aware processing of personal data.",
});

export default function PrivacyPage() {
  return (
    <div>
      <JsonLd
        data={breadcrumbSchema([
          { name: "Home", url: "/" },
          { name: "Legal", url: "/legal" },
          { name: "Privacy Policy", url: "/privacy" },
        ])}
      />
      <TopNav />
      <section className="pe-section pt-12 pb-24">
        <LegalSectionRenderer
          sections={PRIVACY_SECTIONS}
          title="Privacy Policy"
          lastUpdated="October 7, 2026"
        />
      </section>
    </div>
  );
}
