import type { Metadata } from "next";
import { Link } from "@/i18n/navigation";
import { getTranslations } from "next-intl/server";
import { Logo } from "@/components/feature/layout/logo";

export const metadata: Metadata = {
  title: "Sign in — PromtExpress",
  robots: { index: false, follow: false, googleBot: { index: false, follow: false } },
};

export default async function AuthLayout({ children }: { children: React.ReactNode }) {
  const t = await getTranslations("auth.layout");
  return (
    <div className="min-h-screen grid grid-cols-2 max-md:grid-cols-1 bg-bg">
      {/* Left: form column */}
      <div className="flex flex-col px-6 py-6 md:px-12 md:py-8">
        <div className="flex items-center justify-between">
          <Logo href="/" size="md" />
        </div>
        <div className="flex-1 flex items-center justify-center">
          <div className="w-full max-w-[380px]">{children}</div>
        </div>
        <div className="flex gap-4 text-xs text-text-faint">
          <Link href="/legal" className="hover:text-text transition-colors">{t("footerTerms")}</Link>
          <Link href="/legal?tab=privacy" className="hover:text-text transition-colors">{t("footerPrivacy")}</Link>
          <span className="ml-auto">{t("footerCopyright")}</span>
        </div>
      </div>

      {/* Right: testimonial panel */}
      <div
        className="relative flex flex-col justify-between p-12 overflow-hidden max-md:hidden"
        style={{ background: "linear-gradient(135deg, var(--pe-primary-soft), var(--pe-accent-soft))" }}
      >
        {/* Orb decorations */}
        <div className="absolute -top-24 -right-24 w-96 h-96 rounded-full bg-primary opacity-[0.08]" />
        <div className="absolute -bottom-28 -left-28 w-80 h-80 rounded-full bg-accent opacity-[0.10]" />

        <div className="relative">
          <p className="text-xs font-medium uppercase tracking-[0.08em] text-primary mb-3">
            {t("joinedBadge")}
          </p>
          <h2 className="text-[32px] font-semibold leading-[1.1] tracking-[-0.025em] max-w-[420px]">
            &ldquo;{t("testimonialQuote")}&rdquo;
          </h2>
          <div className="flex items-center gap-3 mt-6">
            <div className="w-10 h-10 rounded-full bg-surface inline-flex items-center justify-center font-semibold text-sm text-primary">
              MA
            </div>
            <div>
              <p className="font-medium text-sm">{t("testimonialName")}</p>
              <p className="text-xs text-text-muted">{t("testimonialRole")}</p>
            </div>
          </div>
        </div>

        {/* Progress dots */}
        <div className="relative flex gap-2">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="h-1 flex-1 rounded-full"
              style={{ background: i === 1 ? "var(--pe-primary)" : "var(--pe-border)" }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
