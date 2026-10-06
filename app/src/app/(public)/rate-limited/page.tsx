import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { buildMetadata } from "@/lib/seo/metadata";

export const metadata = buildMetadata({
  pathname: "/rate-limited",
  title: "Too many requests",
  description: "You've hit a rate limit. Please slow down and try again shortly.",
  noindex: true,
});

export default function RateLimitedPage() {
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
            <p className="text-[88px] font-bold tracking-[-0.04em] leading-none text-primary">429</p>
            <h1 className="text-[32px] font-semibold tracking-[-0.025em] mt-3">
              You&apos;re going a little fast
            </h1>
            <p className="text-base text-text-muted mt-3 max-w-[460px] leading-relaxed">
              You&apos;ve hit your rate limit. It&apos;ll reset in a minute, or you can upgrade
              your plan for higher limits.
            </p>
            <div className="flex gap-2 mt-6">
              <Button asChild><Link href="/">Back to home</Link></Button>
              <Button variant="secondary" asChild><Link href="/contact">Contact support</Link></Button>
            </div>
          </div>

          <div className="hidden md:block">
            <svg viewBox="0 0 320 320" className="w-full max-w-[320px] mx-auto">
              <circle cx="160" cy="160" r="140" fill="var(--pe-primary-soft)" />
              <g transform="translate(160 160)">
                <circle r="70" fill="none" stroke="var(--pe-border-strong)" strokeWidth="8" />
                <circle
                  r="70"
                  fill="none"
                  stroke="var(--pe-warning)"
                  strokeWidth="8"
                  strokeDasharray={`${2 * Math.PI * 70 * 0.9} ${2 * Math.PI * 70}`}
                  strokeDashoffset={2 * Math.PI * 70 * 0.25}
                  strokeLinecap="round"
                  transform="rotate(-90)"
                />
                <text textAnchor="middle" y="8" fontSize="22" fontWeight="600" fill="var(--pe-text)">
                  90%
                </text>
              </g>
            </svg>
          </div>
        </div>
      </div>
    </div>
  );
}
