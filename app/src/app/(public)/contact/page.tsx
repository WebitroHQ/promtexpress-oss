import { TopNav } from "@/components/feature/layout/top-nav";
import { ContactForm } from "@/components/feature/contact/contact-form";
import { buildMetadata } from "@/lib/seo/metadata";
import { JsonLd } from "@/components/seo/json-ld";
import { breadcrumbSchema } from "@/lib/seo/schemas";

export const metadata = buildMetadata({
  pathname: "/contact",
  title: "Contact",
  description:
    "Reach the PromtExpress team — sales, support, and partnership inquiries. Typical response time: one business day.",
});

export default function ContactPage() {
  return (
    <div>
      <JsonLd
        data={breadcrumbSchema([
          { name: "Home", url: "/" },
          { name: "Contact", url: "/contact" },
        ])}
      />
      <TopNav />

      <section className="pe-section pt-16">
        <div className="text-center mb-12">
          <p className="text-xs font-semibold uppercase tracking-[0.08em] text-text-faint mb-2">
            Get in touch
          </p>
          <h1 className="text-[48px] font-semibold tracking-[-0.03em]">How can we help?</h1>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[1.4fr_1fr] gap-6 items-start max-w-[1000px] mx-auto">
          {/* Form */}
          <div className="rounded-xl border border-border bg-surface p-7">
            <ContactForm />
          </div>

          {/* Info cards */}
          <div className="flex flex-col gap-3">
            <div className="rounded-xl border border-border bg-surface p-5">
              <p className="text-xs text-text-muted uppercase tracking-[0.06em] font-medium">Email</p>
              <p className="text-[15px] font-medium mt-1.5">
                <a href="mailto:hello@promtexpress.com" className="hover:underline">hello@promtexpress.com</a>
              </p>
              <p className="text-xs text-text-faint mt-1">For everything except enterprise</p>
            </div>
            <div className="rounded-xl border border-border bg-surface p-5">
              <p className="text-xs text-text-muted uppercase tracking-[0.06em] font-medium">Phone</p>
              <p className="text-[15px] font-medium mt-1.5">
                <a href="tel:+905376065228" className="hover:underline">+90 537 606 52 28</a>
              </p>
              <p className="text-xs text-text-faint mt-1">Business hours, Türkiye (UTC+3)</p>
            </div>
            <div className="rounded-xl border border-border bg-surface p-5">
              <p className="text-xs text-text-muted uppercase tracking-[0.06em] font-medium">Registered address</p>
              <p className="text-[15px] font-medium mt-1.5 leading-snug">
                Hakan Güven (Promtexpress)
                <br />
                Korkutreis Mh. Lale Cd. No:17/20
                <br />
                Çankaya / Ankara, Türkiye
              </p>
            </div>
            <div className="rounded-xl border border-border bg-surface p-5">
              <p className="text-xs text-text-muted uppercase tracking-[0.06em] font-medium">Response time</p>
              <p className="text-[15px] font-medium mt-1.5">Within 1 business day</p>
              <p className="text-xs text-text-faint mt-1">Usually faster</p>
            </div>
            <div className="rounded-xl border border-border bg-surface p-5">
              <p className="text-xs text-text-muted uppercase tracking-[0.06em] font-medium">Social</p>
              <div className="flex gap-4 mt-2.5 text-sm">
                <a href="https://x.com/promtexpress" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">Twitter / X</a>
                <a href="https://github.com/WebitroHQ/promtexpress-oss" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">GitHub</a>
                <a href="https://linkedin.com/company/promtexpress" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">LinkedIn</a>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
