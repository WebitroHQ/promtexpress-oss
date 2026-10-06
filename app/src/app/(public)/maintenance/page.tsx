import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { RefreshButton } from "@/components/feature/error/refresh-button";
import { buildMetadata } from "@/lib/seo/metadata";

export const metadata = buildMetadata({
  pathname: "/maintenance",
  title: "We'll be right back",
  description: "PromtExpress is undergoing maintenance.",
  noindex: true,
});

export default function MaintenancePage() {
  return (
    <div className="min-h-screen bg-bg flex flex-col">
      <div className="px-8 py-5">
        <Link href="/" className="flex items-center gap-2 font-semibold w-fit">
          <span className="w-7 h-7 rounded-[7px] bg-primary text-primary-text inline-flex items-center justify-center text-sm font-semibold">p</span>
          PromtExpress
        </Link>
      </div>

      <div className="flex-1 flex items-center justify-center px-8">
        <div className="grid grid-cols-1 md:grid-cols-[1.1fr_1fr] gap-8 md:gap-16 items-center max-w-[960px] w-full">
          <div>
            <p className="text-[72px] font-bold tracking-[-0.04em] leading-none">🔧</p>
            <h1 className="text-[32px] font-semibold tracking-[-0.025em] mt-3">
              We&apos;ll be right back
            </h1>
            <p className="text-base text-text-muted mt-3 max-w-[460px] leading-relaxed">
              We&apos;re applying a quick update — usually under 10 minutes. Thanks for your
              patience.
            </p>
            <div className="flex gap-2 mt-6">
              <RefreshButton />
              <Button variant="secondary" asChild>
                <a href="https://status.promtexpress.com" target="_blank" rel="noopener noreferrer">
                  Status page
                </a>
              </Button>
            </div>
          </div>

          <div className="hidden md:block">
            <svg viewBox="0 0 320 320" className="w-full max-w-[320px] mx-auto">
              <circle cx="160" cy="160" r="140" fill="var(--pe-accent-soft)" />
              <g transform="translate(160 160)" stroke="var(--pe-text)" strokeWidth="3" fill="none">
                <circle r="60" />
                {[0, 60, 120, 180, 240, 300].map((a) => (
                  <line
                    key={a}
                    x1={Math.cos((a * Math.PI) / 180) * 60}
                    y1={Math.sin((a * Math.PI) / 180) * 60}
                    x2={Math.cos((a * Math.PI) / 180) * 78}
                    y2={Math.sin((a * Math.PI) / 180) * 78}
                  />
                ))}
                <circle r="8" fill="var(--pe-text)" stroke="none" />
              </g>
            </svg>
          </div>
        </div>
      </div>
    </div>
  );
}
