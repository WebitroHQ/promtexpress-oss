import { TopNav } from "@/components/feature/layout/top-nav";
import { buildMetadata } from "@/lib/seo/metadata";
import { JsonLd } from "@/components/seo/json-ld";
import { breadcrumbSchema } from "@/lib/seo/schemas";

export const metadata = buildMetadata({
  pathname: "/refund",
  title: "Refund Policy",
  description:
    "Refund Policy for Promtexpress — 14-day refund window for first-time subscribers and unused credit packs, processed by Paddle.",
});

const REFUND_BREADCRUMBS = breadcrumbSchema([
  { name: "Home", url: "/" },
  { name: "Legal", url: "/legal" },
  { name: "Refund Policy", url: "/refund" },
]);

const SECTIONS = [
  { id: "overview", label: "Overview" },
  { id: "subscriptions", label: "Subscriptions" },
  { id: "credit-packs", label: "Credit packs" },
  { id: "exceptions", label: "Exceptions" },
  { id: "process", label: "How to request a refund" },
  { id: "processing-time", label: "Processing time" },
  { id: "consumer-rights", label: "Statutory consumer rights" },
  { id: "contact", label: "Contact" },
];

export default function RefundPage() {
  return (
    <div>
      <JsonLd data={REFUND_BREADCRUMBS} />
      <TopNav />
      <section className="pe-section pt-12">
        <h1 className="text-[36px] font-semibold tracking-[-0.025em] mb-1">Refund Policy</h1>
        <p className="text-sm text-text-faint mb-10">Last updated: May 5, 2026</p>

        <div className="grid grid-cols-1 lg:grid-cols-[220px_1fr] gap-12">
          <aside className="hidden lg:block sticky top-24 self-start">
            <p className="text-[11px] font-semibold uppercase tracking-[0.06em] text-text-faint mb-3">
              On this page
            </p>
            <nav>
              {SECTIONS.map((s, i) => (
                <a
                  key={s.id}
                  href={`#${s.id}`}
                  className={`block py-1.5 pl-3 text-sm border-l-2 transition-colors ${
                    i === 0
                      ? "border-primary text-primary"
                      : "border-border text-text-muted hover:text-text"
                  }`}
                >
                  {s.label}
                </a>
              ))}
            </nav>
          </aside>

          <div className="max-w-[720px] text-[15px] leading-[1.75] text-text-muted">
            <div id="overview" className="mb-8">
              <h2 className="text-[22px] font-semibold text-text mb-2.5">Overview</h2>
              <p>
                Promtexpress is committed to customer satisfaction. This Refund Policy describes
                when and how you may request a refund for purchases made on{" "}
                <strong className="text-text">promtexpress.com</strong>. All payments are processed
                by our merchant of record, Paddle.com Market Ltd. Refunds, when granted, are issued
                by Paddle on our behalf to the original payment method.
              </p>
            </div>

            <div id="subscriptions" className="mb-8">
              <h2 className="text-[22px] font-semibold text-text mb-2.5">Subscriptions</h2>
              <p>
                Paid subscription plans (monthly or annual) renew automatically until canceled. You
                may cancel at any time from your account billing page; cancellation stops future
                renewals and your plan remains active until the end of the current billing period.
              </p>
              <p className="mt-3">
                <strong className="text-text">First-time subscribers</strong> may request a full
                refund within <strong className="text-text">14 days</strong> of the initial
                purchase, provided the included monthly credit allowance has not been substantially
                consumed (less than 25% of the credits used). Subsequent renewal payments are
                generally non-refundable, but we review good-faith requests on a case-by-case basis.
              </p>
              <p className="mt-3">
                Annual plans purchased in error may be refunded in full within{" "}
                <strong className="text-text">14 days</strong> of purchase if no significant usage
                has occurred. After 14 days, annual plans are non-refundable, though we may offer
                pro-rated credit toward another plan.
              </p>
            </div>

            <div id="credit-packs" className="mb-8">
              <h2 className="text-[22px] font-semibold text-text mb-2.5">Credit packs</h2>
              <p>
                One-time credit pack purchases (top-ups) are{" "}
                <strong className="text-text">non-refundable once any credit from the pack has been redeemed</strong>.
                If no credits from the pack have been used, you may request a full refund within
                14 days of purchase.
              </p>
              <p className="mt-3">
                Unused credit packs do not expire for 12 months from the date of purchase.
              </p>
            </div>

            <div id="exceptions" className="mb-8">
              <h2 className="text-[22px] font-semibold text-text mb-2.5">Exceptions</h2>
              <p>We will issue a refund regardless of the timeframe in the following cases:</p>
              <ul className="list-disc pl-5 mt-3 space-y-1.5">
                <li>Duplicate or accidental charges due to a billing system error.</li>
                <li>Service unavailability lasting more than 48 consecutive hours during a paid period.</li>
                <li>Material misrepresentation of features at the time of purchase.</li>
                <li>Unauthorized charges resulting from compromised account credentials, after verification.</li>
              </ul>
              <p className="mt-3">
                Refunds will not be issued for: (a) credits already consumed by the user; (b)
                accounts terminated for violations of our Terms of Service or Acceptable Use
                Policy; (c) dissatisfaction with output quality after substantial usage where the
                14-day window has elapsed.
              </p>
            </div>

            <div id="process" className="mb-8">
              <h2 className="text-[22px] font-semibold text-text mb-2.5">How to request a refund</h2>
              <p>To request a refund, please contact our support team:</p>
              <ul className="list-disc pl-5 mt-3 space-y-1.5">
                <li>
                  Email:{" "}
                  <a
                    href="mailto:support@promtexpress.com"
                    className="text-primary hover:underline"
                  >
                    support@promtexpress.com
                  </a>
                </li>
                <li>
                  Include your account email, order ID (visible in your billing history or in the
                  receipt email from Paddle), and the reason for the request.
                </li>
              </ul>
              <p className="mt-3">
                We will review your request and respond within{" "}
                <strong className="text-text">3 business days</strong>.
              </p>
            </div>

            <div id="processing-time" className="mb-8">
              <h2 className="text-[22px] font-semibold text-text mb-2.5">Processing time</h2>
              <p>
                Approved refunds are issued by Paddle to the original payment method. Card refunds
                typically appear within <strong className="text-text">5–10 business days</strong>,
                depending on your bank. PayPal refunds usually settle within 1–3 business days.
                You will receive an email confirmation from Paddle once the refund is processed.
              </p>
            </div>

            <div id="consumer-rights" className="mb-8">
              <h2 className="text-[22px] font-semibold text-text mb-2.5">Statutory consumer rights</h2>
              <p>
                Nothing in this Refund Policy limits any non-waivable statutory rights you may have
                under your local consumer protection laws (including, where applicable, the EU
                Consumer Rights Directive 2011/83/EU 14-day right of withdrawal for digital
                services, the UK Consumer Contracts Regulations 2013, or similar regimes in other
                jurisdictions).
              </p>
              <p className="mt-3">
                For digital services, the right of withdrawal expires once you have begun using the
                service with your express prior consent and acknowledgment that you lose the right
                of withdrawal upon performance. Your continued use of generated prompts after
                purchase constitutes such acknowledgment.
              </p>
            </div>

            <div id="contact" className="mb-8">
              <h2 className="text-[22px] font-semibold text-text mb-2.5">Contact</h2>
              <p>
                Questions about this Refund Policy should be sent to{" "}
                <a
                  href="mailto:support@promtexpress.com"
                  className="text-primary hover:underline"
                >
                  support@promtexpress.com
                </a>
                . For payment-specific inquiries, you may also contact Paddle support directly via
                the receipt email you received at the time of purchase.
              </p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
